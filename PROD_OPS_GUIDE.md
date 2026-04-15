# Production Operations Guide

This guide is intended for administrators and DevOps managing NeuraMemory-AI in its live production environment.

## 🧭 1. General Infrastructure Map
*   **Domain / DNS**: Managed by Vercel (`neura-memory-ai.vercel.app`)
*   **Frontend compute**: Vercel Serverless Edge network.
*   **Backend compute**: Google Compute Engine (`neuramemory-vm` in `us-central1-a`) - IP `34.42.255.155`.
*   **Storage**: Docker Volumes on the VM (Postgres: `postgres_data`, Qdrant: `qdrant_data`) on a 30GB standard persistent disk.

---

## 🖥 2. Backend Operations (Google Cloud VM)

Because the backend relies on stateful Docker containers, most of your operational tasks will occur via SSH on the host VM.

### Connecting to the Production Server
Ensure you have the Google Cloud SDK (`gcloud`) installed and authorized.
```bash
gcloud compute ssh neuramemory-vm --zone=us-central1-a
```

### Viewing Logs & Tracing Errors
All APIs run through the `neuramemory-server` Docker container.
```bash
# View all recent logs
sudo docker logs neuramemory-server

# Tail logs in real-time (Watch mode)
sudo docker logs -f neuramemory-server

# View last 100 lines
sudo docker logs --tail 100 neuramemory-server
```

If you encounter Database issues, check PostgreSQL or Qdrant:
```bash
sudo docker logs neuramemory-postgres
sudo docker logs neuramemory-qdrant
```

### Application Restarts & Rollbacks
If the server hangs or becomes unresponsive:
```bash
# Safely restart the API specific container
sudo docker restart neuramemory-server

# Full cluster reboot
sudo docker compose -f docker-compose.cloud.yml down
sudo docker compose -f docker-compose.cloud.yml up -d
```
*Note: The GitHub Actions CI/CD automatically pulls the newest `main` code and restarts. If a bad commit breaks production, simply `git revert` the PR via the GitHub UI and wait 90 seconds for actions to complete the downgrade.*

### Database Backups (Postgres)
Because Postgres is hosted locally inside the VM, backups are a manual (`pg_dump`) or cron-scheduled process.
```bash
# SSH into VM, dump the database, and save it to the host machine
gcloud compute ssh neuramemory-vm --zone=us-central1-a --command="sudo docker exec neuramemory-postgres pg_dump -U neuramemory neuramemory > backup.sql"

# Download the backup securely to your local machine
gcloud compute scp neuramemory-vm:backup.sql ./local-backup.sql --zone=us-central1-a
```

### Cost & Resource Management (OOM Kills)
The VM has **8GB of RAM** and a **30GB Disk**. 
*   To check if Qdrant/Postgres is running out of disk space: `df -h`
*   To check memory utilization (If containers are randomly dying due to OOM): `htop` or `sudo docker stats`.

If you increase the disk size in Google Cloud Console, remember to run `sudo resize2fs /dev/sda1` inside the VM.

---

## 🌐 3. Frontend Operations (Vercel)

Vercel provides a managed production environment. Ops tasks revolve around the Vercel Dashboard.

### Rollbacks (Instant)
If a bad build affects the frontend UI:
1. Open the Vercel Dashboard -> **NeuraMemory-AI**.
2. Navigate to **Deployments**.
3. Find the last known good deployment, click the three dots (`...`), and select **Promote to Production** (or **Assign Custom Domains**). This rollbacks the frontend instantly.

### API Proxy Troubleshooting (Vercel Rewrites)
The frontend circumvents CORS and Mixed-Content policies by treating Vercel as a proxy (see `client/vercel.json`).
*   **Symptom**: `500 Internal Server Error` on API endpoints from the frontend.
*   **Cause**: The NodeJS Express server rate-limiter is tossing a `ValidationError`, or the backend VM is down.
*   **Fix**: Check Vercel's **Logs** tab. If logs show `PROXY_ERROR`, the GCP VM (`34.42.255.155:3000`) is offline or the GCP Firewall (`allow-http-3000`) was deleted.

### Environment Variable Updates
If you change Qdrant secrets or migrate to a new backend IP address:
1. Update `VITE_API_URL` under the Vercel **Settings -> Environment Variables**.
2. **You MUST trigger a new Vite build.** Go to Deployments -> **Redeploy**. Frontend environment variables are baked into static HTML/JS files at build-time. 

---

## 🔒 4. Security & Access Operations

### Firewall Rules
Port `3000` is open to the public internet via the `allow-http-3000` firewall rule targeting network tagging `http-server`.
*   If you need to close the API to the public, navigate to GCP VPC Network -> Firewall -> disable `allow-http-3000`. This will break the Vercel deployment's proxy access.

### CI/CD Security (WIF)
The Git repository never stores your GCP passwords. It authenticates through **Workload Identity Federation (WIF)** natively.
*   If your deployment GitHub Actions fail with `Error: Failed to authenticate`, verify that the GitHub Provider still exists in Google IAM Workload Identity Pools.
*   If you fork the repository, the WIF configuration **will fail natively** because the token assertion enforces traffic from `NeuraMemoryAI/NeuraMemory-AI` only. To fix this, you must bind the new user's username to the identity pool mapping rule via GCP IAM.

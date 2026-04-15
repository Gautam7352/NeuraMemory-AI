# NeuraMemory-AI Developer Guide

Welcome to the **NeuraMemory-AI** developer guide. This document serves to explain the overall architecture, setup procedures, and CI/CD pipelines so developers can navigate, debug, and scale the application easily.

---

## 🏗 System Architecture

The application is split cleanly between a React Frontend and a Node.js Backend, communicating over REST.

1. **Frontend (Vercel)**
   - **Stack**: React, TypeScript, Vite, TailwindCSS.
   - **Hosting**: Deployed automatically to Vercel upon commits. 
   - **Networking**: `vercel.json` is configured as a reverse proxy. Any API requests made to `/api/v1` are securely forwarded from securely hosted Vercel Edge compute directly to the backend IP. *This avoids all Cross-Origin Resource Sharing (CORS) and Mixed-Content (HTTP vs HTTPS) browser blocks.*

2. **Backend (Google Compute Engine VM)**
   - **Stack**: Node.js, Express, Postgres (Metadata), Qdrant (Vector Embeddings).
   - **Hosting**: A stateful `e2-standard-2` VM running all pieces concurrently in a Docker Compose network (`docker-compose.cloud.yml`).
   - **Automation**: Github Actions CI/CD automatically deploys updates to this VM.

---

## 🚀 Setting Up Locally

If you are developing locally, you don't need to interact with the Cloud DB or Proxies. You can spin up the entire application stack using Docker.

### 1. Environment Variables
Copy the templates for local development defaults:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 2. Starting up
Make sure Docker Desktop is running.
```bash
# Easy command using Make
make dev

# Or manually run Docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### 3. Usage
- **Frontend URL**: `http://localhost:5173`
- **Backend API URL**: `http://localhost:3000`

---

## ☁️ Cloud & CI/CD Deployment

We have a seamless CI/CD pipeline integrated directly into GitHub so you never have to manually FTP, SCP, or tunnel files yourself.

### How it works
Whenever code is pushed or merged into the **`main`** branch, the following happens:
1. **GitHub Actions Trigger**: Reads `.github/workflows/deploy.yml`.
2. **Keyless Authentication**: Actions authenticates with Google Cloud using **Workload Identity Federation (WIF)**. (No leaky secrets or passwords needed!).
3. **Packaging**: The action zips the `server` folder and `docker-compose.cloud.yml`.
4. **Transfer & Rebuild**: It securely SCP transfers it to the VM, and runs a `docker compose rebuild` entirely headlessly over SSH.

### Deploying the Frontend
Vercel's Github integration handles frontend deployments automatically on pushes to `main`. 

### Vercel Environment Variables
If the backend VM IP ever changes, you must NOT hardcode it into the React application's `.env.production`. Instead, rely strictly on relative paths `VITE_API_URL=https://neura-memory-ai.vercel.app` (or just your vercel URL) so that Vercel routes logic cleanly over proxy rewrites. The IP `34.42.255.155` is strictly kept inside `vercel.json`.

---

## 🩺 Debugging & Maintenance

Whenever you need to debug a 500 Error, look closely at the backend logs!

### Fetching Backend Logs (from Cloud)
Because your backend runs in Google Cloud, use the `gcloud CLI` to check your live Docker logs:

```bash
# Log in (one-time)
gcloud auth login 

# Fetch real-time API logs:
gcloud compute ssh neuramemory-vm --zone=us-central1-a --command="sudo docker logs -f neuramemory-server"

# Fetch Postgres logs:
gcloud compute ssh neuramemory-vm --zone=us-central1-a --command="sudo docker logs -f neuramemory-postgres"
```

### CORS & Proxy Troubleshooting
The Express server has been configured to "Trust Proxies" (so rate limiters work natively over Vercel) and relax `Origin` checks. If you configure a *new* domain, ensure `server/.env.cloud` on the VM has `ALLOWED_ORIGINS` accurately updated. 

---

## 📁 Repository Map
- `/client` - All React UI code, components, and Tailwind config.
- `/server` - Backend Node.js code.
  - `/server/src/routes` - API Routing
  - `/server/src/controllers` - Business logic and database access
  - `/server/src/lib` - Initializing clients like Qdrant and Postgres
- `docker-compose.yml` - Local combined execution file
- `docker-compose.cloud.yml` - Cloud execution (no frontend container needed)
- `startup.sh` - One-time provisioning script for the GCP VM.

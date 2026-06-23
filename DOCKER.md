# Docker Deployment Guide

This guide explains how to deploy and run NeuraMemory-AI using Docker and Docker Compose.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Production Deployment](#production-deployment)
- [Development Setup](#development-setup)
- [Environment Configuration](#environment-configuration)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)
- [Service Details](#service-details)

---

## Overview

NeuraMemory-AI uses Docker Compose to orchestrate multiple services:

- **Server**: Node.js/TypeScript backend API
- **Client**: React/Vite frontend application
- **PostgreSQL**: Relational database for user data
- **Qdrant**: Vector database for semantic search

The project provides two Docker Compose configurations:

1. **`docker-compose.yml`** - Base configuration for production
2. **`docker-compose.dev.yml`** - Development overrides with hot-reload

---

## Prerequisites

### Required Software

- **Docker**: ≥20.10.0
- **Docker Compose**: ≥2.0.0 (included with Docker Desktop)

### Verify Installation

```bash
docker --version
docker compose version
```

### System Requirements

- **RAM**: Minimum 4GB available
- **Disk**: ~2GB for images and volumes
- **Ports**: 3000, 5173, 6333, 6334, 5432 must be available

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                       │
│                (neuramemory-network)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌────────┐ │
│  │  Client  │  │  Server  │  │ PostgreSQL │  │ Qdrant │ │
│  │  :5173   │→ │  :3000   │→ │   :5432    │  │ :6333  │ │
│  └──────────┘  └──────────┘  └────────────┘  └────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
         ↓              ↓             ↓            ↓
    Port 5173      Port 3000     Port 5432    Port 6333
```

---

## Quick Start

### Production (Default)

```bash
# 1. Clone the repository
git clone https://github.com/Gautam7352/NeuraMemory-AI.git
cd NeuraMemory-AI

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your settings

# 3. Start all services
docker compose up -d

# 4. Check status
docker compose ps

# 5. View logs
docker compose logs -f
```

Access the application:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Qdrant**: http://localhost:6333

### Development

```bash
# Start with development overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use the shorthand (if configured)
docker compose --profile dev up
```

---

## Production Deployment

### Step 1: Prepare Environment

Create and configure the environment file:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
# Required - Generate a strong secret (min 32 characters)
JWT_SECRET=your-production-secret-at-least-32-chars-long

# Required - OpenRouter API key
OPENROUTER_API_KEY=sk-or-v1-your-actual-key

# Optional - Customize as needed
PORT=3000
NODE_ENV=production
JWT_EXPIRES_IN=7d

# PostgreSQL - Use container name (DNS resolution)
DATABASE_URL=postgresql://neuramemory:neuramemory@postgres:5432/neuramemory

# Qdrant - Use container name
QDRANT_URL=http://qdrant:6333

# OpenRouter Configuration
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_REFERER=https://yourdomain.com
OPENROUTER_TITLE=NeuraMemory-AI
```

### Step 2: Build and Start

```bash
# Build images (includes TypeScript compilation)
docker compose build

# Start all services in detached mode
docker compose up -d

# Verify all services are healthy
docker compose ps
```

Expected output:
```
NAME                    STATUS         PORTS
neuramemory-client      Up 2 minutes   0.0.0.0:5173->5173/tcp
neuramemory-postgres    Up 2 minutes   0.0.0.0:5432->5432/tcp
neuramemory-qdrant      Up 2 minutes   0.0.0.0:6333-6334->6333-6334/tcp
neuramemory-server      Up 2 minutes   0.0.0.0:3000->3000/tcp
```

### Step 3: Verify Deployment

```bash
# Check server health
curl http://localhost:3000/api/v1/login

# Check PostgreSQL
docker exec neuramemory-postgres pg_isready -U neuramemory

# Check Qdrant
curl http://localhost:6333/health
```

### Step 4: View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f server

# Last 100 lines
docker compose logs --tail=100 server
```

---

## Development Setup

Development mode provides:
- **Hot Reload**: Auto-restart on file changes
- **Source Maps**: Better debugging
- **Debug Port**: Node.js inspector on port 9229
- **Volume Mounts**: Live code updates without rebuilds

### Start Development Environment

```bash
# Option 1: Explicit compose files
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Option 2: Create alias (add to ~/.bashrc or ~/.zshrc)
alias dc-dev='docker compose -f docker-compose.yml -f docker-compose.dev.yml'
dc-dev up
```

### Development Workflow

**1. Make code changes** - Edit files in `server/src/` or `client/src/`

**2. See changes instantly**:
- **Server**: `tsx watch` auto-reloads on save
- **Client**: Vite HMR updates browser

**3. Debug server**:
```bash
# Attach debugger to port 9229
chrome://inspect (Chrome DevTools)
```

**4. View real-time logs**:
```bash
docker compose logs -f server
```

### Development vs Production

| Feature | Production | Development |
|---------|-----------|-------------|
| **Command** | `node dist/index.js` | `npm run dev` (tsx watch) |
| **Build** | Multi-stage optimized | Builder stage with dev deps |
| **Restart** | `unless-stopped` | `no` (manual restart) |
| **Volumes** | None (code in image) | Mounted source files |
| **Debug** | No | Port 9229 exposed |
| **Hot Reload** | No | Yes |

---

## Environment Configuration

### Server Environment Variables

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://neuramemory:neuramemory@postgres:5432/neuramemory` |
| `QDRANT_URL` | Qdrant server URL | `http://qdrant:6333` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `JWT_SECRET` | JWT signing secret (≥32 chars) | `random-string-32-chars-min` |

#### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `QDRANT_API_KEY` | Qdrant API key (if secured) | - |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL | `https://openrouter.ai/api/v1` |

### Container-to-Container Communication

**❌ Don't use `localhost`** in environment variables:

```env
# BAD - Won't work inside containers
DATABASE_URL=postgresql://neuramemory:neuramemory@localhost:5432/neuramemory
```

**✅ Use service names** (Docker DNS):

```env
# GOOD - Docker resolves service names
DATABASE_URL=postgresql://neuramemory:neuramemory@postgres:5432/neuramemory
QDRANT_URL=http://qdrant:6333
```

### Host Access

**From your machine** → Use `localhost`:

```bash
curl http://localhost:3000/api/v1/login
psql postgresql://neuramemory:neuramemory@localhost:5432/neuramemory
```

**From inside containers** → Use service names:

```javascript
// Inside server container — uses pg Pool from DATABASE_URL
import { getPool } from './lib/postgres.js';
```

---

## Common Commands

### Starting Services

```bash
# Start all (detached)
docker compose up -d

# Start specific service
docker compose up -d postgres

# Start with logs
docker compose up

# Development mode
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Stopping Services

```bash
# Stop all services
docker compose stop

# Stop specific service
docker compose stop server

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes (⚠️ deletes data)
docker compose down -v
```

### Rebuilding

```bash
# Rebuild all images
docker compose build

# Rebuild specific service
docker compose build server

# Rebuild without cache
docker compose build --no-cache

# Rebuild and start
docker compose up -d --build
```

### Viewing Logs

```bash
# All services
docker compose logs

# Follow logs (live)
docker compose logs -f

# Specific service
docker compose logs server

# Last N lines
docker compose logs --tail=50 server

# Since timestamp
docker compose logs --since 2024-01-01T10:00:00
```

### Executing Commands

```bash
# Shell in server container
docker compose exec server sh

# Run npm command
docker compose exec server npm run build

# PostgreSQL shell
docker compose exec postgres psql -U neuramemory

# Check Node.js version
docker compose exec server node --version
```

### Inspecting Services

```bash
# List running containers
docker compose ps

# Show resource usage
docker stats

# Inspect service config
docker compose config

# Show volumes
docker volume ls

# Show networks
docker network ls
```

### Data Management

```bash
# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U neuramemory neuramemory > backup.sql

# Restore PostgreSQL
docker compose exec -T postgres psql -U neuramemory neuramemory < backup.sql

# List volumes
docker volume ls

# Inspect volume
docker volume inspect neuramemory-ai_postgres_data

# Backup volume (example)
docker run --rm -v neuramemory-ai_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .
```

---

## Troubleshooting

### Services Won't Start

**Check port conflicts:**

```bash
# Check what's using port 3000
lsof -i :3000

# Or on Linux
netstat -tulpn | grep 3000

# Kill the process
kill -9 <PID>
```

**Check Docker daemon:**

```bash
# Restart Docker
sudo systemctl restart docker  # Linux
# Or restart Docker Desktop
```

### Server Crashes on Startup

**Check environment variables:**

```bash
# View server logs
docker compose logs server

# Common error: Missing JWT_SECRET
# Error: JWT_SECRET must be at least 32 characters
```

**Fix:** Edit `server/.env` and add valid `JWT_SECRET`.

**Check PostgreSQL connection:**

```bash
# Test PostgreSQL
docker compose exec postgres pg_isready -U neuramemory

# Should return: accepting connections
```

### Build Failures

**TypeScript compilation errors:**

```bash
# View build output
docker compose build server

# If errors persist, rebuild without cache
docker compose build --no-cache server
```

**npm install failures:**

```bash
# Clear Docker cache
docker builder prune

# Rebuild
docker compose build --no-cache
```

### Database Connection Issues

**PostgreSQL won't connect:**

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Verify connection string in .env
grep DATABASE_URL server/.env
# Should be: postgresql://neuramemory:neuramemory@postgres:5432/neuramemory (not localhost!)
```

**Qdrant won't connect:**

```bash
# Check Qdrant health
curl http://localhost:6333/health

# Check logs
docker compose logs qdrant
```

### Volume Permission Issues

```bash
# Fix permissions (Linux/Mac)
sudo chown -R $USER:$USER server/ client/

# Or run container as current user
docker compose run --user $(id -u):$(id -g) server sh
```

### Hot Reload Not Working

**Development mode:**

```bash
# Ensure using dev compose file
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Check volumes are mounted
docker compose -f docker-compose.yml -f docker-compose.dev.yml config | grep volumes
```

### Reset Everything

**⚠️ Warning: Deletes all data**

```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Remove images
docker compose down --rmi all

# Clean up Docker system
docker system prune -a --volumes

# Restart fresh
docker compose up -d --build
```

---

## Service Details

### Server (Backend API)

**Image Build**: Multi-stage Dockerfile

**Stages**:
1. **Builder**: Installs all deps, compiles TypeScript
2. **Runner**: Production image with only runtime deps

**Exposed Ports**:
- `3000` - HTTP API
- `9229` - Node.js debugger (dev only)

**Health Check**: None (TODO)

**Dependencies**: PostgreSQL, Qdrant

### Client (Frontend)

**Image Build**: Vite production build

**Exposed Ports**:
- `5173` - Vite dev server / static server

**Environment**:
- `VITE_API_URL` - Backend API URL

**Dependencies**: Server

### PostgreSQL

**Image**: `postgres:16-alpine`

**Exposed Ports**:
- `5432` - PostgreSQL protocol

**Data Persistence**: 
- Volume: `postgres_data` → `/var/lib/postgresql/data`

**Health Check**:
```bash
pg_isready -U neuramemory
```

**Default Database**: `neuramemory`

### Qdrant

**Image**: `qdrant/qdrant:latest`

**Exposed Ports**:
- `6333` - REST API
- `6334` - gRPC API

**Data Persistence**:
- Volume: `qdrant_data` → `/qdrant/storage`

**Health Check**:
```bash
curl http://localhost:6333/health
```

---

## Production Best Practices

### Security

1. **Use secrets management**:
   ```bash
   # Don't commit .env files
   echo "server/.env" >> .gitignore
   ```

2. **Generate strong JWT secret**:
   ```bash
   openssl rand -base64 48
   ```

3. **Use environment-specific configs**:
   ```bash
   # Separate .env files
   server/.env.production
   server/.env.staging
   ```

4. **Enable HTTPS** (use reverse proxy like NGINX or Traefik)

### Monitoring

```bash
# Resource usage
docker stats

# Container health
docker compose ps

# Log aggregation
docker compose logs -f | tee application.log
```

### Backups

**Database backups**:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U neuramemory neuramemory > "backups/postgres_${DATE}.sql"
```

**Volume backups**:

```bash
docker run --rm -v neuramemory-ai_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_${DATE}.tar.gz -C /data .
```

### Scaling

Docker Compose supports scaling (same service, multiple containers):

```bash
# Scale server to 3 instances
docker compose up -d --scale server=3
```

**Note**: Requires load balancer configuration.

---

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Qdrant Documentation](https://qdrant.tech/documentation/)

---

## Support

For issues with Docker deployment:

1. Check [Troubleshooting](#troubleshooting) section
2. Review logs: `docker compose logs`
3. Open an issue: [GitHub Issues](https://github.com/Gautam7352/NeuraMemory-AI/issues)
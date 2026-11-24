# Docker Local Development Guide

This guide provides instructions and reference commands for running the **Orbion Agents** full-stack platform locally using `docker-compose.local.yml`.

> [!IMPORTANT]
> **Production vs. Local Configuration:**
> - `docker-compose.yml` is strictly reserved for the **Production Live Server** and should not be modified.
> - `docker-compose.local.yml` is configured specifically for **Local Development**, enabling source code volume mounting and hot-reloading for both backend and frontend.

---

## 1. Prerequisites

Before running the containers, ensure:
1. **Docker Desktop** is installed and running (with WSL 2 enabled on Windows).
2. The environment configuration files exist:
   - `./backend/.env`
   - `./frontend/.env` (or default environment variables)

---

## 2. Service Architecture & Port Mapping

| Service | Container Name | Host Port | Internal Port | URL / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `auromind_frontend` | `3000` | `3000` | [http://localhost:3000](http://localhost:3000) (Next.js Dev Server) |
| **Backend API** | `auromind_backend` | `8000` | `8000` | [http://localhost:8000](http://localhost:8000) ([Swagger Docs](http://localhost:8000/docs)) |
| **PostgreSQL (pgvector)** | `auromind_postgres` | `5435` | `5432` | `localhost:5435` (User: `postgres`, DB: `auromindai`) |
| **Redis** | `auromind_redis` | `6379` | `6379` | `localhost:6379` (In-Memory Cache & Message Broker) |
| **Celery Worker** | `auromind_celery_worker` | — | — | Background task processing engine |
| **Celery Beat** | `auromind_celery_beat` | — | — | Periodic cron schedule coordinator |

---

## 3. First-Time Setup & Clean Start

If you have legacy containers or previous compose stacks running, clean them up first to prevent port and volume conflicts:

### Step 1: Remove Existing / Orphaned Containers
```bash
# Stop and remove containers from any existing compose project
docker compose down --remove-orphans
docker compose -f docker-compose.local.yml down --remove-orphans

# Force remove any lingering project containers (PowerShell)
docker rm -f auromind_backend auromind_frontend auromind_postgres auromind_redis auromind_celery_worker auromind_celery_beat auromind_backend_prod auromind_frontend_prod auromind_postgres_prod auromind_redis_prod auromind_celery_worker_prod auromind_celery_beat_prod 2>$null
```

> **For Linux / macOS / Bash users:**
> ```bash
> docker rm -f auromind_backend auromind_frontend auromind_postgres auromind_redis auromind_celery_worker auromind_celery_beat auromind_backend_prod auromind_frontend_prod auromind_postgres_prod auromind_redis_prod auromind_celery_worker_prod auromind_celery_beat_prod 2>/dev/null || true
> ```

### Step 2: Build and Start All Services
Run this single command to build the images and launch all services in detached mode:
```bash
docker compose -f docker-compose.local.yml up -d --build
```

---

## 4. Daily Development Commands

### Check Container Status
```bash
docker compose -f docker-compose.local.yml ps
```

### View Live Logs
```bash
# Stream logs for all services
docker compose -f docker-compose.local.yml logs -f

# Stream logs for a specific service
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend
docker compose -f docker-compose.local.yml logs -f celery_worker
docker compose -f docker-compose.local.yml logs -f db
```

### Stop Services
```bash
docker compose -f docker-compose.local.yml down
```

---

## 5. Restart Strategies

### A. Quick Restart
Restarts existing running containers without rebuilding images:
```bash
docker compose -f docker-compose.local.yml restart
```

### B. Full Clean Restart
Brings down the stack and brings it back up:
```bash
docker compose -f docker-compose.local.yml down && docker compose -f docker-compose.local.yml up -d
```

### C. Restart with Rebuild
Use this when you updated `Dockerfile`, `package.json`, or `requirements.txt`:
```bash
docker compose -f docker-compose.local.yml down && docker compose -f docker-compose.local.yml up -d --build
```

### D. Restart an Individual Service
Target a specific service without restarting the entire stack:
```bash
# Restart Backend API
docker compose -f docker-compose.local.yml restart backend

# Restart Frontend
docker compose -f docker-compose.local.yml restart frontend

# Restart Celery Worker
docker compose -f docker-compose.local.yml restart celery_worker

# Restart Database
docker compose -f docker-compose.local.yml restart db
```

---

## 6. Database Migrations & Container Shell Access

### Execute Database Migrations Manually
```bash
docker exec -it auromind_backend alembic upgrade head
```

### Access Container Shell
```bash
# Access Backend shell
docker exec -it auromind_backend /bin/bash

# Access Frontend shell
docker exec -it auromind_frontend /bin/sh

# Access PostgreSQL CLI
docker exec -it auromind_postgres psql -U postgres -d auromindai
```

---

## 7. Complete Environment Reset (Data Wipe)

If you need a fresh start and want to wipe all local PostgreSQL database records and volumes:
```bash
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up -d --build
```
> [!CAUTION]
> The `-v` flag removes the `postgres_data` volume permanently. Only use this if you want to reset the database.

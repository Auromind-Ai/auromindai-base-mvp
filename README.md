# Auromind

**AI-Powered Business Assistant Platform**

Auromind helps businesses automate sales follow-ups, optimize marketing, and organize their workflow using advanced, governed AI agents.

## Team
- **Santhosh**: Head of Product

## Engineering Guide

This repository contains the source code for the Auromind MVP.

### Architecture
- **Backend:** FastAPI (Python)
- **Frontend:** Next.js (React)
- **Database:** PostgreSQL
- **Infrastructure:** Docker Compose

### Developer Setup

**1. Prerequisites**
- Docker & Docker Compose
- Python 3.11+

**2. Running Locally**
```bash
docker-compose up
```
The API will be available at `http://localhost:8000`.
The Documentation (Swagger) is at `http://localhost:8000/docs`.

### Project Structure
- `backend/app/models`: Database Models (SQLAlchemy)
- `backend/app/routers`: API Endpoints
- `backend/app/schemas`: Pydantic Data Schemas

### Current Tasks
Please check the task assignment document provided by the Head of Product.

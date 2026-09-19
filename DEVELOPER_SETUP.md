# Developer Quickstart Guide 🛠️

For the comprehensive architecture guide, API cookbooks, and system documentation, please refer to [README.md](./README.md).

---

## 1. Quick Start with Docker (Recommended)
Run the entire stack (PostgreSQL with `pgvector`, Redis, FastAPI backend, Celery workers, and Next.js frontend):
```bash
# 1. Copy environment configurations
cp backend/.env.example backend/.env
cp frontend/.env frontend/.env.local

# 2. Start all services
docker-compose up --build
```
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 2. Native Local Setup

### Backend (FastAPI + Celery)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run migrations
alembic upgrade head

# Start API Server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Celery Background Workers (Separate Terminals)
```bash
# Worker
celery -A app.core.celery_app worker --loglevel=info -Q default,beat

# Beat Scheduler
celery -A app.core.celery_app beat --loglevel=info
```

### Frontend (Next.js 15)
```bash
cd frontend
npm install
npm run dev
```

---

## 3. How to Submit Code 📝
**Do NOT push directly to `main`.**

1. **Create your feature branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```
2. **Make Changes & Run Tests**:
   ```bash
   cd backend && pytest tests/ -v
   cd ../frontend && npm run lint
   ```
3. **Commit & Push**:
   ```bash
   git add .
   git commit -m "feat(module): add description of your feature"
   git push origin feature/your-feature-name
   ```
4. **Open a Pull Request** on GitHub for team code review.

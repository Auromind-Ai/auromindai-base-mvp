# 🚀 Developer Setup Guide

## 1. Cloud Database Connection (IMPORTANT)
We have moved to a shared **Cloud PostgreSQL Database** so the entire team sees the same data.

### Action Required:
1.  Create or open your `backend/.env` file.
2.  Add/Update the `DATABASE_URL` with this connection string:

```bash
DATABASE_URL=postgres://54674d3e1d0e411ba46e33e704bf13ed74fab9e911c34e6b1c569e07097bc3b8:sk_pPZlQuZROizt_ZNqg2p0Y@db.prisma.io:5432/postgres?sslmode=require
```

**Note:** This allows you to work immediately without installing PostgreSQL locally.

## 2. Python Dependencies
We added `psycopg2-binary` and `pgvector` for the new database.
Run this inside `backend/`:

```bash
pip install -r requirements.txt
```

## 3. Run the Server
```bash
uvicorn app.main:app --reload --port 8000
```

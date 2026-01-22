---
description: Repository Information Overview
alwaysApply: true
---

# Auromind - AI-Powered Business Assistant Platform

## Repository Summary

Auromind is a production-grade SaaS MVP providing AI assistance for sales follow-ups, marketing automation, founder productivity, unified inbox management (WhatsApp, Instagram, website chat), and RAG-based knowledge base. Built with a strong emphasis on AI governance through Model Context Protocol (MCP) where every AI action is evaluated and can be escalated for human approval.

## Repository Structure

- **frontend/**: Next.js 16 application with React 19, Tailwind CSS, and Radix UI components
- **backend/**: FastAPI application with SQLAlchemy ORM, JWT authentication, and MCP governance layer
- **docker-compose.yml**: Development environment orchestration with PostgreSQL, backend, and frontend services
- **alembic/**: Database migration framework (configured but migrations not yet set up)

### Main Components

- **Authentication**: JWT-based user authentication with password hashing
- **MCP Governance Layer**: Evaluates AI actions (ALLOW, ESCALATE, BLOCK)
- **Database Models**: User, Workspace, Conversation, Message, Follow-up, Promise, Brain, AIAction, LearningEvent
- **Services**: Authentication, MCP governance, orchestration
- **Routers**: Auth, Inbox, Learning, MCP simulation
- **Frontend Pages**: Public landing, login, signup, admin dashboard, inbox, follow-ups, marketing, promises, brain, AI control

## Language & Runtime

**Frontend:**
- **Language**: JavaScript (Node.js)
- **Version**: Node.js 20+
- **Framework**: Next.js 16.1.1
- **React**: 19.2.3
- **Build System**: Next.js build system
- **Package Manager**: npm

**Backend:**
- **Language**: Python
- **Version**: 3.11+
- **Framework**: FastAPI 0.115.5
- **Server**: Uvicorn 0.32.1
- **Build System**: None (interpreted)
- **Package Manager**: pip

## Dependencies

### Frontend Main Dependencies
- **UI Framework**: Next.js 16.1.1, React 19.2.3, React DOM 19.2.3
- **UI Components**: Radix UI (avatar, dialog, dropdown, scroll area, separator, tabs)
- **Styling**: Tailwind CSS 4.1.18, PostCSS 8.5.6, Autoprefixer
- **Utilities**: clsx, class-variance-authority, tailwind-merge
- **Icons**: Lucide React 0.562.0, Heroicons 2.2.0
- **Charts**: Recharts 3.6.0
- **Animation**: Framer Motion 12.24.0

### Backend Main Dependencies
- **Web Framework**: FastAPI 0.115.5, Uvicorn with standard extras
- **Database**: SQLAlchemy 2.0.36, Alembic 1.14.0, psycopg2-binary 2.9.10, pgvector 0.3.6
- **Authentication**: python-jose with cryptography, passlib with bcrypt
- **Validation**: Pydantic 2.10.3, pydantic-settings 2.6.1, email-validator 2.2.0
- **AI/ML**: OpenAI 1.57.2, sentence-transformers 3.3.1, google-generativeai 0.3.2
- **File Processing**: PyPDF2 3.0.1
- **HTTP Client**: httpx 0.28.1
- **Configuration**: python-dotenv 1.0.1, python-multipart 0.0.20

## Build & Installation

**Docker (Recommended):**
```bash
docker-compose up
```
Starts PostgreSQL, Backend (http://localhost:8000), Frontend (http://localhost:3000)

**Backend Local Development:**
```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend Local Development:**
```bash
cd frontend
npm install
npm run dev
```

## Docker Configuration

**Backend Dockerfile:**
- Base Image: python:3.11-slim
- Dependencies: gcc, postgresql-client
- Port: 8000
- Command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

**Frontend Dockerfile:**
- Base Image: node:20-alpine
- Port: 3000
- Command: npm run dev

**Docker Compose Services:**
- **postgres**: PostgreSQL 16-alpine on port 5433, health check enabled
- **backend**: FastAPI service depending on postgres (healthy)
- **frontend**: Next.js service depending on backend

**Environment Variables (Docker Compose):**
- DATABASE_URL: postgresql://auromind:auromind@postgres:5432/auromind
- SECRET_KEY: dev-secret-key-change-in-production
- OPENAI_API_KEY: (environment variable)
- NEXT_PUBLIC_API_URL: http://localhost:8000

## Main Files & Resources

**Backend Entry Point:** `backend/app/main.py` (FastAPI application initialization)

**Frontend Entry Point:** `frontend/src/app/page.js` (Public landing page)

**Configuration Files:**
- `backend/.env.example` - Backend environment template
- `frontend/.env.local` - Frontend environment (NEXT_PUBLIC_API_URL)
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node.js dependencies
- `frontend/next.config.mjs` - Next.js configuration
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/components.json` - UI components metadata

**Database Models:** `backend/app/models/` (user, workspace, conversation, message, followup, promise, brain, ai_action, learning_event)

**API Routers:** `backend/app/routers/` (auth, inbox, learning, mcp, simulation)

**Services:** `backend/app/services/` (authentication, MCP governance, orchestration)

## Testing & Validation

**Testing Status:**
- Frontend: No test configuration found (ESLint available for linting)
- Backend: Minimal test files (test_gemini.py for model verification, verify_governance.py for governance logic)

**Code Quality:**
- **Frontend**: ESLint 9 configured (`npm run lint`)
- **Backend**: No formal test framework configured (pytest not in requirements)

**Scripts:**
- `npm run dev` - Frontend development server
- `npm run build` - Frontend production build
- `npm run start` - Frontend production server
- `npm run lint` - Frontend code linting
- `uvicorn app.main:app --reload` - Backend development server

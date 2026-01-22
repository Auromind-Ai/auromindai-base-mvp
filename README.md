# Auromind - AI-Powered Business Assistant Platform

A production-grade SaaS MVP that provides AI assistance for:
- Sales follow-ups (automated, governed by MCP)
- Marketing automation (AI suggestions with human approval)
- Founder productivity (promise tracking)
- Unified inbox (WhatsApp, Instagram, Website chat)
- Knowledge base (RAG/Brain)

## Architecture

- **Frontend**: Next.js 14 (App Router)
- **Backend**: FastAPI
- **Database**: PostgreSQL
- **AI Layer**: MCP (Model Context Protocol) governance + RAG
- **Deployment**: Docker Compose

## Key Principles

1. **Not an AI wrapper** - Every AI action goes through MCP governance
2. **Human-in-the-loop** - Sensitive actions require approval
3. **Explainable** - All AI decisions are logged and auditable
4. **Controllable** - Clear rules and boundaries for AI behavior

## Project Structure

```
auromind/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── docker-compose.yml # Development environment
└── README.md
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Run with Docker

```bash
# Start all services
docker-compose up

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Routing

- `/` - Public landing page (marketing)
- `/login` - Login page
- `/signup` - Signup page
- `/user/admin/*` - Authenticated admin panel (main product)
  - `/user/admin/dashboard` - Main dashboard
  - `/user/admin/inbox` - Unified inbox
  - `/user/admin/followups` - Follow-up manager
  - `/user/admin/marketing` - Marketing bot
  - `/user/admin/promises` - Founder assistant
  - `/user/admin/brain` - Knowledge base (RAG)
  - `/user/admin/ai-control` - MCP dashboard

## Features

### 1. MCP (Model Context Protocol)
Governance layer that evaluates every AI action:
- **ALLOW**: Execute automatically
- **ESCALATE**: Require human approval
- **BLOCK**: Reject and log

### 2. Unified Inbox
Single inbox for all customer conversations:
- WhatsApp (mock integration)
- Instagram (mock integration)
- Website chat
- AI vs Human labels
- Human takeover

### 3. Follow-Up Manager
AI-powered sales follow-ups:
- Rule-based automation
- MCP governance
- Auto-stop on customer reply
- Audit logging

### 4. Marketing Bot
AI-assisted marketing optimization:
- Mock Meta/Google Ads integration
- Spend tracking
- AI suggestions (human-approved)
- SEO insights (mock)

### 5. Founder Assistant
Promise tracking and reminders:
- Manual promise creation
- AI extraction from text
- Daily reminders
- Resolution tracking

### 6. Brain (RAG)
Knowledge base for AI responses:
- Text and PDF upload
- Vector embeddings
- Similarity search
- Version control

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://auromind:auromind@localhost:5432/auromind
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-api-key
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Database Setup

The Docker Compose setup automatically creates the PostgreSQL database. For local development:

```bash
# Create database
createdb auromind

# Run migrations (TODO: setup Alembic)
# alembic upgrade head
```

## Development Status

- [x] Project structure
- [x] Database models
- [x] Authentication (JWT)
- [x] MCP governance layer
- [ ] Inbox service
- [ ] Follow-up service
- [ ] Marketing service
- [ ] Promise service
- [ ] Brain/RAG service
- [ ] Frontend pages
- [ ] UI component library

## License

Proprietary - All rights reserved

## Support

For questions and support, contact: support@auromind.ai

# Auromind AI (Orbionagents) 🚀
> **Enterprise AI-Powered Business Operations & Governed Omnichannel Automation Platform**

Auromind AI is a production-grade, multi-tenant SaaS platform that empowers businesses to automate customer acquisition, sales follow-ups, and customer support workflows using governed AI agents. It connects multi-channel communication pipelines (WhatsApp, Instagram, Twilio SMS, Gmail) with an Agentic RAG knowledge engine, visual workflow automation, real-time lead scoring, token metering, and strict policy governance (MCP layer).

## 👥 Team
- **Santhosh**: Head of Product

---

## 📑 Table of Contents
1. [Technical Overview (By Role)](#-technical-overview-by-role)
2. [System Architecture](#-system-architecture)
3. [Technology Stack](#-technology-stack)
4. [Project Directory Map](#-project-directory-map)
5. [Core Subsystems & Feature Breakdown](#-core-subsystems--feature-breakdown)
   - [Multi-Tenancy & RBAC](#1-multi-tenancy--rbac)
   - [Agentic RAG & Knowledge Base ("The Brain")](#2-agentic-rag--knowledge-base-the-brain)
   - [MCP Governance & Safeguard Layer](#3-mcp-governance--safeguard-layer)
   - [Omnichannel Messaging Pipeline](#4-omnichannel-messaging-pipeline)
   - [Visual Automation & Flow Engine](#5-visual-automation--flow-engine)
   - [Lead Scoring Engine](#6-lead-scoring-engine)
   - [Billing, Credits & Token Metering](#7-billing-credits--token-metering)
   - [Admin Portals (Tenant Admin vs Super Admin)](#8-admin-portals-tenant-admin-vs-super-admin)
6. [Getting Started (Local Development Setup)](#-getting-started-local-development-setup)
   - [Prerequisites](#prerequisites)
   - [Option A: Docker Compose Setup (Recommended)](#option-a-docker-compose-setup-recommended)
   - [Option B: Native Local Development](#option-b-native-local-development)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [Feature Developer Cookbooks](#-feature-developer-cookbooks)
   - [Recipe 1: Add a New Database Model & Migration](#recipe-1-add-a-new-database-model--migration)
   - [Recipe 2: Add a New Backend Router / API Endpoint](#recipe-2-add-a-new-backend-router--api-endpoint)
   - [Recipe 3: Add a New Frontend Page & Connect API](#recipe-3-add-a-new-frontend-page--connect-api)
   - [Recipe 4: Add an AI Tool or Agent Action](#recipe-4-add-an-ai-tool-or-agent-action)
   - [Recipe 5: Add an Asynchronous Celery Worker Task](#recipe-5-add-an-asynchronous-celery-worker-task)
9. [Testing, QA & Security Pipeline](#-testing-qa--security-pipeline)
10. [Git Workflow & PR Guidelines](#-git-workflow--pr-guidelines)

---

## 🛠 Technical Overview (By Role)

### 🤖 For AI Engineers
Auromind is **not just a wrapper**. We use a **Governed AI Architecture**:
- **MCP (Model Context Protocol):** A custom governance layer that evaluates every AI action (`Allow` / `Block` / `Escalate`) before execution.
- **RAG (Retrieval-Augmented Generation):** "The Brain" ingests documents (PDF, DOCX, TXT, CSV) and scrapes dynamic websites via Playwright/Scrapy to ground AI responses in verified business data.
- **Embeddings & Vector Search:** Hugging Face Sentence-Transformers (`all-MiniLM-L6-v2`) combined with PostgreSQL `pgvector` for cosine similarity retrieval and cross-encoder re-ranking.
- **Orchestrator & LLM Router:** Dynamically routes prompts across OpenAI GPT-4o, Google Gemini 1.5/2.0, Groq LLaMA-3, and Anthropic Claude, managing conversation state, token limits, and multi-step reasoning.

### ⚙️ For Backend Developers
The core logic resides in a high-performance **FastAPI** application:
- **Language & Runtime:** Python 3.11+
- **Database & Search:** PostgreSQL 16 (with `pgvector` extension for vector embeddings).
- **ORM & Schema Migrations:** SQLAlchemy 2.0 (Async/Sync) with Alembic migration versioning.
- **Data Validation:** Pydantic V2 schemas guaranteeing strict request/response data contracts.
- **Task Queue & Distributed Jobs:** Celery 5.3.6 (prefork worker + beat scheduler) with Redis 7.
- **Key Services:** Omnichannel Inbox Manager (Meta WhatsApp Cloud API, Twilio, Instagram, Gmail), JWT Auth + TOTP 2FA, Automation Flow Engine, Lead Scoring Engine, and Razorpay Billing.

### 💻 For Frontend Developers
The interface is a modern **Next.js 15** application:
- **Framework:** Next.js 15 (App Router).
- **Styling & Motion:** Tailwind CSS v4 + Framer Motion (for fluid, responsive interactions).
- **Interactive UI & 3D:** Three.js / React Three Fiber for 3D login canvas, Lucide Icons, Radix UI primitives, and Recharts.
- **State Management:** React Context + Custom Hooks (`AuthContext`, `WorkspaceContext`).
- **API Integration:** REST API consumption via `frontend/src/lib/api.js` client with automated CSRF token handling, JWT token refresh, and white-label error sanitization through Next.js reverse proxy rewrites (`/api/*` -> `BACKEND_URL`).

### 🎨 For UI/UX Designers
Our design philosophy is **"Calm SaaS"**:
- **Visuals:** Dark mode centric, clean typography, minimal distractions, and purposeful layout hierarchy.
- **Experience:** AI agent actions should be transparent, governed, and predictable without being intrusive.
- **Components:** Modular design system (Buttons, Cards, Dialogs, Sliders, Flow Canvas Nodes) ensuring absolute visual and operational consistency across Tenant and Superadmin portals.

### 🛡️ For DevOps & DevSecOps Engineers
- **Containerization:** Multi-stage Dockerfiles (`app` and `worker` targets) with Docker Compose local & production profiles.
- **Automated CI/CD Pipeline:** GitHub Actions running Bandit SAST security scans, Trivy container vulnerability scans, Gitleaks secret detection, and k6 load tests on pull requests.

---

## 🏗 System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (Next.js 15)"]
        Landing["Landing & Docs (/pricing, /features, /docs)"]
        AuthUI["3D Auth Canvas (/login, /signup)"]
        UserPortal["Tenant Admin Portal (/user/admin/*)"]
        SuperAdmin["Platform Superadmin Portal (/admin/*)"]
    end

    subgraph Gateway ["Reverse Proxy & Middlewares"]
        NextProxy["Next.js API Proxy & Rewrites (/api -> backend:8000)"]
        MW_RateLimit["Redis Rate Limiter"]
        MW_Security["CSRF, UUID Validation & Admin Guard"]
        MW_CORS["Dynamic CORS Middleware"]
    end

    subgraph BackendAPI ["FastAPI Production Application"]
        AuthService["Auth & 2FA (JWT, TOTP, Turnstile)"]
        ChatRouter["Chat & Realtime WebSockets (/chat, /realtime)"]
        BrainRouter["Knowledge Ingestion & Brain (/brain)"]
        ChannelRouter["Omnichannel Ingestion (WhatsApp, IG, Twilio, Gmail)"]
        WorkflowRouter["Automation & Flow Packs (/automation, /flows)"]
        BillingRouter["Billing & Token Metering (Razorpay)"]
    end

    subgraph AI_Engine ["Agentic RAG & Governance Engine"]
        LLM_Router["Multi-LLM Router (OpenAI, Gemini, Groq, Claude)"]
        MCP_Layer["MCP Safeguard Layer (Allow / Block / Escalate)"]
        VectorStore["pgvector Hybrid Retrieval & Embeddings"]
        Ingestion["Playwright / Scrapy / Document Ingestion"]
        RL_Cache["Reinforcement Learning & Feedback Cache"]
    end

    subgraph WorkersQueues ["Async Tasks & Job Scheduling"]
        CeleryWorker["Celery Worker (Flow Exec, Scoring, Ingestion)"]
        CeleryBeat["Celery Beat / RedBeat (Periodic Schedules, Follow-ups)"]
        RedisQueue[("Redis 7 (Broker, Locks, PubSub, Cache)")]
    end

    subgraph StorageLayer ["Persistence Layer"]
        PostgresDB[("PostgreSQL 16 + pgvector")]
        SupabaseS3[("Supabase Storage / S3 Media")]
    end

    ClientLayer --> NextProxy
    NextProxy --> Gateway
    Gateway --> BackendAPI

    BackendAPI --> AI_Engine
    BackendAPI --> WorkersQueues
    BackendAPI --> StorageLayer

    AI_Engine --> PostgresDB
    WorkersQueues --> RedisQueue
    WorkersQueues --> PostgresDB
    BackendAPI --> SupabaseS3
```

---

## 💻 Technology Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15.2 (App Router), React 18.3, Tailwind CSS v4, Framer Motion, Radix UI, Lucide Icons, Three.js / React Three Fiber, Recharts | Dynamic interactive UI, 3D auth views, visual node workflow canvas, dark-mode dashboard, realtime WebSockets. |
| **Backend API** | Python 3.11+, FastAPI 0.135+, Pydantic V2, SQLAlchemy 2.0 (Async/Sync), Uvicorn | High-performance asynchronous REST endpoints, route guards, CSRF & UUID validation, streaming endpoints. |
| **Database & Vectors** | PostgreSQL 16, `pgvector` 0.4.2, Alembic 1.13+ | Relational multi-tenant schema, vector similarity search (`HNSW` / `IVFFlat`), schema migrations. |
| **Task Queue & Cache** | Redis 7, Celery 5.3.6, Celery Beat, RedBeat | Asynchronous background processing, distributed locking, pub/sub realtime broadcasts, rate limiting. |
| **AI / RAG Infrastructure** | Sentence-Transformers (`all-MiniLM-L6-v2`), PyTorch (CPU), OpenAI, Google Gemini, Groq LLaMA-3, Anthropic Claude | Hybrid retrieval, semantic embeddings, multi-model fallback routing, multi-step agent reasoning, document chunking. |
| **Web Scraping & Parsers** | Scrapy, Scrapy-Playwright, BeautifulSoup4, PyPDF2, python-docx | High-fidelity crawling of dynamic single-page applications and document parsing for the Brain knowledge base. |
| **External Integrations** | Meta WhatsApp Cloud API (WCC), Twilio Messaging API, Instagram Graph API, Google OAuth / Gmail API, Razorpay | Omnichannel messaging ingest, automated payment processing, recurring billing subscriptions, invoice generation. |
| **Security & DevSecOps** | Cloudflare Turnstile, PyOTP (TOTP 2FA), Fernet Encryption, Bandit SAST, Trivy, Gitleaks, k6 load tester | Hardened authentication, zero data leak error sanitizer, continuous security scans on pull requests. |

---

## 📂 Project Directory Map

```text
auromindai-base-mvp/
├── .github/
│   └── workflows/
│       ├── sanity_check.yml       # PR backend compilation & dependency verification
│       └── security-pipeline.yml   # Bandit SAST, Trivy container, Gitleaks & Pytest scan
├── backend/
│   ├── alembic/                   # Database migration environment and revision files
│   ├── app/
│   │   ├── config/                # Environment-specific configuration loaders
│   │   ├── core/                  # Middleware, security, logging, Celery app, WebSockets
│   │   │   ├── admin_middleware.py    # Console route protection
│   │   │   ├── celery_app.py          # Celery configuration & beat schedule registry
│   │   │   ├── csrf_middleware.py     # CSRF token validation
│   │   │   ├── deps.py                # FastApi dependencies (get_db, get_current_user)
│   │   │   ├── rate_limit.py          # Redis token-bucket rate limiter
│   │   │   ├── sanitizer.py           # White-label exception & stack trace sanitizer
│   │   │   └── websockets.py          # ConnectionManager for realtime notifications
│   │   ├── database.py            # SQLAlchemy engine, SessionLocal, Base model
│   │   ├── main.py                # FastAPI app initialization, middleware, router mounts
│   │   ├── models/                # 40+ SQLAlchemy database models (Workspaces, Users, etc.)
│   │   ├── routers/               # API endpoint modules
│   │   │   ├── admin/             # Superadmin platform management (30+ sub-routers)
│   │   │   ├── inbox_chennal/     # Multi-channel webhooks (Meta WhatsApp, IG, Twilio)
│   │   │   ├── auth.py            # Authentication, JWT tokens, Google OAuth
│   │   │   ├── automation.py      # Workflow builder endpoints
│   │   │   ├── billing.py         # Razorpay checkout, plans, webhooks
│   │   │   ├── brain.py           # Agentic RAG document upload & ingestion status
│   │   │   ├── chat.py            # AI conversational interface & streaming
│   │   │   ├── lead_scoring.py    # Lead qualification and scoring routes
│   │   │   ├── realtime.py        # Realtime WebSocket router
│   │   │   └── two_factor.py      # TOTP 2FA setup and verification
│   │   ├── schemas/               # Pydantic request/response validation schemas
│   │   ├── services/              # Business logic & external service connectors
│   │   │   ├── agentic_rag/       # Ingestion, RAG retrieval, MCP guardrails, reranker
│   │   │   ├── ai/                # LLM router, chat orchestrator, execution service
│   │   │   ├── billing/           # Payment invoice generation & subscription lifecycle
│   │   │   ├── crm/               # CRM synchronizer & contact services
│   │   │   └── inbox/             # Unified messaging & webhook dispatchers
│   │   └── workers/               # Celery worker task definitions
│   │       ├── billing_worker.py          # Subscription checks & invoice sync
│   │       ├── flow_execution.py          # Automation node execution engine
│   │       ├── ingestion_worker.py        # Async document parsing & embedding tasks
│   │       └── scoring_worker.py          # Lead qualification background worker
│   ├── tests/                     # Unit, integration, and security test suites
│   ├── Dockerfile                 # Multi-stage Docker build (app + worker targets)
│   └── requirements.txt           # Python dependency specifications
├── frontend/
│   ├── public/                    # Static assets, icons, documentation imagery
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (public)/          # Landing, /pricing, /features, /solutions, /docs
│   │   │   ├── admin/             # Super Admin platform portal (Workspaces, Tokens, Logs)
│   │   │   ├── user/admin/        # Tenant Admin portal (Dashboard, Brain, Inbox, Flows)
│   │   │   │   ├── automation/    # Interactive visual node workflow canvas
│   │   │   │   ├── brain/         # Knowledge base document upload & crawling
│   │   │   │   ├── channels/      # Channel integration wizards (WhatsApp WCC, IG, Twilio)
│   │   │   │   ├── inbox/         # Unified real-time multi-channel inbox
│   │   │   │   └── leads/         # Lead list, score breakdown, and pipeline status
│   │   │   ├── login/             # 3D interactive login page
│   │   │   └── layout.js          # Root layout & providers
│   │   ├── components/            # Reusable UI components (Modals, Buttons, Navbars)
│   │   ├── context/               # React Context providers (AuthContext, WorkspaceContext)
│   │   └── lib/                   # Utility helpers & API client
│   │       ├── api/               # Modular API clients (auth, brain, billing, channels)
│   │       └── api.js             # Root API connector & white-label sanitizer
│   ├── package.json               # Node.js dependencies & scripts
│   └── next.config.mjs            # Reverse proxy rewrites & security headers
├── docker-compose.yml             # Full-stack local development environment
└── docker-compose.prod.yml        # Production deployment compose spec
```

---

## 🧩 Core Subsystems & Feature Breakdown

### 1. Multi-Tenancy & RBAC
- **Workspace Isolation**: Every user belongs to one or more `Workspaces`. All database queries filter on `workspace_id` to prevent cross-tenant data leakage.
- **Roles**: Supported roles include `owner`, `admin`, `member`, and `viewer`.
- **Admin Impersonation**: Platform Superadmins can generate short-lived, audited impersonation sessions to inspect tenant issues without knowing tenant credentials.
- **2FA & Security**: Supports TOTP (Google Authenticator) with QR enrollment and backup recovery codes (`two_factor.py`).

### 2. Agentic RAG & Knowledge Base ("The Brain")
- **File Upload & Parsing**: Handles PDF, DOCX, TXT, and CSV uploads.
- **Web Crawling**: Scrapy & Playwright crawler (`backend/app/services/agentic_rag/ingestion_layer.py`) fetches and extracts clean content from customer websites up to configurable crawl depths.
- **Embeddings & Vector Store**: Generates embeddings via Sentence-Transformers (`all-MiniLM-L6-v2`) and persists vectors in PostgreSQL utilizing `pgvector` with cosine similarity search.
- **Hybrid Search & Reranking**: Combines keyword search with vector semantic similarity and re-ranks passages before constructing the LLM prompt.

### 3. MCP Governance & Safeguard Layer
- **Model Context Protocol (MCP)**: Every tool invocation or agent action is inspected by `guardrails_service.py` and `mcp_layer.py`.
- **Decision Engine**: Actions are categorized as:
  - **`ALLOW`**: Safe read or non-destructive inquiry. Executed automatically.
  - **`BLOCK`**: Prompt injection detected, unauthorized system command, or security policy violation.
  - **`ESCALATE`**: High-impact business actions (e.g., executing a refund, deleting customer data, making an appointment outside allowed windows) require human approval from the dashboard.

### 4. Omnichannel Messaging Pipeline
- **Meta WhatsApp Cloud API**: Webhook verification, inbound message parsing, and interactive template dispatching (`meta_what.py`, `wcc_service.py`).
- **Twilio**: SMS and WhatsApp inbound/outbound messaging with status delivery callbacks (`twilio_webhook.py`).
- **Instagram**: DM and mention event handlers using Instagram Graph Webhooks (`instagram.py`).
- **Gmail / Email**: OAuth 2.0 authentication, IMAP/SMTP synchronization, and background retry workers for failed delivery (`gmail.py`, `email_retry_worker.py`).
- **Realtime Dispatch**: Inbound messages trigger Redis PubSub, which notifies the frontend immediately via WebSockets (`/ws`).

### 5. Visual Automation & Flow Engine
- **Canvas UI**: Visual drag-and-drop workflow editor built with React components under `frontend/src/app/user/admin/automation/`.
- **Node Types**: Triggers (Inbound message, Lead created, Tag added), Actions (Send WhatsApp, Send Email, Update CRM, Trigger AI Agent), Conditions (If/Else, Sentiment check, Score threshold), and Delays.
- **Execution Worker**: Asynchronously processed by `backend/app/workers/flow_execution.py` with state recovery via `scheduled_resume.py`.

### 6. Lead Scoring Engine
- Evaluates inbound customer interactions in real time.
- Uses a hybrid scoring model (Rule-based weights for high-intent keywords + AI sentiment classification).
- Scores update lead stages automatically (`cold`, `warm`, `hot`, `qualified`) and emit webhook notifications.

### 7. Billing, Credits & Token Metering
- **Razorpay Integration**: Supports monthly/annual subscription plans and instant top-up credit packs.
- **Token Ledger**: Tracks token consumption for every model call (Prompt tokens, Completion tokens, Vector search units) stored in `token_ledger.py`.
- **Feature Entitlements**: Enforces platform limits (e.g. maximum documents uploaded, number of active WhatsApp numbers, monthly AI tokens).
- **Invoices**: Automated invoice PDF generation via ReportLab.

### 8. Admin Portals (Tenant Admin vs Super Admin)
- **Tenant Portal (`/user/admin/*`)**: Workspace-level management. Configure AI prompts, train the Brain, manage inboxes, view leads, and configure team members.
- **Super Admin Portal (`/admin/*`)**: System-wide operations. Monitor active workspaces, configure LLM provider API keys, inspect security audit logs, manage subscription plans, and toggle global feature flags.

---

## 🚀 Getting Started (Local Development Setup)

### Prerequisites
- **Git**
- **Docker & Docker Compose** (Recommended)
- **Python 3.11+** (for native backend development)
- **Node.js 20+ & npm** (for native frontend development)
- **PostgreSQL 16** with `pgvector` extension enabled
- **Redis 7**

---

### Option A: Docker Compose Setup (Recommended)
The fastest way to spin up the entire application (PostgreSQL + pgvector, Redis, FastAPI Backend, Celery Worker, Celery Beat, and Next.js Frontend):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Auromind-Ai/Auromindai-Base-MVP.git
   cd auromindai-base-mvp
   ```

2. **Configure environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env frontend/.env.local
   ```
   > [!IMPORTANT]
   > Fill in your minimum required API keys in `backend/.env` (e.g., `OPENAI_API_KEY`, `POSTGRES_PASSWORD`, `SECRET_KEY`).

3. **Start the containers**:
   ```bash
   docker-compose up --build
   ```

4. **Access the application**:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Redoc API Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Option B: Native Local Development

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Create environment file
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Start Celery Worker & Beat (Separate Terminals)
```bash
# Terminal 2: Celery Worker
cd backend
celery -A app.core.celery_app worker --loglevel=info -Q default,beat

# Terminal 3: Celery Beat Scheduler
cd backend
celery -A app.core.celery_app beat --loglevel=info
```

#### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node modules
npm install

# Start Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. All requests to `/api/*` are automatically proxied to the backend at `http://127.0.0.1:8000`.

---

## 🔐 Environment Variables Reference

Key variables inside `backend/.env`:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime environment (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string with `psycopg2` driver | `postgresql+psycopg2://postgres:postgres@localhost:5435/yogeshdb` |
| `REDIS_URL` | Redis connection URL for Celery broker and cache | `redis://localhost:6379/0` |
| `SECRET_KEY` | Hex secret used to sign JWT tokens | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Fernet 32-byte key for encrypting channel tokens in DB | Auto-generated if absent |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o / GPT-4o-mini | `sk-...` |
| `GOOGLE_API_KEY` | Google Gemini API key for Gemini 1.5/2.0 Flash | `AIzaSy...` |
| `GROQ_API_KEY` | Groq API key for low-latency LLaMA-3 inference | `gsk_...` |
| `META_VERIFY_TOKEN` | Secret string for verifying Meta WhatsApp webhooks | Custom secret |
| `META_SYSTEM_USER_TOKEN`| Meta Cloud API permanent system user token | Token from Meta App Dashboard |
| `TWILIO_STATUS_CALLBACK_URL`| Public webhook callback URL for Twilio events | `https://your-domain.com/api/twilio/callback` |
| `RAZORPAY_KEY` | Razorpay API Key ID | `rzp_test_...` |
| `RAZORPAY_SECRET` | Razorpay API Secret | Secret string |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay webhook verification signature secret | Custom secret |
| `SUPABASE_URL` | Supabase endpoint for S3-compatible media storage | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase privileged service role key | Secret key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server verification key | `1x0000000000000000000000000000000AA` |

---

## 👩‍💻 Feature Developer Cookbooks

### Recipe 1: Add a New Database Model & Migration
1. Create a model in `backend/app/models/new_feature.py`:
   ```python
   from sqlalchemy import Column, String, ForeignKey, DateTime, func
   from app.database import Base
   import uuid

   class NewFeature(Base):
       __tablename__ = "new_features"

       id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
       workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
       title = Column(String(255), nullable=False)
       created_at = Column(DateTime(timezone=True), server_default=func.now())
   ```
2. Export the model in `backend/app/models/__init__.py`:
   ```python
   from app.models.new_feature import NewFeature
   ```
3. Generate and apply the migration:
   ```bash
   cd backend
   alembic revision --autogenerate -m "Add new_features table"
   alembic upgrade head
   ```

---

### Recipe 2: Add a New Backend Router / API Endpoint
1. Define Pydantic request/response schemas in `backend/app/schemas/new_feature.py`:
   ```python
   from pydantic import BaseModel

   class NewFeatureCreate(BaseModel):
       title: str

   class NewFeatureResponse(BaseModel):
       id: str
       title: str
       class Config:
           from_attributes = True
   ```
2. Create router in `backend/app/routers/new_feature.py`:
   ```python
   from fastapi import APIRouter, Depends, HTTPException
   from sqlalchemy.orm import Session
   from app.core.deps import get_db, get_current_user
   from app.models.user import User
   from app.models.new_feature import NewFeature
   from app.schemas.new_feature import NewFeatureCreate, NewFeatureResponse

   router = APIRouter(prefix="/new-feature", tags=["new-feature"])

   @router.post("/", response_model=NewFeatureResponse)
   def create_item(
       payload: NewFeatureCreate,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user)
   ):
       item = NewFeature(workspace_id=current_user.current_workspace_id, title=payload.title)
       db.add(item)
       db.commit()
       db.refresh(item)
       return item
   ```
3. Mount router in `backend/app/main.py`:
   ```python
   from app.routers.new_feature import router as new_feature_router
   app.include_router(new_feature_router, prefix="/api")
   ```

---

### Recipe 3: Add a New Frontend Page & Connect API
1. Create a page at `frontend/src/app/user/admin/new-feature/page.js`:
   ```jsx
   "use client";
   import { useEffect, useState } from "react";
   import api from "@/lib/api";

   export default function NewFeaturePage() {
     const [items, setItems] = useState([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       async function load() {
         try {
           const res = await api.get("/new-feature/");
           setItems(res.data);
         } catch (err) {
           console.error("Failed to load feature items", err);
         } finally {
           setLoading(false);
         }
       }
       load();
     }, []);

     return (
       <div className="p-6">
         <h1 className="text-2xl font-bold text-white mb-4">New Feature</h1>
         {loading ? <p>Loading...</p> : <ul>{items.map(i => <li key={i.id}>{i.title}</li>)}</ul>}
       </div>
     );
   }
   ```
2. Any client API method will automatically route through `next.config.mjs` reverse proxy, carrying your session JWT cookies and CSRF headers safely.

---

### Recipe 4: Add an AI Tool or Agent Action
1. Implement the tool execution in `backend/app/services/agentic_rag/tools_layer.py`:
   ```python
   def execute_check_inventory(item_id: str, db: Session) -> dict:
       # Inventory check business logic
       return {"item_id": item_id, "in_stock": True, "quantity": 14}
   ```
2. Register the tool under the MCP Governance Layer in `backend/app/services/agentic_rag/mcp_layer.py`:
   ```python
   # Register governance classification: ALLOW, BLOCK, or ESCALATE
   MCP_POLICY_REGISTRY["check_inventory"] = {
       "policy": "ALLOW",
       "required_permission": "read:inventory"
   }
   ```

---

### Recipe 5: Add an Asynchronous Celery Worker Task
1. Define the task inside `backend/app/workers/tasks.py`:
   ```python
   from app.core.celery_app import celery_app
   from app.database import SessionLocal
   from app.core.logger import logger

   @celery_app.task(name="tasks.process_heavy_calculation", bind=True, max_retries=3)
   def process_heavy_calculation(self, workspace_id: str):
       db = SessionLocal()
       try:
           logger.info(f"Running heavy calculation for workspace: {workspace_id}")
           # Heavy work here
       except Exception as exc:
           db.rollback()
           raise self.retry(exc=exc, countdown=10)
       finally:
           db.close()
   ```
2. Invoke task asynchronously from any service or endpoint:
   ```python
   from app.workers.tasks import process_heavy_calculation
   process_heavy_calculation.delay(workspace_id=workspace.id)
   ```

---

## 🧪 Testing, QA & Security Pipeline

The repository uses automated GitHub Actions workflows (`.github/workflows/`) for DevSecOps and code quality assurance.

### Run Unit & Integration Tests
```bash
cd backend
pytest tests/ -v
```

### Check Code Coverage
```bash
cd backend
python -m coverage run -m pytest tests/
python -m coverage report --include="app/*"
```

### Static Security Analysis (Bandit SAST)
```bash
cd backend
bandit -r app/ -ll -ii
```

### Frontend Linting
```bash
cd frontend
npm run lint
```

---

## 🌿 Git Workflow & PR Guidelines

> [!CAUTION]
> **Never commit or push directly to `main`.** All changes must go through feature branches and Pull Requests.

1. **Branch Naming**:
   - `feature/your-feature-name` (e.g. `feature/hubspot-integration`)
   - `bugfix/issue-description` (e.g. `bugfix/fix-whatsapp-media-timeout`)
   - `hotfix/critical-patch`

2. **Creating your branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

3. **Submitting a Pull Request Checklist**:
   - [ ] Database migrations generated via Alembic if schema changed.
   - [ ] No hardcoded API keys, tokens, or plaintext passwords (verified by Gitleaks).
   - [ ] All new endpoints have Pydantic validation schemas.
   - [ ] Pytest passes locally (`pytest tests/`).
   - [ ] `sanitizeErrorMessage` preserved for client-facing error handling.
   - [ ] Pull Request opened against `main` with a clear description and testing notes.

---

## 📞 Support & Core Contributors
- **Head of Product**: Santhosh
- **Repository**: [Auromind-Ai/Auromindai-Base-MVP](https://github.com/Auromind-Ai/Auromindai-Base-MVP)
- **Production URL**: [https://orbionagents.com](https://orbionagents.com)

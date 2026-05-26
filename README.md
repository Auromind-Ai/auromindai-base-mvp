# Auromind
**AI-Powered Business Assistant Platform**

Auromind is an advanced SaaS platform that helps businesses automate sales follow-ups, optimize marketing, and organize workflows using governed AI agents.

## Team
- **Santhosh**: Head of Product

---


## 🎓 For Interns: Start Here!

**1. Clone the Code**
Run this terminal command to download the project:
```bash
git clone https://github.com/Auromind-Ai/Auromindai-Base-MVP.git
```

**2. Learn the AI System**
We have written a simple guide to explain how our "Brain" (RAG) and "Safeguards" (MCP) work.
👉 **[Read the AI Infrastructure Guide (AI_ARCHITECTURE.md)](./AI_ARCHITECTURE.md)**

---

## 🛠 Technical Overview (By Role)


### 🤖 For AI Engineers
Auromind is **not just a wrapper**. We use a **Governed AI Architecture**:
- **MCP (Model Context Protocol):** A custom governance layer that evaluates every AI action (Allow/Block/Escalate) before execution.
- **RAG (Retrieval-Augmented Generation):** "The Brain" ingest documents and websites to ground AI responses in business data.
- **Orchestrator:** Manages state across conversations and long-running tasks.

### ⚙️ For Backend Developers
The core logic resides in a high-performance **FastAPI** application.
- **Language:** Python 3.11+
- **Database:** PostgreSQL (with `pgvector` for embeddings).
- **ORM:** SQLAlchemy 2.0 (Async).
- **Validation:** Pydantic V2.
- **Key Services:** Auth (JWT), Follow-up Scheduler, Inbox Manager.

### 💻 For Frontend Developers
The interface is a modern **Next.js 14** application.
- **Framework:** Next.js (App Router).
- **Styling:** Tailwind CSS + Framer Motion (for smooth interactions).
- **State:** React Context + Hooks.
- **Integration:** REST API consumption via a custom `api.js` client.

### 🎨 For UI/UX Designers
Our design philosophy is **"Calm SaaS"**.
- **Visuals:** Dark mode centric, clean lines, minimal distractions.
- **Experience:** AI actions should be transparent but unobtrusive.
- **Components:** Modular design system (Buttons, Cards, Modals) ensuring consistency.

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (if running backend locally)
- Node.js 20+ (if running frontend locally)

### Quick Start (Docker)
The easiest way to run the entire stack:
```bash
docker-compose up
```
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **API Docs:** `http://localhost:8000/docs`

### Project Structure
```
auromind/
├ backend/            # FastAPI Application
│   ├ app/models/     # Database Schemas
│   ├ app/routers/    # API Endpoints
│   └ app/services/   # Business Logic & AI
├ frontend/           # Next.js Application
└ docker-compose.yml  # Infrastructure
```

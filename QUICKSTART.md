# Auromind - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Services

```bash
cd "/Users/santhosh/Desktop/ai bots/auromind"
docker-compose up
```

This will start:
- PostgreSQL database on port 5432
- FastAPI backend on port 8000
- Next.js frontend on port 3000

**Important**: Wait for all services to be healthy before proceeding.

### Step 2: Access the Application

Open your browser:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/health

### Step 3: Create Your Account

1. Go to http://localhost:3000
2. Click "Start Free" or "Sign Up"
3. Fill in:
   - Full Name
   - Email
   - Password (min 8 chars)
   - Workspace Name (your company name)
4. Submit → You'll be auto-logged in

---

## 🎯 What to Explore

### Landing Page (/)
- Hero section
- Use case cards
- Pricing tiers

### Dashboard (/user/admin/dashboard)
- Stats overview (mock data)
- Recent AI actions table

### AI Control Center (/user/admin/ai-control)
- **MCP Rules** - View governance policies
- **Actions Log** - See all AI decisions
- **Filtering** - Filter by Allow/Escalate/Block
- **Override** - Approve or reject escalated actions

---

## 🧪 Testing the MCP System

### Using the API Docs (http://localhost:8000/docs)

1. **Create Account**:
   - POST `/auth/signup`
   - Body:
     ```json
     {
       "email": "test@example.com",
       "password": "password123",
       "full_name": "Test User",
       "workspace_name": "Test Company"
     }
     ```
   - Copy the `access_token` from response

2. **Authorize in Swagger**:
   - Click "Authorize" button (top right)
   - Enter: `Bearer <your-access-token>`
   - Click "Authorize"

3. **Test MCP Evaluation**:
   - POST `/mcp/evaluate`
   - Body:
     ```json
     {
       "action_type": "followup",
       "intent": "Send follow-up message to lead about refund policy",
       "context": {"followup_count": 1},
       "confidence": 0.65,
       "workspace_id": "<your-workspace-id>"
     }
     ```
   - Expected: `ESCALATE` or `BLOCK` (due to "refund" keyword or low confidence)

4. **View Audit Log**:
   - GET `/mcp/actions?workspace_id=<your-workspace-id>`
   - See the logged action with decision and reason

---

## 📝 Project Structure

```
auromind/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── models/       # Database models (7 files)
│   │   ├── routers/      # API endpoints (auth, mcp)
│   │   ├── services/     # Business logic (auth, mcp)
│   │   ├── utils/        # Helper functions
│   │   └── main.py       # FastAPI app
│   └── requirements.txt
│
├── frontend/             # Next.js application
│   └── src/
│       ├── app/         # Pages & routing
│       │   ├── page.js  # Landing page (/)
│       │   ├── login/   # Auth pages
│       │   ├── signup/
│       │   └── user/admin/  # Admin panel
│       └── lib/         # Utilities (api, auth)
│
└── docker-compose.yml   # Development environment
```

---

## 🛠 Development Commands

### Backend Only
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Only
```bash
cd frontend
npm install
npm run dev
```

### Stop All Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

## 🔑 Key Features

### 1. MCP Governance Layer
Every AI action is evaluated with rules:
- **No auto-spending**: Marketing changes require approval
- **Max follow-ups**: Limit 3 per conversation
- **Confidence threshold**: Min 70% to auto-execute
- **Blocked keywords**: Prevents risky responses
- **Human override**: Approve/reject escalated actions

### 2. Authentication
- JWT-based secure authentication
- Workspace creation on signup
- Role management (Founder/Team Member)
- Token stored in localStorage

### 3. Admin Dashboard
- Stats cards (follow-ups, replies, ad spend, promises)
- Recent AI actions with MCP decisions
- Color-coded decision badges

### 4. Design System
- Calm SaaS aesthetic
- Inter font family
- Responsive layouts
- AI/Human/Customer indicators

---

## ⚠️ Current Limitations

This is an MVP with the following placeholder features:
- ❌ Inbox (not implemented yet)
- ❌ Follow-ups automation (not implemented yet)
- ❌ Marketing bot (not implemented yet)
- ❌ Promises/Founder assistant (not implemented yet)
- ❌ Brain/RAG (not implemented yet)
- ❌ Real integrations (WhatsApp, Instagram, etc.)

What **IS** working:
- ✅ Landing page
- ✅ Authentication (signup/login)
- ✅ Admin layout with navigation
- ✅ Dashboard with mock data
- ✅ AI Control Center (MCP)
- ✅ MCP decision engine
- ✅ Audit logging

---

## 🐛 Troubleshooting

### Database connection error
```bash
# Make sure PostgreSQL is running
docker-compose ps

# Restart if needed
docker-compose restart postgres
```

### Frontend can't connect to backend
- Check backend is running on port 8000
- Verify CORS settings in `backend/app/main.py`
- Check `frontend/.env.local` has correct API URL

### Module not found errors
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

---

## 📚 Next Steps

1. **Complete Backend Services**:
   - Implement inbox service (conversations, messages)
   - Build follow-up scheduler
   - Add LLM integration (OpenAI)
   - Implement RAG/Brain with embeddings

2. **Frontend Features**:
   - Build Inbox UI with conversation threads
   - Create follow-up configuration page
   - Add promise management UI
   - Implement Brain upload interface

3. **Integrations**:
   - WhatsApp Business API
   - Instagram Graph API
   - Meta/Google Ads APIs

4. **Testing**:
   - Write unit tests for MCP rules
   - Add integration tests
   - E2E testing with Playwright

---

## 📖 Documentation

- **API Docs**: http://localhost:8000/docs
- **Implementation Plan**: See `implementation_plan.md`
- **Walkthrough**: See `walkthrough.md`
- **README**: See project root `README.md`

---

## 💡 Tips

1. **Use the API Docs** - Fast way to test endpoints without frontend
2. **Check Logs** - `docker-compose logs -f` shows real-time output
3. **MCP Testing** - Try different action types and confidence scores
4. **Database Reset** - `docker-compose down -v` removes DB volume

---

For questions or issues, check the walkthrough document or implementation plan for detailed explanations.

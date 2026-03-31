from fastapi import APIRouter
from . import (
    ai_actions,
    dashboard,
    workspaces,
    users,
    tokens,
    conversations,
    logs,
    analytics,
    billing,
    ai_governance,
    integrations,
    rag,
    system,
    ai_learning,
    settings,
<<<<<<< HEAD
    payments,
    impersonate,
    rag_analytics
=======
    impersonate
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)
)

router = APIRouter(prefix="/admin", tags=["Admin"])

# include in order matching sidebar
router.include_router(dashboard.router)
router.include_router(workspaces.router)
router.include_router(users.router)
router.include_router(tokens.router)
router.include_router(conversations.router)
router.include_router(logs.router)
router.include_router(analytics.router)
router.include_router(billing.router)
router.include_router(ai_actions.router)
router.include_router(ai_governance.router)
router.include_router(integrations.router)
router.include_router(rag.router)
router.include_router(system.router)
router.include_router(ai_learning.router)
router.include_router(settings.router)
<<<<<<< HEAD
router.include_router(payments.router)
router.include_router(impersonate.router)
router.include_router(rag_analytics.router)
=======
router.include_router(impersonate.router)
>>>>>>> 36cbb02 (feat: refactor chat system with billing, guardrails, and streaming support)

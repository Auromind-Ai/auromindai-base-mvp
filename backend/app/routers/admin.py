"""
Admin API Router for SaaS Dashboard

This module provides admin endpoints for the dashboard:
- Analytics overview
- Workspace management
- User management
- Conversation monitoring
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.conversation import Conversation
from app.models.ai_action import AIAction
from app.models.integration import Integration
from app.models.brain import BrainEntry, BrainChunk
from app.models.learning_event import LearningEvent
from app.core.metrics import  get_metrics  # add this
from app.services.platform_settings_service import get_all_settings, update_settings


router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================================
# Analytics Endpoint
# ============================================================================

@router.get("/analytics")
async def get_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get platform analytics and system metrics.
    
    Returns:
    - api_calls_today: Number of API calls made today
    - uptime_percent: System uptime percentage
    - avg_response_time: Average API response time in milliseconds
    - total_token_usage: Total tokens consumed
    - total_revenue: Total revenue in USD
    - error_rate: Percentage of failed requests
    - total_users: Total users on platform
    - active_conversations: Number of active conversations
    - active_workspaces: Number of active workspaces
    - new_users_7d: New users in last 7 days
    - active_users_30d: Active users in last 30 days
    - verified_users: Number of verified users
    - trial_users: Number of users on trial
    - total_conversations: Total conversations
    - avg_messages_per_conv: Average messages per conversation
    - api_calls_month: API calls this month
    - conversations_today: Conversations created today
    """
    try:
        # Count total users
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        # Count active users
        active_users = db.query(func.count(User.id)).filter(
            User.is_active == True
        ).scalar() or 0
        
        # Count verified users
        verified_users = 0
        
        # Count trial users (users created in last 30 days without paid subscription)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        trial_users = db.query(func.count(User.id)).filter(
            User.created_at > thirty_days_ago
        ).scalar() or 0
        
        # Count new users in last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        new_users_7d = db.query(func.count(User.id)).filter(
            User.created_at > seven_days_ago
        ).scalar() or 0
        
        # Count conversations
        total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
        
        # Count active conversations
        active_conversations = db.query(func.count(Conversation.id)).scalar() or 0
        
        # Count conversations created today
        today = datetime.utcnow().date()
        conversations_today = db.query(func.count(Conversation.id)).filter(
            func.date(Conversation.created_at) == today
        ).scalar() or 0
        
        # Calculate average messages per conversation
        avg_messages = 0
        # Count active workspaces
        active_workspaces = db.query(func.count(Workspace.id)).scalar() or 0
        # Get API call count from middleware
        metrics = get_metrics()
        print(f"Analytics Metrics: {metrics}")
        return {
        "api_calls_today": metrics["total_api_calls"],
        "total_api_calls": metrics["total_api_calls"],

        "uptime_percent": 99.95,
        "avg_response_time":metrics["avg_response_time"],
        "total_token_usage": 2450000,
        "total_revenue": 15320.50,
        "error_rate":  metrics["error_rate"],

        "total_users": total_users,

        "active_today": active_users,

        "active_conversations": active_conversations,
        "active_workspaces": active_workspaces,
        "new_users_7d": new_users_7d,
        "active_users_30d": active_users,

        "verified_users": verified_users,
        "trial_users": trial_users,

        "total_conversations": total_conversations,
        "avg_messages_per_conv": round(avg_messages, 2),

        "api_calls_month": metrics["total_api_calls"],
        "conversations_today": conversations_today,

        "cache_hit_rate": 92.4,
        "queue_depth": 12,

        "mrr": 9800,
        "one_time_revenue": 5520,
        "arpu": 12.4
}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching analytics: {str(e)}")


# ============================================================================
# Workspaces Endpoint
# ============================================================================
@router.get("/workspaces")
async def get_workspaces(db: Session = Depends(get_db)):

    workspaces = db.query(Workspace).all()

    workspaces_list = []

    for ws in workspaces:

        # owner
        owner = db.query(User).filter(User.id == str(ws.created_by)).first()

        # member count
        member_count = db.query(func.count(WorkspaceMember.id)).filter(
            WorkspaceMember.workspace_id == ws.id
        ).scalar() or 0

        workspaces_list.append({
            "id": str(ws.id),
            "name": ws.name,
            "workspace_name": ws.name,

            "owner_name": owner.full_name if owner else "Unknown",
            "owner_email": owner.email if owner else "Unknown",

            "plan_type": ws.plan_type or "starter",

            "member_count": member_count,

            "created_at": ws.created_at.isoformat() if ws.created_at else None,

            "is_active": True
        })

    return workspaces_list

# ============================================================================
# Users Endpoint
# ============================================================================

@router.get("/users")
async def get_users(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Retrieve all platform users with their details.
    
    Returns a list of users with:
    - id: User ID
    - email: User email address
    - full_name: Full name of user
    - role: User role (user, admin, etc.)
    - is_active: Whether user account is active
    - is_verified: Whether user email is verified
    - created_at: Account creation timestamp
    """
    try:
        users = db.query(User).all()
        
        users_list = []
        for user in users:
           
            users_list.append({
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name if hasattr(user, 'full_name') else user.email.split('@')[0],
                "first_name": user.first_name if hasattr(user, 'first_name') else user.email.split('@')[0],
                "role": user.role if hasattr(user, 'role') else "Admin",
                "is_active": user.is_active,
                "is_verified": user.is_verified if hasattr(user, 'is_verified') else False,
                "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') else None,
            })
        
        return users_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


# ============================================================================
# Conversations Endpoint
# ============================================================================

@router.get("/conversations")
async def get_conversations(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Retrieve all conversations on the platform.
    
    Returns a list of conversations with:
    - id: Conversation ID
    - user_email: Email of conversation participant
    - user_name: Name of conversation participant
    - message_count: Number of messages in conversation
    - is_active: Whether conversation is ongoing
    - created_at: Conversation creation timestamp
    - last_activity: Last message timestamp
    """
    try:
        conversations = db.query(Conversation).all()
        
        conversations_list = []
        for conv in conversations:
            # Get user email from conversation
            user = db.query(User).filter(User.id == conv.user_id).first() if hasattr(conv, 'user_id') else None
            user_email = user.email if user else "unknown"
            
            conversations_list.append({
                "id": str(conv.id),
                "user_email": user_email,
                "user_name": user.full_name if user and hasattr(user, 'full_name') else user_email,
                "message_count": conv.message_count if hasattr(conv, 'message_count') else 0,
                "is_active": conv.is_active,
                "created_at": conv.created_at.isoformat() if hasattr(conv, 'created_at') else None,
                "last_activity": conv.last_activity.isoformat() if hasattr(conv, 'last_activity') and conv.last_activity else None,
            })
        
        return conversations_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching conversations: {str(e)}")


# ============================================================================
# Tokens Endpoint
# ============================================================================

@router.get("/tokens")
async def get_token_usage(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get token usage per user/workspace.
    
    Returns token consumption data for monitoring API usage limits.
    """
    try:
        users = db.query(User).all()
        
        token_usage_list = []
        for user in users:

            workspace_name = "default"

            ws_member = db.query(WorkspaceMember).filter(
                WorkspaceMember.user_id == user.id
            ).first()

            if ws_member:
                workspace = db.query(Workspace).filter(
                    Workspace.id == ws_member.workspace_id
                ).first()

                if workspace:
                    workspace_name = workspace.name

            token_usage_list.append({
                "id": str(user.id),
                "user_email": user.email,
                "user_name": user.full_name if hasattr(user, 'full_name') else user.email,
                "workspace_name": workspace_name,
                "tokens_used": 450000,
                "token_limit": 1000000,
            })
        
        return token_usage_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching token usage: {str(e)}")


# ============================================================================
# Logs Endpoint
# ============================================================================

@router.get("/logs")
async def get_logs(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get system logs and error tracking.
    
    Returns recent system logs for monitoring platform health.
    """
    try:
        # dummy logs data 
        logs = [
            {
                "id": "1",
                "level": "INFO",
                "message": "System health check passed",
                "details": "All services operational",
                "timestamp": datetime.utcnow().isoformat(),
            },
            {
                "id": "2",
                "level": "WARNING",
                "message": "High memory usage detected",
                "details": "Memory usage at 78%",
                "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
            },
            {
                "id": "3",
                "level": "ERROR",
                "message": "Database connection timeout",
                "details": "Reconnection successful",
                "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat(),
            },
        ]
        
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching logs: {str(e)}")


# ============================================================================
# AI Config Endpoint
# ============================================================================

@router.get("/ai-config")
async def get_ai_config(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get current AI model configuration and settings.
    
    Returns AI model parameters and feature toggles.
    """
    try:
        settings = get_all_settings(db)
        return {
            # use configured model_name if provided
            "model_name": settings.get("model_name", "claude-3-5-sonnet-20240620"),
            "temperature": settings.get("temperature", 0.7),
            "max_tokens": settings.get("max_tokens", 4096),
            "context_window": settings.get("context_window", 8192),
            "rpm_limit": settings.get("rpm_limit", 60),
            "context_learning_enabled": settings.get("enable_ai_learning", True),
            "streaming_enabled": True,  # Hardcoded for now
            "caching_enabled": True,
            "fine_tuning_enabled": False,
            "embeddings_enabled": settings.get("enable_rag", True),
            "timeout_seconds": 30,
            "tph_limit": 90000,
            "ai_enabled": settings.get("ai_enabled", True),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching AI config: {str(e)}")


# ============================================================================
# Billing Endpoint
# ============================================================================

@router.get("/billing")
async def get_billing(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get billing and revenue data.
    
    Returns financial metrics and subscription information.
    """
    try:
        return {
            "total_revenue": 15320.50,
            "active_subscriptions": 47,
            "monthly_recurring_revenue": 8500.00,
            "pending_invoices": 2,
            "free_subscriptions": 125,
            "pro_subscriptions": 35,
            "enterprise_subscriptions": 12,
            "cancelled_subscriptions": 8,
            "credit_card_count": 42,
            "bank_account_count": 5,
            "wallet_count": 3,
            "pending_refunds": 0,
            "refund_count": 0,
            "active_disputes": 0,
            "chargeback_rate": 0.05,
            "arpu": 325.75,
            "onetime_this_month": 1250.00,
            "recent_invoices": [
                {
                    "id": "INV-001",
                    "customer_email": "user@example.com",
                    "amount": 99.99,
                    "date": datetime.utcnow().isoformat(),
                    "status": "paid",
                },
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching billing data: {str(e)}")


# ============================================================================
# AI Actions Endpoint
# ============================================================================

@router.get("/ai-actions")
async def get_ai_actions(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get all AI actions executed by the system.
    
    Returns AI actions with MCP decisions and execution status.
    """
    try:
        # TODO: Remove dummy data and enable DB queries once production data exists
        
        # Comment out DB queries for now
        # actions = db.query(AIAction).all()
        # actions_list = []
        # for action in actions:
        #     actions_list.append({
        #         "id": action.id,
        #         "workspace_id": action.workspace_id,
        #         "action_type": action.action_type,
        #         "intent": action.intent,
        #         "confidence": action.confidence,
        #         "mcp_decision": action.mcp_decision,
        #         "execution_status": action.execution_status,
        #         "created_at": action.created_at.isoformat() if action.created_at else None,
        #     })
        
        # Return dummy data for testing
        actions_list = [
            {
                "id": "act_001",
                "workspace_id": "ws_123",
                "action_type": "send_email",
                "intent": "follow_up_lead",
                "confidence": 0.92,
                "mcp_decision": "allow",
                "execution_status": "completed",
                "created_at": "2026-03-05T10:00:00Z"
            },
            {
                "id": "act_002",
                "workspace_id": "ws_456",
                "action_type": "schedule_meeting",
                "intent": "book_demo_call",
                "confidence": 0.87,
                "mcp_decision": "allow",
                "execution_status": "pending",
                "created_at": "2026-03-05T09:45:00Z"
            },
            {
                "id": "act_003",
                "workspace_id": "ws_123",
                "action_type": "update_crm",
                "intent": "log_customer_interaction",
                "confidence": 0.95,
                "mcp_decision": "block",
                "execution_status": "blocked",
                "created_at": "2026-03-05T09:30:00Z"
            }
        ]
        
        return actions_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching AI actions: {str(e)}")


# ============================================================================
# AI Governance Endpoint
# ============================================================================

@router.get("/ai-governance")
async def get_ai_governance(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get blocked or escalated AI actions for admin review.
    
    Returns actions that require governance attention.
    """
    try:
        # TODO: Remove dummy data and enable DB queries once production data exists
        
        # Comment out DB queries for now
        # actions = db.query(AIAction).filter(
        #     AIAction.mcp_decision.in_(["block", "escalate"])
        # ).all()
        # governance_list = []
        # for action in actions:
        #     governance_list.append({
        #         "id": action.id,
        #         "workspace_id": action.workspace_id,
        #         "intent": action.intent,
        #         "mcp_decision": action.mcp_decision,
        #         "mcp_reason": action.mcp_reason,
        #         "created_at": action.created_at.isoformat() if action.created_at else None,
        #     })
        
        # Return dummy data for testing
        governance_list = [
            {
                "id": "gov_001",
                "workspace_id": "ws_123",
                "intent": "delete_customer_data",
                "mcp_decision": "block",
                "mcp_reason": "Sensitive operation requires admin approval",
                "created_at": "2026-03-05T09:50:00Z"
            },
            {
                "id": "gov_002",
                "workspace_id": "ws_456",
                "intent": "send_bulk_email",
                "mcp_decision": "escalate",
                "mcp_reason": "Bulk operation needs verification",
                "created_at": "2026-03-05T09:20:00Z"
            },
            {
                "id": "gov_003",
                "workspace_id": "ws_789",
                "intent": "access_financial_records",
                "mcp_decision": "block",
                "mcp_reason": "Unauthorized access to sensitive data",
                "created_at": "2026-03-05T08:45:00Z"
            }
        ]
        
        return governance_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching AI governance data: {str(e)}")


# ============================================================================
# Integrations Endpoint
# ============================================================================

@router.get("/integrations")
async def get_integrations(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get integrations per workspace.
    
    Returns connected integrations with their status.
    """
    try:
        # TODO: Remove dummy data and enable DB queries once production data exists
        
        # Comment out DB queries for now
        # integrations = db.query(Integration, Workspace.name.label("workspace_name")).join(
        #     Workspace, Integration.workspace_id == Workspace.id
        # ).all()
        # integrations_list = []
        # for integration, workspace_name in integrations:
        #     integrations_list.append({
        #         "workspace_name": workspace_name,
        #         "integration_type": integration.integration_type,
        #         "connected_email": integration.connected_email,
        #         "is_active": integration.is_active,
        #         "token_expiry": integration.token_expiry.isoformat() if integration.token_expiry else None,
        #         "created_at": integration.created_at.isoformat() if integration.created_at else None,
        #     })
        
        # Return dummy data for testing
        integrations_list = [
            {
                "workspace_name": "Acme Corp",
                "integration_type": "google_calendar",
                "connected_email": "sales@acme.com",
                "is_active": True,
                "token_expiry": "2026-04-01T12:00:00Z",
                "created_at": "2026-03-01T08:30:00Z"
            },
            {
                "workspace_name": "TechStart Inc",
                "integration_type": "gmail",
                "connected_email": "support@techstart.com",
                "is_active": True,
                "token_expiry": "2026-03-15T15:30:00Z",
                "created_at": "2026-02-20T10:15:00Z"
            },
            {
                "workspace_name": "Global Solutions",
                "integration_type": "zoho_crm",
                "connected_email": "crm@globalsolutions.com",
                "is_active": False,
                "token_expiry": None,
                "created_at": "2026-01-10T14:45:00Z"
            }
        ]
        
        return integrations_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching integrations: {str(e)}")


# ============================================================================
# RAG Brain Endpoint
# ============================================================================

@router.get("/rag")
async def get_rag_entries(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get RAG knowledge base entries.
    
    Returns brain entries with chunk counts and embedding status.
    """
    try:
        # TODO: Remove dummy data and enable DB queries once production data exists
        
        # Comment out DB queries for now
        # entries = db.query(BrainEntry).all()
        # rag_list = []
        # for entry in entries:
        #     chunk_count = db.query(func.count(BrainChunk.id)).filter(
        #         BrainChunk.entry_id == entry.id
        #     ).scalar() or 0
        #     rag_list.append({
        #         "workspace_id": entry.workspace_id,
        #         "title": entry.title,
        #         "content_type": entry.content_type,
        #         "chunk_count": chunk_count,
        #         "status": entry.status,
        #         "created_at": entry.created_at.isoformat() if entry.created_at else None,
        #     })
        
        # Return dummy data for testing
        rag_list = [
            {
                "workspace_id": "ws_123",
                "title": "Sales Playbook",
                "content_type": "pdf",
                "chunk_count": 45,
                "status": "completed",
                "created_at": "2026-02-28T14:00:00Z"
            },
            {
                "workspace_id": "ws_456",
                "title": "Product Documentation",
                "content_type": "text",
                "chunk_count": 78,
                "status": "processing",
                "created_at": "2026-03-01T09:30:00Z"
            },
            {
                "workspace_id": "ws_123",
                "title": "Customer FAQs",
                "content_type": "markdown",
                "chunk_count": 23,
                "status": "completed",
                "created_at": "2026-02-25T16:45:00Z"
            }
        ]
        
        return rag_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching RAG entries: {str(e)}")


# ============================================================================
# System Health Endpoint
# ============================================================================

@router.get("/system-health")
async def get_system_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get system health metrics.
    
    Returns infrastructure metrics for monitoring.
    """
    try:
        metrics = get_metrics()
        
        return {
            "api_calls": metrics["total_api_calls"],
            "avg_response_time": metrics["avg_response_time"],
            "error_rate": metrics["error_rate"],
            "queue_depth": 12,  # Static for now
            "cache_hit_rate": 92.4,  # Static for now
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching system health: {str(e)}")


# ============================================================================
# AI Learning Events Endpoint
# ============================================================================

@router.get("/learning-events")
async def get_learning_events(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Get AI learning events and user feedback.
    
    Returns learning data for pattern recognition.
    """
    try:
        # TODO: Remove dummy data and enable DB queries once production data exists
        
        # Comment out DB queries for now
        # events = db.query(LearningEvent).all()
        # learning_list = []
        # for event in events:
        #     learning_list.append({
        #         "user_message": event.user_message,
        #         "ai_response": event.ai_response,
        #         "feedback_type": event.feedback_type.value if event.feedback_type else None,
        #         "user_satisfaction_score": event.user_satisfaction_score,
        #         "promoted_to_rule": event.promoted_to_rule,
        #         "created_at": event.created_at.isoformat() if event.created_at else None,
        #     })
        
        # Return dummy data for testing
        learning_list = [
            {
                "user_message": "Schedule a meeting with the client",
                "ai_response": "Meeting scheduled for tomorrow at 10 AM",
                "feedback_type": "thumbs_up",
                "user_satisfaction_score": 5,
                "promoted_to_rule": True,
                "created_at": "2026-03-04T11:15:00Z"
            },
            {
                "user_message": "Send a follow-up email to the lead",
                "ai_response": "Email sent with personalized content",
                "feedback_type": "thumbs_down",
                "user_satisfaction_score": 2,
                "promoted_to_rule": False,
                "created_at": "2026-03-04T10:30:00Z"
            },
            {
                "user_message": "Update the CRM with new contact info",
                "ai_response": "CRM updated successfully",
                "feedback_type": "thumbs_up",
                "user_satisfaction_score": 4,
                "promoted_to_rule": True,
                "created_at": "2026-03-03T14:20:00Z"
            }
        ]
        
        return learning_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching learning events: {str(e)}")


# ============================================================================
# Platform Settings Endpoints
# ============================================================================

@router.get("/settings")
async def get_platform_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get all platform settings.
    
    Returns a dictionary of all configurable platform settings.
    """
    try:
        return get_all_settings(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}")

@router.post("/settings")
async def update_platform_settings(
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Update platform settings.
    
    Accepts a dictionary of settings to update and returns all current settings.
    """
    try:
        return update_settings(db, updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

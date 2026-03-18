from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.integration import Integration
from app.routers.auth import get_current_user
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os
from datetime import datetime
from app.services.email_automation.email_monitor_service import EmailMonitor
import requests


router = APIRouter(prefix="/integrations", tags=["integrations"])

# Google OAuth Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("OAUTH_REDIRECT_URI", "http://localhost:3000/auth/google/callback")

# Combined scopes for both Calendar and Gmail
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
]

SCOPES = {
    "calendar": GOOGLE_SCOPES,
    "gmail": GOOGLE_SCOPES
}

@router.get("/google/auth/{integration_type}")
async def google_oauth_init(
    integration_type: str,
    workspace_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate Google OAuth flow for Calendar or Gmail.
    """
    if integration_type not in ["calendar", "gmail"]:
        raise HTTPException(status_code=400, detail="Invalid integration type")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env"
        )
    
    # Create OAuth flow
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        },
        scopes=SCOPES[integration_type],
        autogenerate_code_verifier=False
    )
    
    flow.redirect_uri = REDIRECT_URI
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=f"{integration_type}:{workspace_id}"  # Embed metadata in state
    )
    
    return {"authorization_url": authorization_url}

@router.get("/google/callback")
async def google_oauth_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback and store tokens.
    """
    try:
        # Parse state
        integration_type, workspace_id = state.split(":")
        
        # Exchange code for tokens
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [REDIRECT_URI]
                }
            },
            scopes=SCOPES[integration_type]
        )
        flow.redirect_uri = REDIRECT_URI
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        # Get user email from Google
        if integration_type == "calendar":
            service = build('calendar', 'v3', credentials=credentials)
            profile = service.calendarList().get(calendarId='primary').execute()
            email = profile.get('id')
        else:  # gmail
            service = build('gmail', 'v1', credentials=credentials)
            profile = service.users().getProfile(userId='me').execute()
            email = profile.get('emailAddress')
        
        # Store in database
        existing = db.query(Integration).filter(
            Integration.workspace_id == workspace_id,
            Integration.integration_type == f"google_{integration_type}"
        ).first()
        
        if existing:
            existing.access_token = credentials.token
            existing.refresh_token = credentials.refresh_token
            existing.token_expiry = credentials.expiry
            existing.connected_email = email
            existing.is_active = True
            existing.updated_at = datetime.utcnow()
        else:
            integration = Integration(
                workspace_id=workspace_id,
                integration_type=f"google_{integration_type}",
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_expiry=credentials.expiry,
                connected_email=email,
                is_active=True
            )
            db.add(integration)
        
        db.commit()
        
        if integration_type == "gmail":
            monitor = EmailMonitor()
            monitor.run_cycle(db)
        
        return {"status": "success", "message": f"Successfully connected {integration_type}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_integration_status(
    workspace_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get connection status for all integrations.
    """
    integrations = db.query(Integration).filter(
        Integration.workspace_id == workspace_id
    ).all()
    
    status = {
        "calendar": {"connected": False, "email": None},
        "gmail": {"connected": False, "email": None},
        "zoho": {"connected": False, "account": None}
    }
    
    for integration in integrations:
        if integration.integration_type == "google_calendar":
            status["calendar"] = {
                "connected": integration.is_active,
                "email": integration.connected_email
            }
        elif integration.integration_type == "google_gmail":
            status["gmail"] = {
                "connected": integration.is_active,
                "email": integration.connected_email
            }
        elif integration.integration_type == "zoho_crm":
            status["zoho"] = {
                "connected": integration.is_active,
                "account": integration.connected_account_id
            }
    
    return status

@router.delete("/disconnect/{integration_type}")
async def disconnect_integration(
    integration_type: str,
    workspace_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect an integration.
    """
    integration = db.query(Integration).filter(
        Integration.workspace_id == workspace_id,
        Integration.integration_type == integration_type
    ).first()
    
    if integration:
        db.delete(integration)
        db.commit()
    
    return {"status": "success", "message": f"Disconnected {integration_type}"}
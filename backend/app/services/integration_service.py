from sqlalchemy.orm import Session
from app.models.integration import Integration
from app.services.platform_settings_service import get_setting
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime
from app.services.email_automation.email_monitor_service import EmailMonitor


# Dynamic settings will be loaded at runtime

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

class IntegrationService:
    @staticmethod
    def get_google_oauth_url(db: Session, workspace_id: str, integration_type: str):
        if integration_type not in ["calendar", "gmail"]:
            raise ValueError("Invalid integration type")

        integration_flags = {
            "gmail": get_setting(db, "enable_gmail_integration", True),
            "calendar": get_setting(db, "enable_calendar_integration", True)
        }

        if not integration_flags.get(integration_type, True):
            raise PermissionError(f"{integration_type.capitalize()} integration disabled by admin")

        from app.services.config_service import config_service
        google_client_id = config_service.get("google_client_id")
        google_client_secret = config_service.get("google_client_secret")
        redirect_uri = config_service.get("google_integration_redirect_uri") or config_service.get("oauth_redirect_uri")

        if not google_client_id or not google_client_secret:
            raise RuntimeError("Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": google_client_id,
                    "client_secret": google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=SCOPES[integration_type],
            autogenerate_code_verifier=False
        )
        
        flow.redirect_uri = redirect_uri
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=f"{integration_type}:{workspace_id}"
        )
        
        return authorization_url

    @staticmethod
    def handle_google_oauth_callback(db: Session, code: str, state: str):
        integration_type, workspace_id = state.split(":")
        
        from app.services.config_service import config_service
        google_client_id = config_service.get("google_client_id")
        google_client_secret = config_service.get("google_client_secret")
        redirect_uri = config_service.get("google_integration_redirect_uri") or config_service.get("oauth_redirect_uri")

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": google_client_id,
                    "client_secret": google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=SCOPES[integration_type]
        )
        flow.redirect_uri = redirect_uri
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        if integration_type == "calendar":
            service = build('calendar', 'v3', credentials=credentials)
            profile = service.calendarList().get(calendarId='primary').execute()
            email = profile.get('id')
        else:
            service = build('gmail', 'v1', credentials=credentials)
            profile = service.users().getProfile(userId='me').execute()
            email = profile.get('emailAddress')
        
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
        
        return integration_type

    @staticmethod
    def get_integration_status(db: Session, workspace_id: str):
        integrations = db.query(Integration).filter(
            Integration.workspace_id == workspace_id
        ).all()
        
        status = {
            "calendar": {"connected": False, "email": None},
            "gmail": {"connected": False, "email": None},
            "zoho": {"connected": False, "account": None},
            "whatsapp": {"connected": False, "phone": None},
            "instagram": {"connected": False, "username": None},
            "twilio": {"connected": False, "phone": None}
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
        
        from app.models.workspace import Workspace
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if ws:
            status["whatsapp"] = {
                "connected": bool(ws.meta_access_token and ws.meta_phone_number_id),
                "phone": ws.meta_display_phone,
                "phone_number_id": ws.meta_phone_number_id,
                "waba_id": ws.meta_waba_id
            }
            status["instagram"] = {
                "connected": bool(ws.meta_ig_id),
                "username": ws.meta_ig_id
            }
            status["twilio"] = {
                "connected": bool(ws.twilio_account_sid and ws.twilio_phone_number),
                "phone": ws.twilio_phone_number
            }
        
        return status

    @staticmethod
    def disconnect_integration(db: Session, workspace_id: str, integration_type: str):
        from app.models.workspace import Workspace
        
        norm_type = integration_type.lower()
        
        if norm_type in ["whatsapp", "google_whatsapp"]:
            ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if ws:
                ws.meta_access_token = None
                ws.meta_business_id = None
                ws.meta_waba_id = None
                ws.meta_phone_number_id = None
                ws.meta_display_phone = None
                db.commit()
                return True
            return False
            
        elif norm_type in ["instagram", "google_instagram"]:
            ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if ws:
                ws.meta_ig_id = None
                db.commit()
                return True
            return False
            
        elif norm_type in ["twilio", "google_twilio"]:
            ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if ws:
                ws.twilio_account_sid = None
                ws.twilio_auth_token = None
                ws.twilio_phone_number = None
                db.commit()
                return True
            return False
            
        else:
            db_type = integration_type
            if norm_type == "gmail":
                db_type = "google_gmail"
            elif norm_type == "calendar":
                db_type = "google_calendar"
            elif norm_type == "zoho":
                db_type = "zoho_crm"
                
            integration = db.query(Integration).filter(
                Integration.workspace_id == workspace_id,
                Integration.integration_type == db_type
            ).first()
            
            if integration:
                db.delete(integration)
                db.commit()
                return True
            return False

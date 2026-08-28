import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.integration import Integration
from app.routers.auth import get_current_user
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from typing import Optional
from google.auth.transport.requests import Request
from app.core.security import verify_workspace_access
from app.schemas.email import (GmailSyncLeadsRequest,      GmailSyncLeadsResponse,)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gmail", tags=["gmail"])

import uuid

def _to_uuid(val):
    if isinstance(val, uuid.UUID):
        return val
    if isinstance(val, str):
        try:
            return uuid.UUID(val)
        except (ValueError, AttributeError):
            return val
    return val

def get_gmail_service(
    workspace_id: str,
    db: Session,
    account_id: str | None = None,
    email: str | None = None
):
    ws_uuid = _to_uuid(workspace_id)
    query = db.query(Integration).filter(
        Integration.workspace_id == ws_uuid,
        Integration.integration_type == "google_gmail",
        Integration.is_active == True
    )

    if account_id:
        query = query.filter(Integration.id == _to_uuid(account_id))
    elif email:
        query = query.filter(Integration.connected_email == email)

    integration = query.first()

    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="Gmail not connected")

    from app.services.config_service import config_service
    creds = Credentials(
        token=integration.access_token,
        refresh_token=integration.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=config_service.get("google_client_id"),
        client_secret=config_service.get("google_client_secret"),
    )

    try:
        # Force refresh if expired
        if not creds.valid:
            if creds.refresh_token:
                creds.refresh(Request())
                integration.access_token = creds.token
                integration.token_expiry = creds.expiry
                db.commit()
            else:
                raise HTTPException(
                    status_code=401,
                    detail="Gmail account disconnected. Please reconnect your Gmail account."
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Gmail token refresh failed for workspace integration id={getattr(integration, 'id', 'unknown')}: {e}")
        raise HTTPException(
            status_code=401,
            detail="Your Gmail session has expired. Please reconnect your Gmail account from Settings."
        )

    return build("gmail", "v1", credentials=creds)




@router.post("/sync-leads", response_model=GmailSyncLeadsResponse)
async def sync_gmail_leads(
    body: Optional[GmailSyncLeadsRequest] = None,
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    ws_uuid = verify_workspace_access(current_user, db, workspace_id)
    payload = body or GmailSyncLeadsRequest()

    from app.services.email_automation.gmail_lead_service import GmailLeadService
    try:
        results = GmailLeadService.sync_leads_from_gmail(
            db=db,
            workspace_id=ws_uuid,
            max_messages=payload.max_messages,
            query=payload.query,
            integration_id=payload.integration_id,
            newer_than_days=payload.newer_than_days
        )
        return results
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except PermissionError as perm_err:
        raise HTTPException(status_code=403, detail=str(perm_err))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Gmail lead synchronization failed. Please try again later.")

@router.get("/import-logs")
async def get_gmail_import_logs(
    workspace_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    ws_uuid = verify_workspace_access(current_user, db, workspace_id)
    from app.models.integration import GmailImportLog

    bounded_limit = max(1, min(limit, 100))
    bounded_offset = max(0, offset)
    query = (
        db.query(GmailImportLog)
        .filter(GmailImportLog.workspace_id == ws_uuid)
        .order_by(GmailImportLog.processed_at.desc())
    )
    total = query.count()
    logs = query.offset(bounded_offset).limit(bounded_limit).all()

    return {
        "total": total,
        "limit": bounded_limit,
        "offset": bounded_offset,
        "logs": [
            {
                "id": str(log.id),
                "gmail_message_id": log.gmail_message_id,
                "integration_id": str(log.integration_id) if log.integration_id else None,
                "processed_at": log.processed_at,
                "status": log.status,
                "error_code": log.error_code,
                "lead_id": str(log.lead_id) if log.lead_id else None,
            }
            for log in logs
        ]
    }


# @router.get("/messages")
# async def get_messages(
#     workspace_id: str,
#     max_results: int = 50,
#     current_user=Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
  
#     try:
#         workspace_id = verify_workspace_access(current_user, db)
#         service = get_gmail_service(workspace_id, db)
        
#         # Get message list
#         results = service.users().messages().list(
#             userId='me',
#             maxResults=max_results
#         ).execute()
        
#         messages = results.get('messages', [])
        
#         # Fetch details for each message
#         detailed_messages = []
#         for msg in messages[:20]:  # Limit to 20 for performance
#             message = service.users().messages().get(
#                 userId='me',
#                 id=msg['id'],
#                 format='metadata',
#                 metadataHeaders=['From', 'To', 'Subject', 'Date']
#             ).execute()
            
#             headers = {h['name']: h['value'] for h in message.get('payload', {}).get('headers', [])}
            
#             detailed_messages.append({
#                 'id': message['id'],
#                 'threadId': message['threadId'],
#                 'from': headers.get('From', 'Unknown'),
#                 'to': headers.get('To', 'Unknown'),
#                 'subject': headers.get('Subject', '(No subject)'),
#                 'date': headers.get('Date', ''),
#                 'snippet': message.get('snippet', '')
#             })
        
#         return {"messages": detailed_messages}
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
    

# @router.get("/messages/{message_id}")
# async def get_message(
#     message_id: str,
#     workspace_id: str,
#     current_user=Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
   
#     try:
#         workspace_id = verify_workspace_access(current_user, db)
#         service = get_gmail_service(workspace_id, db)
        
#         message = service.users().messages().get(
#             userId='me',
#             id=message_id,
#             format='full'
#         ).execute()
        
#         return message
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/send")
# async def send_email(
#     workspace_id: str,
#     to: str,
#     subject: str,
#     body: str,
#     current_user=Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
    
#     try:
#         workspace_id = verify_workspace_access(current_user, db)
#         service = get_gmail_service(workspace_id, db)
        
#         message = MIMEText(body)
#         message['to'] = to
#         message['subject'] = subject
        
#         raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
#         sent_message = service.users().messages().send(
#             userId='me',
#             body={'raw': raw}
#         ).execute()
        
#         return {"status": "success", "message_id": sent_message['id']}
    
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.integration import Integration
from app.routers.auth import get_current_user
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
from email.mime.text import MIMEText

router = APIRouter(prefix="/gmail", tags=["gmail"])

def get_gmail_service(workspace_id: str, db: Session):
    """Get authenticated Gmail service"""
    integration = db.query(Integration).filter(
        Integration.workspace_id == workspace_id,
        Integration.integration_type == "google_gmail"
    ).first()
    
    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="Gmail not connected")
    
    creds = Credentials(
        token=integration.access_token,
        refresh_token=integration.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
    )
    
    return build('gmail', 'v1', credentials=creds)

@router.get("/messages")
async def get_messages(
    workspace_id: str,
    max_results: int = 50,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch Gmail messages"""
    try:
        service = get_gmail_service(workspace_id, db)
        
        # Get message list
        results = service.users().messages().list(
            userId='me',
            maxResults=max_results
        ).execute()
        
        messages = results.get('messages', [])
        
        # Fetch details for each message
        detailed_messages = []
        for msg in messages[:20]:  # Limit to 20 for performance
            message = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='metadata',
                metadataHeaders=['From', 'To', 'Subject', 'Date']
            ).execute()
            
            headers = {h['name']: h['value'] for h in message.get('payload', {}).get('headers', [])}
            
            detailed_messages.append({
                'id': message['id'],
                'threadId': message['threadId'],
                'from': headers.get('From', 'Unknown'),
                'to': headers.get('To', 'Unknown'),
                'subject': headers.get('Subject', '(No subject)'),
                'date': headers.get('Date', ''),
                'snippet': message.get('snippet', '')
            })
        
        return {"messages": detailed_messages}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages/{message_id}")
async def get_message(
    message_id: str,
    workspace_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full message content"""
    try:
        service = get_gmail_service(workspace_id, db)
        
        message = service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()
        
        return message
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_email(
    workspace_id: str,
    to: str,
    subject: str,
    body: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send an email via Gmail"""
    try:
        service = get_gmail_service(workspace_id, db)
        
        message = MIMEText(body)
        message['to'] = to
        message['subject'] = subject
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        sent_message = service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()
        
        return {"status": "success", "message_id": sent_message['id']}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

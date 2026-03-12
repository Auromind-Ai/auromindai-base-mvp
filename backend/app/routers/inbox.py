from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime
from .. import models, schemas, database
from ..models import ChannelType
from app.models.conversation import Conversation
from app.models.message import Message  
from app.routers.auth import get_current_user

router = APIRouter(
    prefix="/inbox",
    tags=["inbox"],
    responses={404: {"description": "Not found"}},
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/conversations", response_model=List[schemas.Conversation])
def read_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    conversations = db.query(models.Conversation).offset(skip).limit(limit).all()
    return conversations

@router.get("/conversations/{conversation_id}/messages", response_model=List[schemas.Message])
def read_messages(conversation_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    messages = db.query(models.Message).filter(models.Message.conversation_id == conversation_id).offset(skip).limit(limit).all()
    return messages


@router.post("/messages", response_model=schemas.Message)
def send_message(
    message: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    conversation = db.query(Conversation).filter(
        Conversation.id == message.conversation_id
    ).first()
    if not conversation:
        conversation = Conversation(
            id=str(message.conversation_id),
            user_id=current_user.id,                 
            contact_name=current_user.full_name or "Unknown",
            workspace_id=current_user.workspace_id,
            channel=ChannelType.WEB,
            external_id="unknown"
        )

        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    db_message = Message(
        conversation_id=conversation.id,
        content=message.content,
        sender_type=message.sender_type
    )

    db.add(db_message)
    db.commit()
    db.refresh(db_message)

    return db_message
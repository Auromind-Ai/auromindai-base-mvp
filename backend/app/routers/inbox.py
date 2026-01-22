from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, database

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
def send_message(message: schemas.MessageCreate, db: Session = Depends(get_db)):
    db_message = models.Message(**message.dict())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

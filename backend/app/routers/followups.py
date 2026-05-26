from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.conversation import Conversation
from app.models.followup import Followup as FollowupModel
from app.models.workspace import WorkspaceMember
from app.routers.auth import get_current_user
from app.schemas import Followup, FollowupCreate, FollowupUpdate
from app.core.security import verify_workspace_access

router = APIRouter(
    prefix="/followups",
    tags=["Followups"]
)


@router.get("/", response_model=List[Followup])
def get_followups(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    return db.query(FollowupModel).join(
        Conversation,
        FollowupModel.conversation_id == Conversation.id,
    ).filter(
        FollowupModel.workspace_id == workspace_id,
        Conversation.workspace_id == workspace_id
    ).all()

@router.post("/",response_model=Followup,status_code=status.HTTP_201_CREATED)
def create_followup(
    followup: FollowupCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    conversation = db.query(Conversation).filter(
        Conversation.id == followup.conversation_id,
        Conversation.workspace_id == workspace_id,
    ).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    new_followup = FollowupModel(
        **followup.model_dump(),
        workspace_id=workspace_id,
    )
    db.add(new_followup)
    db.commit()
    db.refresh(new_followup)
    return new_followup

@router.patch("/{id}", response_model=Followup)
def update_followup(
    id: str,
    followup_update: FollowupUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    followup = db.query(FollowupModel).join(
        Conversation,
        FollowupModel.conversation_id == Conversation.id,
    ).filter(
        FollowupModel.id == id,
        FollowupModel.workspace_id == workspace_id,
        Conversation.workspace_id == workspace_id,
    ).first()
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Followup not found"
        )

    for key, value in followup_update.model_dump(exclude_unset=True).items():
        setattr(followup, key, value)

    db.commit()
    db.refresh(followup)
    return followup



@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_followup(
    id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    workspace_id = verify_workspace_access(current_user, db)
    followup = db.query(FollowupModel).join(
        Conversation,
        FollowupModel.conversation_id == Conversation.id,
    ).filter(
        FollowupModel.id == id,
        FollowupModel.workspace_id == workspace_id,
        Conversation.workspace_id == workspace_id,
    ).first()

    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Followup not found"
        )

    db.delete(followup)
    db.commit()

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact_inquiry import ContactInquiry

router = APIRouter(
    prefix="/inquiries",
    tags=["Admin Inquiries"]
)


class InquiryStatusUpdate(BaseModel):
    status: str  # 'pending', 'contacted', 'completed'


@router.get("")
async def get_all_inquiries(
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    try:
        inquiries = (
            db.query(ContactInquiry)
            .order_by(ContactInquiry.created_at.desc())
            .all()
        )

        return [
            {
                "id": str(item.id),
                "name": item.name,
                "phone": item.phone,
                "email": item.email,
                "company": item.company,
                "budget": item.budget,
                "requirement": item.requirement,
                "status": item.status or "pending",
                "created_at": (
                    item.created_at.isoformat()
                    if item.created_at
                    else None
                ),
            }
            for item in inquiries
        ]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching inquiries: {str(e)}",
        )


@router.patch("/{inquiry_id}/status")
async def update_inquiry_status(
    inquiry_id: str,
    payload: InquiryStatusUpdate,
    db: Session = Depends(get_db),
):
    inquiry = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    inquiry.status = payload.status.strip().lower()
    db.commit()
    db.refresh(inquiry)

    return {
        "status": "success",
        "message": f"Inquiry status updated to {inquiry.status}",
        "data": {
            "id": str(inquiry.id),
            "status": inquiry.status,
        },
    }
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.contact_inquiry import ContactInquiry
from app.schemas.contact_inquiry import ContactInquiryCreate


class ContactService:
    @staticmethod
    def create_inquiry(db: Session, payload: ContactInquiryCreate) -> ContactInquiry:
        inquiry = ContactInquiry(
            name=payload.name.strip(),
            phone=payload.phone.strip(),
            email=payload.email.strip(),
            company=payload.company.strip() if payload.company else "Individual",
            budget=payload.budget.strip() if payload.budget else "Not specified",
            requirement=payload.requirement.strip(),
            status="pending",
        )
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)
        return inquiry

    @staticmethod
    def get_all_inquiries(db: Session, skip: int = 0, limit: int = 50) -> List[ContactInquiry]:
        return (
            db.query(ContactInquiry)
            .order_by(ContactInquiry.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def update_inquiry_status(db: Session, inquiry_id: str, new_status: str) -> Optional[ContactInquiry]:
        inquiry = db.query(ContactInquiry).filter(ContactInquiry.id == inquiry_id).first()
        if not inquiry:
            return None

        inquiry.status = new_status.strip().lower()
        db.commit()
        db.refresh(inquiry)
        return inquiry
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ContactInquiryBase(BaseModel):
    name: str
    phone: str
    email: EmailStr
    company: Optional[str] = None
    budget: Optional[str] = None
    requirement: str
    
class ContactInquiryCreate(ContactInquiryBase):
    pass

class ContactInquiryResponse(ContactInquiryBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
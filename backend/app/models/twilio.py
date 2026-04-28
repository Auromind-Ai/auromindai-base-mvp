
import uuid

from sqlalchemy import UUID, Column, ForeignKey, String

from app.database import Base


class TwilioConfig(Base):
    __tablename__ = "twilio_configs"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID, ForeignKey("workspaces.id"))
    phone_number = Column(String, unique=True, nullable=False)
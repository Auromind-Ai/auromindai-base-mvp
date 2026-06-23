from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    key = Column(String, primary_key=True, index=True)

    value = Column(String, nullable=False)

    value_type = Column(
        String,
        nullable=False,
        default="string"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
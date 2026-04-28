import uuid
from sqlalchemy import UUID, Column, ForeignKey, Integer, String, DateTime, func
from app.database import Base





class SubscriptionHistory(Base):
    __tablename__ = "subscription_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"))
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"))

    old_plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"))
    new_plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"))

    old_price = Column(Integer)  
    new_price = Column(Integer) 

    change_type = Column(String(20))  # upgrade / downgrade / cancel / reactivate

    changed_at = Column(DateTime(timezone=True), server_default=func.now())
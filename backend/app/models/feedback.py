from sqlalchemy import JSON, Column, String, Text, DateTime, func, Float
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Feedback(Base):
    __tablename__ = "rag_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    query = Column(Text, nullable=False)
    rewritten_query = Column(Text, nullable=True)
    selected_tool = Column(String, nullable=True)
    answer = Column(Text, nullable=False)
    feedback = Column(String, nullable=False)
    model = Column(String, nullable=True)
    latency_ms = Column(Float, nullable=True)  
    confidence_score = Column(Float, nullable=True)  
    source = Column(String, nullable=True) 
    session_id = Column(String, nullable=True)
    user_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class LearningData(Base):
    __tablename__ = "learning_data"

    id = Column(UUID(as_uuid=True), primary_key=True)
    data = Column(JSON)
    created_at = Column(DateTime, default=func.now())
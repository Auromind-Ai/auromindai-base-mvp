from app.services.agentic_rag.learning_cache import learning_cache
from app.models.feedback import LearningData

def load_learning_cache(db):
    latest = db.query(LearningData).order_by(LearningData.created_at.desc()).first()

    if latest:
        learning_cache.clear()
        learning_cache.update(latest.data)
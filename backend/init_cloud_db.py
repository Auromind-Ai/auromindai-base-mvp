from app.database import engine, Base
# Import all models to register them with Base
import app.models.user
import app.models.workspace
import app.models.brain
import app.models.conversation
import app.models.message
import app.models.learning_event
import app.models.followup
import app.models.ai_action
import app.models.promise

def init_db():
    print("Creating tables in Cloud Postgres...")
    from sqlalchemy import text
    with engine.connect() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.commit()
        print("Vector extension enabled.")
    
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")

if __name__ == "__main__":
    init_db()

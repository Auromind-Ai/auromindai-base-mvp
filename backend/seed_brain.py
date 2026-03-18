import os
import uuid
from app.database import SessionLocal
from app.services.agentic_rag.rag_service import get_rag_service

def seed_brain():
    db = SessionLocal()
    rag = get_rag_service()
    
    # Check if we have a workspace
    # ideally we fetch one, or create a default "demo-workspace"
    # For MVP we might just use a hardcoded UUID or fetch the first one.
    # Let's try to fetch one.
    from app.models.workspace import Workspace
    workspace = db.query(Workspace).first()
    
    if not workspace:
        print("Creating demo workspace...")
        workspace = Workspace(name="Demo Workspace", slug="demo")
        db.add(workspace)
        db.commit()
    
    print(f"Seeding Brain for workspace: {workspace.name} ({workspace.id})")
    
    # Sample Data: ChatterGlow Plans
    # Designed to test "Compare Basic and Premium"
    
    sample_text = """
    # ChatterGlow Pricing & Features Guide 2024
    
    ## Basic Plan ($29/mo)
    The Basic Plan is perfect for small communities just starting out.
    - **Voice Channels**: Up to 5 active voice channels.
    - **Audio Quality**: Standard 64kbps audio.
    - **Recording**: Not included.
    - **Support**: Email support only.
    - **Integrations**: Basic Discord bot integration.
    
    ## Premium Plan ($99/mo)
    The Premium Plan is designed for growing businesses and creators.
    - **Voice Channels**: Unlimited voice channels.
    - **Audio Quality**: HD 320kbps Crystal Clear audio.
    - **Recording**: 24/7 Cloud recording with auto-transcription.
    - **Support**: 24/7 Live Chat & Priority Email.
    - **Integrations**: Slack, Discord, Zapier, and API access.
    - **Analytics**: Advanced user engagement dashboard.
    
    ## Enterprise Plan (Custom)
    For large organizations requiring SSO and dedicated servers.
    - **Security**: SOC2 Type II compliance and SSO.
    - **Infrastructure**: Dedicated private voice servers.
    """
    
    try:
        result = rag.ingest_document(
            db=db,
            workspace_id=str(workspace.id),
            text=sample_text,
            title="ChatterGlow Pricing 2024",
            content_type="manual",
            source="seed_script"
        )
        print(f"✅ Successfully seeded: {result['title']}")
        print(f"Chunks created: {result['chunks_created']}")
    except Exception as e:
        print(f"❌ Error seeding brain: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_brain()

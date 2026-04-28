import os
import uuid
from app.database import SessionLocal

from app.services.agentic_rag.ingestion_layer import IngestionLayer
from app.services.agentic_rag.vector_store_service import VectorStoreService


def seed_ztorespot():
    db = SessionLocal()

    # ✅ NEW INIT
    vector_store = VectorStoreService()
    ingestion = IngestionLayer(vector_store=vector_store)

    # Workspace check
    from app.models.workspace import Workspace
    workspace = db.query(Workspace).first()

    if not workspace:
        print("Creating demo workspace...")
        workspace = Workspace(name="Demo Workspace", slug="demo")
        db.add(workspace)
        db.commit()

    print(f"Seeding Ztorespot Data for workspace: {workspace.id}")

    ztorespot_text = """
    # Ztorespot: The Simplest E-Commerce Platform
    No Extra Apps. Secure Login 100%. No-Code. 0₹ Fees. 2min Setup.
    
    ## Why Ztorespot Is Better
    - Investment: 20% compared to others.
    - Time to Complete: 2 min (vs 5-10 days on others).
    - Ease of Use: +94% better.
    - Features: No Drag & Drop, No Technical Skills needed. WhatsApp Notification enabled.
    
    ## Pricing Plans (Yearly Save up to 67%)
    
    ### Welcome Plan (₹999 / 1 Year)
    - 1 Online Store, 30 Products, 10 Categories.
    - Unlimited Orders, Unlimited Customers.
    - 5 Blog limits, 10 Page Limits, 10 Discount Limits.
    - Advanced Reports, Push Notification Updates.
    - Cash on Delivery, QR Code, UPI Payment, Offline Payment.
    - Free Hosting.
    
    ### Starter Plan (₹1,699 / 1 Year)
    - 1 Online Store, 75 Products, 25 Categories.
    - 25 Blog limits, 15 Page Limits, 25 Discount Limits.
    - 1 Staff account.
    - 100 Product Individual Reports.
    - No Inventory management.
    - Bulk Product Upload, Custom JS.
    - Phonepe Payment Options, Bank Transfer Integrations.
    
    ### Intermediate Plan (₹2,000 / 1 Year - 33% OFF)
    - 1 Online Store, 350 Products, 100 Categories.
    - Unlimited Blogs, 50 Discount Limits.
    - 03 Staff accounts.
    - Inventory management included.
    - 500 Product Individual Reports.
    - File Manager access.
    - Razorpay & Phonepe Gateway Integrations.
    - 3 Months WhatsApp Support.
    
    ### Professional Plan (₹3,421 / 1 Year - 27% OFF)
    - Custom domain Mapping.
    - 1 Online Store, 750 Products, 150 Categories.
    - Unlimited Blogs, Unlimited Pages.
    - 05 Staff accounts.
    - Push Notification Updates.
    - File Manager access, Inventory management.
    - Bulk Product Upload.
    - 3 Months WhatsApp Support.
    
    ## Contact
    1Milestone Technology Solution Private Limited
    Needamangalam, Tamil Nadu - 614404
    """

    try:
        # ✅ NEW INGEST CALL
        result = ingestion.ingest_document(
            db=db,
            workspace_id=str(workspace.id),
            text=ztorespot_text,
            title="Ztorespot Pricing 2025",
            content_type="manual",
            source="user_request"
        )
        print(f"Successfully seeded: {result['title']}")
        print(f"Chunks created: {result['chunks_created']}")

    except Exception as e:
        print(f"❌ Error seeding brain: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_ztorespot()
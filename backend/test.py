from app.database import SessionLocal
from app import models
import requests

db = SessionLocal()

workspace_id = "abd4dda2-971d-4e2c-a1ac-aacd960d5dcc"

workspace = db.query(models.Workspace).filter(
    models.Workspace.id == workspace_id
).first()

# ── SAFETY CHECK ─────────────────────────────────────────
if not workspace:
    print("Workspace not found")
    exit()

if not workspace.meta_business_id:
    print("PAGE ID missing in DB")
    exit()

if not workspace.meta_access_token:
    print("ACCESS TOKEN missing in DB")
    exit()

# ── DEBUG PRINT ─────────────────────────────────────────
print("✅ PAGE ID:", workspace.meta_business_id)
print("✅ IG ID:", workspace.meta_ig_id)
print("✅ TOKEN (first 20 chars):", workspace.meta_access_token[:20])

page_id = workspace.meta_business_id
token = workspace.meta_access_token

# ── SUBSCRIBE APP TO PAGE ───────────────────────────────
res = requests.post(
    f"https://graph.facebook.com/v19.0/{page_id}/subscribed_apps",
    data={
        "access_token": token,
        "subscribed_fields": "messages,messaging_postbacks"
    }
)

print("📡 RESPONSE:", res.json())

# ── SUCCESS CHECK ───────────────────────────────────────
if res.json().get("success"):
    print("🎉 SUCCESS: Webhook subscribed correctly!")
else:
    print("❌ FAILED: Check error above")
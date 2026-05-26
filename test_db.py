import sys
import os
from dotenv import load_dotenv
load_dotenv("backend/.env")

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/backend")
from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.subscription import Subscription
from app.models.plan import Plan

db = SessionLocal()
plans = db.query(Plan).all()
for p in plans:
    print(f"Plan: {p.name}, Limit: {p.token_limit}")

ws = db.query(Workspace).first()
if ws:
    print(f"Workspace: {ws.name}, plan_type: {ws.plan_type}, overage_enabled: {ws.overage_enabled}, payment_method: {ws.provider_customer_id}")
    subs = db.query(Subscription).filter(Subscription.workspace_id == ws.id).all()
    for s in subs:
        p = db.query(Plan).filter(Plan.id == s.plan_id).first()
        print(f"Sub: {s.id}, status: {s.status}, plan: {p.name}")
else:
    print("No workspaces found")

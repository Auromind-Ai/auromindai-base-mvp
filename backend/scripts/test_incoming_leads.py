#!/usr/bin/env python3
"""
Test script: Simulates 5 incoming customer messages (3 Instagram, 2 WhatsApp)
to verify behavior when the workspace lead storage is at 1000/1000 capacity.
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.ai_action import Lead
from app.models.conversation import Conversation, ChannelType
from app.models.message import Message
from app.services.inbox.webhook_service import WebhookService
from app.services.billing.entitlement_service import EntitlementService

TEST_CUSTOMERS = [
    {
        "name": "Kavya Sundar",
        "channel": ChannelType.INSTAGRAM,
        "external_id": f"ig_test_{uuid.uuid4().hex[:8]}",
        "phone": None,
        "body": "Hi! I saw your Instagram post about AI automation. Can you share the pricing details for my boutique store?",
        "provider": "instagram",
    },
    {
        "name": "Siddharth Malhotra",
        "channel": ChannelType.WHATSAPP,
        "external_id": None,
        "phone": "919840112233",
        "body": "Hello Auromind team, I need an automated WhatsApp lead qualification bot for our real estate firm.",
        "provider": "whatsapp",
    },
    {
        "name": "Aarthi Rajendran",
        "channel": ChannelType.INSTAGRAM,
        "external_id": f"ig_test_{uuid.uuid4().hex[:8]}",
        "phone": None,
        "body": "Hey! Do you support multi-agent workflows for customer support? We get 200+ DMs daily.",
        "provider": "instagram",
    },
    {
        "name": "Venkatesh Prasad",
        "channel": ChannelType.WHATSAPP,
        "external_id": None,
        "phone": "919790223344",
        "body": "Good afternoon. We are looking for enterprise CRM integration for 10 sales agents. Please schedule a demo.",
        "provider": "whatsapp",
    },
    {
        "name": "Pooja Hegde",
        "channel": ChannelType.INSTAGRAM,
        "external_id": f"ig_test_{uuid.uuid4().hex[:8]}",
        "phone": None,
        "body": "Hi team! Is there a free trial for the Creator plan? Wanted to test the flow automation.",
        "provider": "instagram",
    },
]

async def run_test():
    db = SessionLocal()
    target_ws_id = "0199b611-978d-4409-b65c-0a7652e623c7"
    
    try:
        ws = db.query(Workspace).filter(Workspace.id == target_ws_id).first()
        print(f"[*] Testing with workspace: {ws.name} ({ws.id})")
        
        # 1. Check entitlement status before test
        lead_ent = EntitlementService.check_entitlement(db, ws.id, "lead")
        initial_lead_count = db.query(Lead).filter(Lead.workspace_id == ws.id).count()
        print(f"[*] Initial Lead Count: {initial_lead_count}")
        print(f"[*] Lead Entitlement check before sending: allowed={lead_ent['allowed']}, limit={lead_ent['limit']}, current={lead_ent['current']}")
        
        # 2. Simulate 5 incoming customer messages via WebhookService
        print("\n" + "=" * 65)
        print("  SIMULATING 5 REAL INCOMING MESSAGES (3 INSTAGRAM, 2 WHATSAPP)")
        print("=" * 65)
        
        new_lead_ids = []
        for idx, cust in enumerate(TEST_CUSTOMERS, 1):
            print(f"\n[Test User {idx}] {cust['name']} sending on {cust['channel'].value}...")
            print(f"  Content: \"{cust['body']}\"")
            
            res = await WebhookService.process_incoming_message(
                db,
                workspace_id=str(ws.id),
                channel=cust["channel"],
                body=cust["body"],
                phone=cust["phone"],
                external_id=cust["external_id"],
                message_external_id=f"msg_ext_{uuid.uuid4().hex[:12]}",
                contact_name=cust["name"],
                metadata={"provider": cust["provider"]},
            )
            print(f"  Result: {res}")
            
            # Find the newly created/updated lead
            conv = db.query(Conversation).filter(
                Conversation.workspace_id == ws.id,
                Conversation.contact_name == cust["name"],
            ).first()
            if conv:
                lead = db.query(Lead).filter(Lead.conversation_id == conv.id).first()
                if lead:
                    new_lead_ids.append(lead.id)
                    print(f"  ✅ Lead created in CRM! ID: {lead.id} | Source: {lead.source} | Name: {lead.name} | Status: {lead.status}")
                else:
                    print(f"  ⚠️ Conversation created but no Lead record found!")
            else:
                print(f"  ❌ Conversation not found!")

        # 3. Check final lead count
        final_lead_count = db.query(Lead).filter(Lead.workspace_id == ws.id).count()
        print("\n" + "=" * 65)
        print(f"[*] Initial Lead Count: {initial_lead_count}")
        print(f"[*] Final Lead Count:   {final_lead_count}")
        print(f"[*] Net Leads Added:    +{final_lead_count - initial_lead_count}")
        print("=" * 65)
        
        # 4. Check manual lead creation rejection
        print("\n[*] Testing manual lead creation via EntitlementService:")
        manual_check = EntitlementService.check_entitlement(db, ws.id, "lead")
        print(f"  Manual Add Lead Allowed: {manual_check['allowed']}")
        print(f"  Reason: {manual_check['reason']}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_test())

import sys
import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.conversation import Conversation, ConversationStatus, ChannelType
from app.models.message import Message, SenderType, MessageStatus
from app.models.ai_action import Lead
from app.services.inbox.conversation_service import ConversationService


def seed_open_window_chats(target_workspace_id: str | None = None):
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        print(f"[*] Current UTC Time: {now.isoformat()}")

        query = db.query(Workspace)
        if target_workspace_id:
            try:
                ws_uuid = uuid.UUID(target_workspace_id)
            except ValueError:
                ws_uuid = target_workspace_id
            query = query.filter(Workspace.id == ws_uuid)

        workspaces = query.all()
        if not workspaces:
            print("[!] No workspaces found.")
            return

        print(f"[*] Seeding open window chats across {len(workspaces)} workspace(s)...")

        for ws in workspaces:
            print(f"\n==========================================")
            print(f"Workspace: {ws.name} ({ws.id})")
            print(f"==========================================")

            # Define the 2 open window conversations with recent customer messages
            open_window_configs = [
                {
                    "name": "Karthik Raja",
                    "phone": "+919840112345",
                    "lead_tier": "warm",
                    "user_msg_offset": timedelta(hours=1, minutes=20),
                    "agent_msg_offset": timedelta(hours=2),
                    "agent_content": "Hello Karthik! Welcome to Orbion. Are you looking for automated lead qualification or customer support solutions?",
                    "user_content": "Hi, I am interested in your AI automated lead qualification service. Can you share the pricing details?",
                },
                {
                    "name": "Deepika Sundaram",
                    "phone": "+919840445678",
                    "lead_tier": "hot",
                    "user_msg_offset": timedelta(hours=3, minutes=15),
                    "agent_msg_offset": timedelta(hours=4),
                    "agent_content": "Hi Deepika! Thanks for reaching out. We received your inquiry regarding our WhatsApp automation.",
                    "user_content": "Could you please send me a demo video or schedule a quick onboarding call today?",
                },
            ]

            target_phones = [cfg["phone"] for cfg in open_window_configs]

            # 1. Close or expire any OTHER WhatsApp conversations in this workspace
            # so that ONLY these 2 chats have their 24h window open!
            other_wa_convs = (
                db.query(Conversation)
                .filter(
                    Conversation.workspace_id == ws.id,
                    Conversation.channel == ChannelType.WHATSAPP,
                    Conversation.phone.notin_(target_phones),
                )
                .all()
            )

            for other in other_wa_convs:
                if other.status == ConversationStatus.OPEN:
                    other.status = ConversationStatus.FOLLOW_UP
                    other.closed_at = now - timedelta(days=2)
                # Ensure messages are older than 24 hours so window is strictly closed
                msgs = (
                    db.query(Message)
                    .filter(Message.conversation_id == other.id)
                    .all()
                )
                for m in msgs:
                    m_ts = m.timestamp
                    if m_ts.tzinfo is None:
                        m_ts = m_ts.replace(tzinfo=timezone.utc)
                    if m_ts > (now - timedelta(hours=25)):
                        # Push back older than 24 hours
                        m.timestamp = now - timedelta(days=2)

                # Also update lead if exists
                lead = db.query(Lead).filter(Lead.conversation_id == other.id).first()
                if lead and lead.status == "open":
                    lead.status = "follow_up"
                    lead.lead_tier = "inactive"

            print(f"  [-] Ensured {len(other_wa_convs)} other WhatsApp conversation(s) have closed/expired windows.")

            # 2. Seed/Update the 2 target open window chats
            for cfg in open_window_configs:
                phone = cfg["phone"]
                name = cfg["name"]
                user_msg_time = now - cfg["user_msg_offset"]
                agent_msg_time = now - cfg["agent_msg_offset"]

                conv = (
                    db.query(Conversation)
                    .filter(
                        Conversation.workspace_id == ws.id,
                        Conversation.phone == phone,
                        Conversation.channel == ChannelType.WHATSAPP,
                    )
                    .first()
                )

                if not conv:
                    conv = Conversation(
                        id=uuid.uuid4(),
                        workspace_id=ws.id,
                        phone=phone,
                        channel=ChannelType.WHATSAPP,
                        contact_name=name,
                        status=ConversationStatus.OPEN,
                        created_at=agent_msg_time,
                        updated_at=user_msg_time,
                        last_message_at=user_msg_time,
                    )
                    db.add(conv)
                    db.flush()
                    print(f"  [+] Created new conversation for {name} ({phone})")
                else:
                    conv.status = ConversationStatus.OPEN
                    conv.contact_name = name
                    conv.updated_at = user_msg_time
                    conv.last_message_at = user_msg_time
                    conv.closed_at = None
                    print(f"  [*] Updated existing conversation for {name} ({phone}) to OPEN")

                # Remove existing messages to avoid duplicates/stale timestamps
                db.query(Message).filter(Message.conversation_id == conv.id).delete()

                # Add Agent / AI initial greeting message
                agent_msg = Message(
                    id=uuid.uuid4(),
                    conversation_id=conv.id,
                    content=cfg["agent_content"],
                    sender_type=SenderType.AI,
                    status=MessageStatus.DELIVERED,
                    timestamp=agent_msg_time,
                    is_read=True,
                    external_id=f"wamid_seed_agent_{conv.id}_{int(agent_msg_time.timestamp())}",
                )
                db.add(agent_msg)

                # Add Customer / User inbound message (Customer message received!)
                user_msg = Message(
                    id=uuid.uuid4(),
                    conversation_id=conv.id,
                    content=cfg["user_content"],
                    sender_type=SenderType.USER,
                    status=MessageStatus.RECEIVED,
                    timestamp=user_msg_time,
                    is_read=False,
                    external_id=f"wamid_seed_user_{conv.id}_{int(user_msg_time.timestamp())}",
                )
                db.add(user_msg)

                # Seed/Update Lead record
                lead = db.query(Lead).filter(Lead.conversation_id == conv.id).first()
                if not lead:
                    lead = (
                        db.query(Lead)
                        .filter(
                            Lead.workspace_id == ws.id,
                            Lead.phone == phone,
                        )
                        .first()
                    )

                if lead:
                    lead.conversation_id = conv.id
                    lead.name = name
                    lead.status = "open"
                    lead.lead_tier = cfg["lead_tier"]
                    lead.is_converted = False
                    lead.last_user_message_at = user_msg_time
                    lead.last_activity_at = user_msg_time
                    lead.updated_at = user_msg_time
                else:
                    lead = Lead(
                        id=uuid.uuid4(),
                        workspace_id=ws.id,
                        conversation_id=conv.id,
                        name=name,
                        phone=phone,
                        status="open",
                        lead_tier=cfg["lead_tier"],
                        is_converted=False,
                        last_user_message_at=user_msg_time,
                        last_activity_at=user_msg_time,
                        created_at=agent_msg_time,
                        updated_at=user_msg_time,
                    )
                    db.add(lead)

                remaining_seconds = 86400 - (now - user_msg_time).total_seconds()
                rem_hours = int(remaining_seconds // 3600)
                rem_mins = int((remaining_seconds % 3600) // 60)
                print(
                    f"  [✓] {name} ({phone}): Window OPEN! Customer message received {cfg['user_msg_offset']}. Window remaining: {rem_hours}h {rem_mins}m"
                )

        db.commit()
        print("\n[✓] Successfully committed all changes to database!")

        # Verify auto_close_expired_conversations leaves exactly these 2 open
        for ws in workspaces:
            closed_count = ConversationService.auto_close_expired_conversations(db, workspace_id=ws.id)
            open_convs = (
                db.query(Conversation)
                .filter(
                    Conversation.workspace_id == ws.id,
                    Conversation.channel == ChannelType.WHATSAPP,
                    Conversation.status == ConversationStatus.OPEN,
                )
                .all()
            )
            print(f"[*] Workspace {ws.name}: Open WhatsApp conversations count = {len(open_convs)}")
            for oc in open_convs:
                print(f"      - {oc.contact_name} ({oc.phone})")

    except Exception as exc:
        db.rollback()
        print(f"[x] Error during seeding: {exc}", file=sys.stderr)
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    target_ws = sys.argv[1] if len(sys.argv) > 1 else None
    seed_open_window_chats(target_ws)

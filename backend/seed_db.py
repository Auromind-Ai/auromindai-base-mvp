from app.database import SessionLocal, engine
from app.models import Base, Conversation, Message, ChannelType, SenderType, ConversationStatus
from datetime import datetime, timedelta

def seed_data():
    db = SessionLocal()
    
    # Check if data exists
    if db.query(Conversation).count() > 0:
        print("Data already exists, skipping seed.")
        return

    print("Seeding demo data...")

    # 1. WhatsApp Conversation
    conv1 = Conversation(
        channel=ChannelType.WHATSAPP,
        external_id="+919876543210",
        contact_name="Aarav Patel",
        status=ConversationStatus.OPEN
    )
    db.add(conv1)
    db.commit()

    msg1 = Message(conversation_id=conv1.id, content="Hi, I saw your ad on Instagram. What is the pricing?", sender_type=SenderType.USER, timestamp=datetime.now() - timedelta(minutes=15))
    msg2 = Message(conversation_id=conv1.id, content="Hello Aarav! Thanks for reaching out. We have 3 tiers starting from ₹4,100/mo. Would you like to see the comparison?", sender_type=SenderType.AI, timestamp=datetime.now() - timedelta(minutes=14))
    msg3 = Message(conversation_id=conv1.id, content="Yes please. Do you have a trial?", sender_type=SenderType.USER, timestamp=datetime.now() - timedelta(minutes=2))
    
    db.add_all([msg1, msg2, msg3])

    # 2. Instagram Conversation
    conv2 = Conversation(
        channel=ChannelType.INSTAGRAM,
        external_id="style_by_priya",
        contact_name="Priya Singh",
        status=ConversationStatus.OPEN
    )
    db.add(conv2)
    db.commit()

    msg4 = Message(conversation_id=conv2.id, content="Collab?", sender_type=SenderType.USER, timestamp=datetime.now() - timedelta(hours=2))
    msg5 = Message(conversation_id=conv2.id, content="Hi Priya, thanks for your interest! Could you send us your media kit?", sender_type=SenderType.AI, timestamp=datetime.now() - timedelta(hours=1, minutes=55))

    db.add_all([msg4, msg5])

    # 3. Web Chat
    conv3 = Conversation(
        channel=ChannelType.WEB,
        external_id="visitor_123",
        contact_name="Visitor #492",
        status=ConversationStatus.CLOSED
    )
    db.add(conv3)

    db.commit()
    print("Demo data seeded!")
    db.close()

if __name__ == "__main__":
    seed_data()

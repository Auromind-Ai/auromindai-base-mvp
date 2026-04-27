import uuid
from app.database import SessionLocal
from app.models.templates import Template

db = SessionLocal()

templates = [
    {
        "name": "order_confirmation",
        "type": "TEXT",
        "content": "Hi {{1}}, your order {{2}} is confirmed 🎉"
    },
    {
        "name": "delivery_update",
        "type": "TEXT",
        "content": "Hey {{1}}, your order will arrive in {{2}} 🚚"
    },
    {
        "name": "payment_reminder",
        "type": "TEXT",
        "content": "Hi {{1}}, your payment of ₹{{2}} is pending"
    },
    {
        "name": "welcome_message",
        "type": "TEXT",
        "content": "Welcome {{1}}! Thanks for joining us 🙌"
    },
    {
        "name": "offer_alert",
        "type": "TEXT",
        "content": "🔥 Special offer! Get {{1}}% OFF today!"
    },
    {
        "name": "cart_abandon",
        "type": "TEXT",
        "content": "Hi {{1}}, your cart is waiting 🛒 Complete now!"
    },
    {
        "name": "appointment_reminder",
        "type": "TEXT",
        "content": "Reminder {{1}}: Your appointment is at {{2}}"
    },
    {
        "name": "feedback_request",
        "type": "TEXT",
        "content": "Hi {{1}}, please share your feedback ⭐"
    },
    {
        "name": "festival_offer",
        "type": "TEXT",
        "content": "🎉 Happy Festival {{1}}! Enjoy {{2}}% OFF"
    },
    {
        "name": "subscription_expiry",
        "type": "TEXT",
        "content": "Hi {{1}}, your plan expires on {{2}}"
    },
]

# duplicate to reach 20
templates = templates * 2  

for t in templates:
    new_template = Template(
        id=uuid.uuid4(),
        name=t["name"],
        type=t["type"],
        content=t["content"],
        status="approved"  # testingக்கு approved வைச்சிருக்கோம்
    )
    db.add(new_template)

db.commit()
db.close()

print("✅ 20 templates seeded successfully")
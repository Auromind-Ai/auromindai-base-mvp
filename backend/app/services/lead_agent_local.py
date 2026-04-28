# LOCAL MEMORY STORE
from datetime import datetime

conversations = {}


def lead_agent_local(user_id, message):

    #INIT USER
    if user_id not in conversations:
        conversations[user_id] = {
            "stage": "new",
            "data": {},
            "messages": []
        }

    state = conversations[user_id]
    stage = state["stage"]
    data = state["data"]

    # SAVE USER MESSAGE
    state["messages"].append({
        "id": str(len(state["messages"])),
        "sender_type": "USER",
        "content": message,
        "timestamp": datetime.utcnow().isoformat()
    })

   
    #FLOW LOGIC
    #  Welcome
    if stage == "new":
        reply = "👋 Welcome! What's your name?"
        state["stage"] = "asked_name"

    #  Name
    elif stage == "asked_name":
        data["name"] = message
        reply = "📱 Please share your mobile number"
        state["stage"] = "asked_phone"

    # Phone
    elif stage == "asked_phone":
        data["phone"] = message
        reply = "💼 What service do you need?"
        state["stage"] = "asked_requirement"

    # Requirement
    elif stage == "asked_requirement":
        data["requirement"] = message
        state["stage"] = "completed"

        reply = (
            "Thanks! We will contact you soon.\n\n"
            "📌 Your Details:\n"
            f"Name: {data['name']}\n"
            f"Phone: {data['phone']}\n"
            f"Need: {data['requirement']}"
        )

    #Already completed
    else:
        reply = "👋 Already received your details. We'll contact you soon!"

    # SAVE BOT MESSAGE
    state["messages"].append({
        "id": str(len(state["messages"])),
        "sender_type": "AGENT",
        "content": reply,
        "timestamp": datetime.utcnow().isoformat()
    })

    return reply



def get_all_conversations():
    result = []

    for user_id, data in conversations.items():
        result.append({
            "id": user_id,
            "phone": user_id,
            "channel": "instagram",
            "status": data["stage"]
        })

    return result



def get_messages(user_id):
    if user_id not in conversations:
        return []

    return conversations[user_id]["messages"]
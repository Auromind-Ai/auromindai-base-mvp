# test_full_ai_pipeline.py

import asyncio
from sqlalchemy.orm import Session

from app.database import SessionLocal

from app.services.flow_ai_reply_handler import execute_ai_reply


async def run_tests():

    db: Session = SessionLocal()

    from app.models.workspace import Workspace
    workspace = db.query(Workspace).first()
    if not workspace:
        print("No workspace found in the database. Please run setup first.")
        return
    workspace_id = str(workspace.id)
    conversation_id = "22222222-2222-2222-2222-222222222222"

    print("\nCleaning up previous test data...")
    from app.models import Conversation, ConversationState, Lead, Message
    from app.models.conversation import ChannelType, ConversationStatus
    clean_phone = "+919999999999"

    # Find user_id before deleting anything
    test_user_id = None
    conv = db.query(Conversation).filter(
        (Conversation.id == conversation_id) | (Conversation.phone == clean_phone)
    ).first()
    if conv and conv.user_id:
        test_user_id = conv.user_id

    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.query(Conversation).filter(Conversation.id == conversation_id).delete()
    db.query(Conversation).filter(Conversation.phone == clean_phone).delete()

    if test_user_id:
        db.query(ConversationState).filter_by(user_id=test_user_id).delete()
        db.query(Lead).filter_by(user_id=test_user_id).delete()

    db.commit()

    # Create persistent mock Conversation for stateful memory testing
    test_conv = Conversation(
        id=conversation_id,
        phone=clean_phone,
        workspace_id=workspace_id,
        channel=ChannelType.TWILIO,
        status=ConversationStatus.OPEN
    )
    db.add(test_conv)
    db.commit()

    print("\n==============================")
    print("FULL AI PIPELINE TEST")
    print("==============================\n")

    # ==========================================
    # TEST 1 — LEAD AGENT
    # ==========================================

    print("\n[TEST 1] LEAD AGENT\n")

    lead_result = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "Hi I need AI chatbot for my real estate company"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "lead_agent",

            "business_type": "real_estate",

            "lead_fields": [
                "name",
                "company_name",
                "budget",
                "timeline",
                "property_type"
            ],

            "calendar_enabled": True
        }
    )

    print("LEAD RESULT:")
    print(lead_result)

    # ==========================================
    # TEST 1B — LEAD AGENT CONTINUATION (NAME PROVIDED)
    # ==========================================

    print("\n[TEST 1B] LEAD AGENT CONTINUATION (NAME PROVIDED)\n")

    lead_result_1b = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "My name is Veera"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "lead_agent",

            "business_type": "real_estate",

            "lead_fields": [
                "name",
                "company_name",
                "budget",
                "timeline",
                "property_type"
            ],

            "calendar_enabled": True
        }
    )

    print("LEAD RESULT 1B:")
    print(lead_result_1b)

    # ==========================================
    # TEST 1C — LEAD AGENT CONTINUATION (COMPANY NAME PROVIDED)
    # ==========================================

    print("\n[TEST 1C] LEAD AGENT CONTINUATION (COMPANY NAME PROVIDED)\n")

    lead_result_1c = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "Our company name is VeeraTech"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "lead_agent",

            "business_type": "real_estate",

            "lead_fields": [
                "name",
                "company_name",
                "budget",
                "timeline",
                "property_type"
            ],

            "calendar_enabled": True
        }
    )

    print("LEAD RESULT 1C:")
    print(lead_result_1c)

    # ==========================================
    # TEST 1D — LEAD AGENT COMPLETION OVERRIDE (DEMO DISABLED)
    # ==========================================

    print("\n[TEST 1D] LEAD AGENT COMPLETION OVERRIDE (DEMO DISABLED)\n")

    # Refresh test_conv to get the user_id that was dynamically created
    db.refresh(test_conv)
    test_user_id = test_conv.user_id
    from app.services.inbox_agents.memory_service import MemoryService
    memory = MemoryService(db)

    if test_user_id:
        memory.update_lead_data(
            test_user_id,
            {
                "name": "Veera",
                "company_name": "VeeraTech",
                "budget": "$10k",
                "timeline": "1 month",
                "property_type": "apartment"
            }
        )
        print("Pre-filled all lead fields in the DB for user:", test_user_id)

    lead_result_1d = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "Hello again, just checking in"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "lead_agent",
            "business_type": "real_estate",
            "lead_fields": [
                "name",
                "company_name",
                "budget",
                "timeline",
                "property_type"
            ],
            "calendar_enabled": False
        }
    )

    print("LEAD RESULT 1D:")
    print(lead_result_1d)

    # ==========================================
    # TEST 1E — LEAD AGENT COMPLETION (DEMO ENABLED — AGREE TO BOOK)
    # ==========================================

    print("\n[TEST 1E] LEAD AGENT COMPLETION (DEMO ENABLED — AGREE TO BOOK)\n")

    # Reset state to active AI session and stage back to lead
    if test_user_id:
        db.query(Message).filter(Message.conversation_id == conversation_id).delete()
        
        from app.models.message import SenderType, MessageStatus
        messages = [
            Message(conversation_id=conversation_id, content="Hi I need AI chatbot for my real estate company", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Hi, thanks for reaching out! What's your name?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="My name is Veera", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Hi Veera, nice to meet you! What company are you from?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="Our company name is VeeraTech", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Hi Veera, thanks for sharing your company name with me! It's VeeraTech. What's your company's budget?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="Our budget is $10k", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Got it, $10k. What is your timeline?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="1 month", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="And what property type?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="apartment", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Thanks for confirming, Veera! I've got all the details. Would you like to schedule a demo?", sender_type=SenderType.AI, status=MessageStatus.SENT),
        ]
        db.add_all(messages)

        from app.models.flow_execution import FlowExecutionState
        state = db.query(FlowExecutionState).filter_by(conversation_id=conversation_id).first()
        if state:
            state.runtime_context = state.runtime_context or {}
            state.runtime_context["active_ai_session"] = True
            state.runtime_context["assigned_agent"] = "lead_agent"
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(state, "runtime_context")
            db.add(state)
        memory.update_conversation_state(test_user_id, {"current_stage": "lead"})
        db.commit()

    lead_result_1e = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "Yes, I want a demo"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "lead_agent",
            "business_type": "real_estate",
            "lead_fields": [
                "name",
                "company_name",
                "budget",
                "timeline",
                "property_type"
            ],
            "calendar_enabled": True
        }
    )

    print("LEAD RESULT 1E:")
    print(lead_result_1e)

    # ==========================================
    # TEST 1F — LEAD AGENT COMPLETION (DEMO ENABLED — DECLINING)
    # ==========================================

    print("\n[TEST 1F] LEAD AGENT COMPLETION (DEMO ENABLED — DECLINING)\n")

    # Reset state to active AI session, stage back to lead, and insert mock history context
    if test_user_id:
        db.query(Message).filter(Message.conversation_id == conversation_id).delete()
        
        from app.models.message import SenderType, MessageStatus
        messages = [
            Message(conversation_id=conversation_id, content="Hi I need AI chatbot for my real estate company", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Hi, thanks for reaching out! What's your name?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="My name is Veera", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Hi Veera, nice to meet you! What company are you from?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="Our company name is VeeraTech", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Hi Veera, thanks for sharing your company name with me! It's VeeraTech. What's your company's budget?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="Our budget is $10k", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Got it, $10k. What is your timeline?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="1 month", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="And what property type?", sender_type=SenderType.AI, status=MessageStatus.SENT),
            Message(conversation_id=conversation_id, content="apartment", sender_type=SenderType.USER, status=MessageStatus.RECEIVED),
            Message(conversation_id=conversation_id, content="Thanks for confirming, Veera! I've got all the details. Would you like to schedule a demo?", sender_type=SenderType.AI, status=MessageStatus.SENT),
        ]
        db.add_all(messages)

        from app.models.flow_execution import FlowExecutionState
        state = db.query(FlowExecutionState).filter_by(conversation_id=conversation_id).first()
        if state:
            state.runtime_context = state.runtime_context or {}
            state.runtime_context["active_ai_session"] = True
            state.runtime_context["assigned_agent"] = "lead_agent"
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(state, "runtime_context")
            db.add(state)
        memory.update_conversation_state(test_user_id, {"current_stage": "lead"})
        db.commit()

    lead_result_1f = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "No, I don't want a demo meeting"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "lead_agent",
            "business_type": "real_estate",
            "lead_fields": [
                "name",
                "company_name",
                "budget",
                "timeline",
                "property_type"
            ],
            "calendar_enabled": True
        }
    )

    print("LEAD RESULT 1F:")
    print(lead_result_1f)

    # ==========================================
    # TEST 2 — SALES AGENT
    # ==========================================

    print("\n[TEST 2] SALES AGENT\n")

    sales_result = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "What is your pricing and can I get demo?"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "sales_agent",

            "business_type": "saas",

            "payment_enabled": True
        }
    )

    print("SALES RESULT:")
    print(sales_result)

    # ==========================================
    # TEST 3 — SUPPORT AGENT
    # ==========================================

    print("\n[TEST 3] SUPPORT AGENT\n")

    support_result = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "My WhatsApp integration stopped working"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "support_agent",

            "business_type": "saas"
        }
    )

    print("SUPPORT RESULT:")
    print(support_result)

    # ==========================================
    # TEST 4 — DEMO BOOKING
    # ==========================================

    print("\n[TEST 4] DEMO BOOKING\n")

    demo_result = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "I want demo tomorrow at 5 PM IST"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "lead_agent",

            "business_type": "agency",

            "calendar_enabled": True,

            "lead_fields": [
                "name",
                "email",
                "budget"
            ]
        }
    )

    print("DEMO RESULT:")
    print(demo_result)

    # ==========================================
    # TEST 5 — PAYMENT FLOW
    # ==========================================

    print("\n[TEST 5] PAYMENT FLOW\n")

    payment_result = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "Okay I want to purchase premium plan"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "sales_agent",

            "business_type": "saas",

            "payment_enabled": True
        }
    )

    print("PAYMENT RESULT:")
    print(payment_result)

    # ==========================================
    # TEST 6 — ESCALATION FLOW
    # ==========================================

    print("\n[TEST 6] ESCALATION FLOW\n")

    escalation_result = await execute_ai_reply(
        db=db,
        workspace_id=workspace_id,
        contact_phone="+919999999999",
        user_message=(
            "I need legal clarification for refund policy"
        ),
        conversation_id=conversation_id,
        flow_context={
            "agent_type": "support_agent",

            "business_type": "saas"
        }
    )

    print("ESCALATION RESULT:")
    print(escalation_result)

    print("\n==============================")
    print("PIPELINE TEST COMPLETED")
    print("==============================\n")

    db.close()


if __name__ == "__main__":
    asyncio.run(run_tests())

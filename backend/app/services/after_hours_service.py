# from datetime import datetime, time, timedelta
# import pytz
# import logging
# import json
# from typing import Dict, Any
# from sqlalchemy.orm import Session
# from app.services.ai_response_service import AIResponseService
# from app.services.twilio_service import TwilioService
# from app.services.email_service import EmailService
# from app.services.platform_settings_service import get_setting

# logger = logging.getLogger(__name__)

# class OfficeHoursManager:
#     def __init__(self, timezone='Asia/Kolkata'):
#         self.tz = pytz.timezone(timezone)
#         self.office_start = time(9, 0)  # 9 AM
#         self.office_end = time(18, 0)   # 6 PM
#         # 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
#         self.working_days = [0, 1, 2, 3, 4, 5]  # Mon-Sat

#     def is_office_hours(self) -> bool:
#         """Check if current time is within office hours."""
#         now = datetime.now(self.tz)
        
#         # Check if Sunday
#         if now.weekday() == 6:
#             return False
        
#         # Check if within working hours
#         if now.time() < self.office_start or now.time() >= self.office_end:
#             return False
        
#         return True

#     def get_next_available_time(self) -> datetime:
#         """Calculate when office opens next."""
#         now = datetime.now(self.tz)
        
#         # Logic to find next 9 AM on a working day
#         candidate = now
#         while True:
#             # Move to next slot (simplified: check next day 9am if current time is past end, or today 9am if before start)
#             if candidate.time() >= self.office_end or candidate.weekday() == 6:
#                  candidate = candidate + timedelta(days=1)
#                  candidate = candidate.replace(hour=9, minute=0, second=0, microsecond=0)
#             elif candidate.time() < self.office_start:
#                  candidate = candidate.replace(hour=9, minute=0, second=0, microsecond=0)
#             else:
#                  # It's currently office hours, but maybe we want next day? 
#                  # This method implies "next start time".
#                  # If we are strictly "after hours", then we look forward.
#                  pass 
            
#             # Check if candidate is working day
#             if candidate.weekday() in self.working_days:
#                 return candidate
#             else:
#                 candidate = candidate + timedelta(days=1)
#                 candidate = candidate.replace(hour=9, minute=0, second=0, microsecond=0)


# class IntentClassifier:
#     def __init__(self):
#         self.ai_service = AIResponseService()

#     async def classify(self, message: str, context: Dict[str, Any], db: Session) -> Dict[str, str]:
#         """
#         Classify customer intent using Claude.
#         Returns: { "category": "...", "urgency": "low|medium|high" }
#         """
#         system_prompt = """
#         Classify this customer message into ONE of these categories:
#         1. pricing_inquiry - Asking about prices, quotes
#         2. product_inquiry - Questions about products, specs
#         3. urgent_request - Urgency keywords, deadlines
#         4. complaint - Dissatisfaction, issues
#         5. order_status - Checking order
#         6. general_info - Hours, location
#         7. other - Anything else

#         Urgency Indicators: urgent, ASAP, emergency, immediately, today.

#         Return JSON ONLY: { "category": "category_name", "urgency": "low/medium/high" }
#         """
        
#         user_prompt = f"Message: {message}\nContext: {json.dumps(context)}"
        
#         # Get AI settings
#         temperature = get_setting(db, "temperature", 0.1)
#         max_tokens = get_setting(db, "max_tokens", 100)
        
#         try:
#             # We reuse the anthropic client from AIResponseService
#             response = await self.ai_service.anthropic.messages.create(
#                 model="claude-3-5-sonnet-20240620",
#                 max_tokens=max_tokens,
#                 temperature=temperature,
#                 system=system_prompt,
#                 messages=[{"role": "user", "content": user_prompt}]
#             )
#             content = response.content[0].text
#             return json.loads(content)
#         except Exception as e:
#             logger.error(f"Intent Classification Failed: {e}")
#             return {"category": "other", "urgency": "low"}


# class AfterHoursResponder:
#     def __init__(self):
#         self.office_manager = OfficeHoursManager()
#         self.twilio_service = TwilioService()
#         self.email_service = EmailService()

#     async def handle_request(self, message: str, from_number: str, lead_context: Dict[str, Any], db: Session, workspace_id: str = None):
#         """
#         Main handler for after-hours messages.
#         """
#         # 1. Classify Intent
#         classifier = IntentClassifier()
#         classification = await classifier.classify(message, lead_context, db)
#         category = classification.get("category", "other")
#         urgency = classification.get("urgency", "low")
        
#         logger.info(f"After-Hours Intent: {category}, Urgency: {urgency}")

#         # 2. Check Escalation
#         if urgency == "high":
#             await self._escalate_urgency(message, from_number, lead_context)
#             response_text = self._get_urgent_response()
#         else:
#             response_text = self._get_template_response(category, lead_context)

#         # 3. Send WhatsApp Response
#         if workspace_id:
#             self.twilio_service.send_whatsapp_message(workspace_id, from_number, response_text)
#         else:
#             logger.error("AfterHoursResponder: workspace_id missing — cannot send WhatsApp message")
        
#         return {
#             "status": "auto_responded",
#             "category": category,
#             "response": response_text
#         }

#     def _get_template_response(self, category: str, context: Dict[str, Any]) -> str:
#         next_open = self.office_manager.get_next_available_time()
#         next_open_str = next_open.strftime("%A at %I:%M %p")
        
#         templates = {
#             'pricing_inquiry': f"Thanks for your interest! Our team is currently offline. We'll prepare a quote and get back to you by {next_open_str}. In the meantime, correct me if I'm wrong, were you looking for bulk pricing?",
#             'product_inquiry': f"Thanks for asking! We're out of the office right now. A product expert will answer your query first thing on {next_open_str}.",
#             'complaint': f"I'm sorry to hear about this issue. Our support team will prioritize this and contact you by {next_open_str} to resolve it.",
#             'order_status': f"Our team processes orders during business hours. We'll check your status and update you on {next_open_str}.",
#             'general_info': f"Thanks for reaching out! Our office hours are Mon-Sat 9 AM - 6 PM. We'll be back on {next_open_str}.",
#             'urgent_request': self._get_urgent_response(), # Fallback if categorized but logic fell through
#             'other': f"Thanks for your message! We're currently closed (9 AM - 6 PM). We've received your message and will reply by {next_open_str}."
#         }
#         return templates.get(category, templates['other'])

#     def _get_urgent_response(self) -> str:
#         return "⚠️ We've marked your request as URGENT. Our on-call manager has been notified and will review this shortly. For immediate emergencies, you can email support@auromind.ai."

#     async def _escalate_urgency(self, message: str, from_number: str, context: Dict[str, Any]):
#         """Send alerts to team."""
#         subject = f"🚨 URGENT After-Hours Lead: {from_number}"
#         body = f"Message: {message}\n\nContext: {context}\n\nPlease respond ASAP."
        
#         # Email Escalation
#         self.email_service.send_email(
#             to_email="sales-manager@auromind.ai", # Configurable
#             subject=subject,
#             body=body
#         )
        
#         # SMS Escalation (Optional, if we have manager's number)
#         # self.twilio_service.send_sms(MANAGER_NUMBER, f"URGENT Lead: {from_number}. Msg: {message[:50]}...")

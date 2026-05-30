# import logging
# from typing import Dict, Any

# logger = logging.getLogger(__name__)

# class EmailService:
#     @staticmethod
#     def send_email(to_email: str, subject: str, body: str, metadata: Dict[str, Any] = None):
        
#         logger.info(f"--- SIMULATING EMAIL SEND ---")
#         logger.info(f"To: {to_email}")
#         logger.info(f"Subject: {subject}")
#         logger.info(f"Body: {body[:200]}...")
#         if metadata:
#             logger.info(f"Metadata: {metadata}")
#         logger.info(f"-----------------------------")
        
#         return {"status": "success", "message": "Email simulation logged successfully."}

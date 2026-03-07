from email.mime.text import MIMEText
import base64
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.models.integration import Integration, EmailReplyLog
from uuid import UUID

class EmailReplyExecutor:

    def execute(self, db, workspace_id, action):
        print("EmailReplyExecutor started")
        print("workspace_id:", workspace_id)
        print("action:", action)

        reply_data = self.extract_reply_data(action)

        access_token = self.get_gmail_access_token(
            db=db,
            workspace_id=workspace_id
        )

        mime_message = self.build_reply_message(
            to_email=reply_data["to_email"],
            subject=reply_data["subject"],
            message_id=reply_data["message_id"],
            reply_text=reply_data["reply_text"]
        )

        encoded_message = self.encode_message(mime_message)

        self.send_gmail_reply(
            access_token=access_token,
            thread_id=reply_data["thread_id"],
            encoded_message=encoded_message
        )

        self.log_reply_event(
            db=db,
            workspace_id=workspace_id,
            thread_id=reply_data["thread_id"],
            message_id=reply_data["message_id"],
            reply_text=reply_data["reply_text"]
        )

    def extract_reply_data(self, action):

        data = action.get("data", {})

        reply_text = data.get("reply")
        thread_id = data.get("thread_id")
        message_id = data.get("message_id")
        to_email = data.get("to_email")
        subject = data.get("subject")

        print("Reply data extracted:", data)

        return {
            "reply_text": reply_text,
            "thread_id": thread_id,
            "message_id": message_id,
            "to_email": to_email,
            "subject": subject
        }
    

    def get_gmail_access_token(self, db, workspace_id):
        
        print("Fetching Gmail token for workspace:", workspace_id)

        workspace_uuid = UUID(workspace_id)

        integration = (
            db.query(Integration)
            .filter(
                Integration.workspace_id == workspace_uuid,
                Integration.integration_type == "google_gmail",
                Integration.is_active == True
            )
            .first()
        )
        print("Integration record:", integration)

        if not integration:
            raise Exception("Gmail integration not found")
        
        

        return integration.access_token
    
    def build_reply_message( self, to_email, subject, message_id, reply_text):
        
        print("Building reply message")
        print("To:", to_email)
        print("Subject:", subject)

        message = MIMEText(reply_text)

        message["To"] = to_email
        message["Subject"] = f"Re: {subject}"
        message["In-Reply-To"] = message_id
        message["References"] = message_id

        return message

    def encode_message(self, mime_message):

        raw_bytes = mime_message.as_bytes()
        encoded_message = base64.urlsafe_b64encode(raw_bytes).decode()
        print("Email encoded successfully")

        return encoded_message

    def send_gmail_reply(
        self,
        access_token,
        thread_id,
        encoded_message
    ):
        print("Sending Gmail reply...")
        print("Thread ID:", thread_id)

        credentials = Credentials(token=access_token)

        service = build("gmail", "v1", credentials=credentials)

        body = {
            "raw": encoded_message,
            "threadId": thread_id
        }

        service.users().messages().send(
            userId="me",
            body=body
        ).execute()
        print("Email sent successfully")

    def log_reply_event(
        self,
        db,
        workspace_id,
        thread_id,
        message_id,
        reply_text
    ):
        print("Logging reply event")
        print("workspace_id:", workspace_id)
        print("thread_id:", thread_id)

        event = EmailReplyLog(
            workspace_id=workspace_id,
            thread_id=thread_id,
            message_id=message_id,
            reply_text=reply_text
        )

        db.add(event)
        db.commit()
        print("Reply event stored in DB")
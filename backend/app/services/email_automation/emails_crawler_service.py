import base64
from email.parser import BytesParser
from email import policy
from bs4 import BeautifulSoup
import re
from app.services.agentic_rag.embedding_service import EmbeddingGenerator
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.models.brain import EmailMessage



class EmailsCrawlerService:
    def __init__(self):
        self.vector_store = VectorStoreService()
        self.embedding_generator = EmbeddingGenerator()

    def classify_email(self, message):

        labels = message.get("labelIds", [])

        if "SPAM" in labels:
            return "spam"

        if "CATEGORY_PROMOTIONS" in labels:
            return "promotion"

        if "CATEGORY_PRIMARY" in labels:
            return "primary"

        if "CATEGORY_SOCIAL" in labels:
            return "social"
        
        if "CATEGORY_UPDATES" in labels:
            return "updates"
        
        if "CATEGORY_FORUMS" in labels:
            return "forums"
        
        if "TRASH" in labels:
            return "Deleted"
        
        if "INBOX" in labels:
            return "inbox"

        return "other"
    
    def call_crawler(self, service, db, workspace_id):
        try:
            classify = self.classify_email(service)

            if classify =="primary":
                return self.start_crawler(service)
            
            elif classify in ["spam", "promotion", "social", "updates", "forums", "deleted"]:
                return f"Skipped {classify} emails"
            else:
                return "Unknown category skipped"
        
        except Exception as e:
            print("Crawler error:", e)
            return "Crawler failed"
        
    def start_crawler(self, service, db, workspace_id, last_processed_id=None):

        print("Starting email crawler...")

        response = service.users().messages().list(
            userId="me",
            q="category:primary -label:spam",
            maxResults=1
        ).execute()

        messages = response.get("messages", [])

        if not messages:
            return "No primary emails"

        message_id = messages[0]["id"]

        if last_processed_id == message_id:
            return "No new email"
        
        raw_message = service.users().messages().get(
            userId="me",
            id=message_id,
            format="raw"
        ).execute()

        raw_bytes = base64.urlsafe_b64decode(raw_message["raw"])

        email_message = BytesParser(policy=policy.default).parsebytes(raw_bytes)

        subject = email_message["subject"]
        sender = email_message["from"]
        date = email_message["date"]

        body = self.extract_body_from_email(email_message)

        parsed_email = {
            "message_id": message_id,
            "thread_id": raw_message.get("threadId"),
            "subject": subject,
            "from": sender,
            "date": date,
            "body": body
        }
        
        self.process_email_pipeline(
            db,
            workspace_id,
            parsed_email,
            raw_message
        )

        print("Processed:", subject)
        return parsed_email
    
    def extract_body_from_email(self, email_message):

        body = ""

        if email_message.is_multipart():
            for part in email_message.walk():

                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                if content_type == "text/plain" and "attachment" not in content_disposition:
                    body = part.get_content()
                    break

                if content_type == "text/html" and "attachment" not in content_disposition:
                    html_body = part.get_content()
                    body = self.clean_html(html_body)
                    break
        else:
            body = email_message.get_content()

        return body.strip()
    
    def clean_html(self, html_content):

        soup = BeautifulSoup(html_content, "html.parser")

        # Remove script and style
        for tag in soup(["script", "style", "head", "meta", "title"]):
            tag.decompose()

        text = soup.get_text(separator="\n")

        # Remove excessive whitespace
        text = re.sub(r"\n\s*\n", "\n\n", text)

        # Remove long tracking URLs
        text = re.sub(r"http\S+", "", text)

        # Remove very short junk lines
        lines = [line.strip() for line in text.split("\n")]
        lines = [line for line in lines if len(line) > 3]

        return "\n".join(lines)
    
    # def create_email_chunks(self, email_data):
    #     chunk = {
    #         "text": email_data["body"],
    #         "metadata": {
    #             "gmail_message_id": email_data["message_id"],
    #             "thread_id": email_data.get("thread_id"),
    #             "from": email_data["from"],
    #             "subject": email_data["subject"],
    #             "date": email_data["date"],
    #             "category": email_data.get("category"),
    #             "priority": email_data.get("priority"),
    #             "direction": email_data.get("direction", "inbound"),
    #             "chunk_index": 0
    #         }
    #     }

    #     return [chunk]
    
    def process_email_pipeline(self, db, workspace_id, parsed_email, raw_message):

        email = EmailMessage(
            workspace_id=workspace_id,
            gmail_message_id=parsed_email["message_id"],
            thread_id=raw_message.get("threadId"),
            sender=parsed_email["from"],
            subject=parsed_email["subject"],
            body=parsed_email["body"],
            direction="inbound",
            created_at=parsed_email["date"]
        )

        db.add(email)
        db.flush() 

    #     email_chunks = self.create_email_chunks({
    #     **parsed_email,
    #     "thread_id": raw_message.get("threadId"),
    #     "direction": "inbound"
    # })

    #     if not email_chunks:
    #         return

    #     texts = [chunk["text"] for chunk in email_chunks]

    #     embedding_generator = EmbeddingGenerator()
    #     embeddings = embedding_generator.generate_embeddings(texts)

    #     entry = BrainEntry(
    #         id=uuid.uuid4(),
    #         workspace_id=workspace_id,
    #         title=parsed_email["subject"],
    #         content=parsed_email["body"],
    #         content_type="email",
    #         metadata_json=json.dumps({
    #             "provider": "gmail",
    #             "gmail_message_id": parsed_email["message_id"],
    #             "from": parsed_email["from"],
    #             "date": parsed_email["date"]
    #         })
    #     )

    #     db.add(entry)
    #     db.flush()
        
    #     self.vector_store.add_email_chunks(
    #         db=db,
    #         workspace_id=workspace_id,
    #         chunks=email_chunks,
    #         embeddings=embeddings,
    #         parent_id=entry.id 
    #     )

        print("Email embedded and stored successfully")
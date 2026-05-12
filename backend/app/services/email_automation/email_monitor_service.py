#shedular always run background 5 minutes once call EmailMonitor
import logging
import uuid
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.integration import Integration
from app.services.email_automation.email_automation_engine import AutomationEngine
from app.services.email_automation.email_mcp_service import EmailMCPService
from app.services.email_automation.emails_crawler_service import EmailsCrawlerService

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET

logger = logging.getLogger(__name__)

class EmailMonitor:
    
    def __init__(self):
        self.is_running = False
        self.email_mcp = EmailMCPService()
        self.engine = AutomationEngine()

    # This method will be called by scheduler every 5 minutes and Orchestrates full email monitoring workflow.
    def run_cycle(self, db):
        
        if self.is_running:
            logger.warning("EmailMonitor already running. Skipping this cycle.")
            return

        self.is_running = True
        logger.info(" EmailMonitor cycle started")

        try:

            email_configs = self.fetch_email_data(db)

            if not email_configs:
                logger.info("No email accounts found.")
                return

            for config in email_configs:
                try:
                    logger.info(f"Checking emails for: {config['email']}")

                    valid_emails = self.crawel_validate(db, config)

                    if not valid_emails:
                        logger.info("No valid primary emails found.")
                        continue

                    for mail in valid_emails:
                        self.tool_caller(db, mail)

                except Exception as e:
                    logger.error(
                        f"Error processing account {config.get('email')}: {str(e)}",
                        exc_info=True
                    )

            logger.info(" EmailMonitor cycle completed successfully")

        except Exception as e:
            logger.error(f"Critical failure in EmailMonitor: {str(e)}", exc_info=True)

        finally:
            self.is_running = False
    
    #Fetch all active Gmail integrations from DB
    def fetch_email_data(self, db: Session):

        try:
            integrations = (
                db.query(Integration)
                .filter(
                    Integration.integration_type == "google_gmail",
                    Integration.is_active == True
                )
                .all()
            )

            if not integrations:
                logger.info("No active Gmail integrations found.")
                return []

            email_configs = []

            for integration in integrations:

                try:
                    creds = Credentials(
                        token=integration.access_token,
                        refresh_token=integration.refresh_token,
                        token_uri="https://oauth2.googleapis.com/token",
                        client_id=GOOGLE_CLIENT_ID,
                        client_secret=GOOGLE_CLIENT_SECRET
                    )

                    #AUTO REFRESH TOKEN
                    if creds.expired and creds.refresh_token:
                        logger.info(f"Refreshing token for {integration.connected_email}")
                        creds.refresh(Request())

                        # Update DB with new token
                        integration.access_token = creds.token
                        integration.token_expiry = creds.expiry
                        db.commit()

                    email_configs.append({
                        "integration_id": str(integration.id),
                        "workspace_id": str(integration.workspace_id),
                        "email": integration.connected_email,
                        "access_token": creds.token,
                        "refresh_token": integration.refresh_token,
                        "token_expiry": integration.token_expiry
                    })

                except Exception as refresh_error:
                    logger.error(
                        f"Token refresh failed for {integration.connected_email}: {str(refresh_error)}"
                    )
                    continue

            logger.info(f"Fetched {len(email_configs)} Gmail integrations.")
            return email_configs

        except Exception as e:
            logger.error("Error fetching email integration data", exc_info=True)
            return []
        

    def crawel_validate(self, db, config):

        print("Running crawl validation...")

        workspace_id = config["workspace_id"]
        access_token = config["access_token"]
        refresh_token = config["refresh_token"]
        email = config["email"]

        # Build Gmail service
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET
        )

        service = build("gmail", "v1", credentials=creds)

        crawler = EmailsCrawlerService()

        #Get last processed email id from DB
        last_processed_id = self.get_last_processed_id(db, workspace_id)

        
        result = crawler.start_crawler(
            service=service,
            db=db,
            workspace_id=workspace_id,
            last_processed_id=last_processed_id
        )

        if isinstance(result, dict):

            message_id = result["message_id"]

            # Save last processed id
            self.update_last_processed_id(db, workspace_id, message_id)

            print("New primary email found")
            result["workspace_id"] = workspace_id
            return [result]

        elif result == "No new email":
            print("No new email")
            return []

        elif result == "No primary emails":
            print("No primary emails")
            return []

        else:
            print("Skipped email")
            return []
        
    def get_last_processed_id(self, db, workspace_id):
        record = db.execute(
           text("SELECT last_email_id FROM email_states WHERE workspace_id = :wid"),
            {"wid": workspace_id}
        ).fetchone()

        return record[0] if record else None


    def update_last_processed_id(self, db, workspace_id, message_id):
        db.execute(
            text("""
                INSERT INTO email_states (id, workspace_id, last_email_id, created_at, updated_at)
                VALUES (:id, :wid, :mid, NOW(), NOW())
                ON CONFLICT (workspace_id)
                DO UPDATE SET
                    last_email_id = :mid,
                    updated_at = NOW()
            """),
            {"id": str(uuid.uuid4()), "wid": workspace_id, "mid": message_id}
        )
        db.commit()

    
    def tool_caller(self, db, email_data):

        print("Running tool caller...")

        try:
            workspace_id = email_data.get("workspace_id")

            #Call MCP Layer
            mcp_result = self.email_mcp.process_email(
                db=db,
                workspace_id=workspace_id,
                email_data=email_data
            )

            if not mcp_result:
                print("MCP returned no action")
                return

            print("MCP decision:", mcp_result)

            #Call Automation Layer
            # self.engine.execute(
            #     # db=db,
            #     # workspace_id=workspace_id,
            #     # message_id=message_id,
            #     mcp_decision=mcp_result
            # )

            self.engine.execute(
                db=db,
                workspace_id=workspace_id,
                mcp_decision=mcp_result
            )

            print("Automation triggered")

        except Exception as e:
            print("Tool caller error:", e)

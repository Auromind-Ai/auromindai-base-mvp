from datetime import datetime
import pytz

import asyncio
from datetime import timedelta
from dateutil import parser
from geopy.geocoders import Nominatim
from google.oauth2.credentials import Credentials
from timezonefinder import TimezoneFinder

from app.core.config import settings
from app.models.integration import CalendarEvent
from app.models.integration import Integration
from app.services.llm_utils import safe_llm_call
from app.services.platform_settings_service import get_setting
from googleapiclient.discovery import build

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET

geolocator = Nominatim(user_agent="calendar_ai")
tf = TimezoneFinder()

class CalendarExecutor:

   
    def execute(self, db, workspace_id, action, decision):

        calendar_enabled = get_setting(db, "enable_calendar_integration", True)

        if not calendar_enabled:
            print("❌ Calendar integration disabled by admin")
            return
        try:

            print("Calendar executor started")

            #Extract meeting info
            meeting = self.extract_meeting(action)

            #Validate date & time
            meeting = self.validate_date_time(meeting)

            #Convert timezone
            meeting = self.convert_timezone(meeting)

            #AI enrichment
            meeting = self.ai_layer(meeting, action, decision)

            #Conflict detection
            conflict = self.conflict_detection(db, meeting, workspace_id)

            #Smart reschedule if needed
            if conflict:
                # meeting = self.smart_reschedule(db, meeting, workspace_id)
                print("Conflict detected but reschedule disabled. Keeping original time.")

            #Store event
            event = self.store_event_db(db, workspace_id, meeting)

            google_integration = db.query(Integration).filter_by(
            workspace_id=workspace_id,
            integration_type="google_calendar"
            ).first()

            if google_integration:

                creds = Credentials(
                    token=google_integration.access_token,
                    refresh_token=google_integration.refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=GOOGLE_CLIENT_ID,
                    client_secret=GOOGLE_CLIENT_SECRET
                )

                service = build("calendar", "v3", credentials=creds)

                # pass service instead of credentials
                created_event = self.sync_google_calendar(service, event)

                if not created_event:
                    print("Event creation failed")
                    return

            #Create reminders
            self.create_remainder(event)

            #Send notification
            self.notify_send(event)

            print("Calendar executor completed successfully")
            return created_event

        except Exception as e:

            print("Calendar executor error:", e)

    def extract_meeting(self, action):

        data = action.get("data", {})

        location = data.get("location")
        timezone = data.get("timezone")

        # Auto detect timezone if MCP didn't provide
        if not timezone or timezone in ["null", "None", "", "undefined"]:
            timezone = self.detect_timezone_from_location(location)
        
        meeting = {
            "date": data.get("meeting_date"),
            "time": data.get("meeting_time"),
            "timezone": timezone,
            "location": location or "Unknown"
        }

        print("Meeting extracted:", meeting)

        return meeting
    
    def detect_timezone_from_location(self, location):

        if not location:
            return "UTC"

        try:
            geo = geolocator.geocode(location)

            if not geo:
                return "UTC"

            timezone = tf.timezone_at(lng=geo.longitude, lat=geo.latitude)

            return timezone or "UTC"

        except Exception:
            return "UTC"
    
    def validate_date_time(self, meeting):

        date = meeting.get("date")
        time = meeting.get("time")

        if not date:
            raise ValueError("Meeting date missing")

        if time:
            time = time.replace(".", ":")

        try:
            meeting_datetime = parser.parse(f"{date} {time}", dayfirst=True, fuzzy=True)
            meeting_datetime = meeting_datetime.replace(tzinfo=None)
        except Exception:
            raise ValueError("Invalid date or time format")

        now = datetime.utcnow()

        if meeting_datetime < now:
            raise ValueError("Meeting date/time already passed")

        meeting["datetime"] = meeting_datetime

        print("Meeting date/time parsed:", meeting_datetime)

        return meeting
    
    def convert_timezone(self, meeting):

        meeting_datetime = meeting.get("datetime")
        timezone_str = meeting.get("timezone", "UTC")

        try:
            source_tz = pytz.timezone(timezone_str)
        except Exception:
            print("Invalid timezone. Defaulting to UTC")
            source_tz = pytz.utc

        # Localize datetime
        if meeting_datetime.tzinfo is None:
            localized_dt = source_tz.localize(meeting_datetime)
        else:
            localized_dt = meeting_datetime.astimezone(source_tz)

        # Convert to UTC
        utc_dt = localized_dt.astimezone(pytz.utc)

        meeting["local_datetime"] = localized_dt
        meeting["utc_datetime"] = utc_dt

        print("Timezone converted to UTC:", utc_dt)

        return meeting

    def ai_layer(self, meeting, action, decision):

        summary = decision.get("summary", "Meeting scheduled")

        sender = action.get("sender", "Unknown Sender")
        priority = decision.get("priority", "normal").upper()
        location = meeting.get("location", "Unknown")

        # Title
        meeting["title"] = f"Meeting with {sender}"

        # Description with full details
        meeting["description"] = (
            f"Summary:\n{summary}\n\n"
            f"From: {sender}\n"
            f"Priority: {priority}\n"
            f"Location: {location}\n\n"
            f"Auromind AI Generated Calendar Event"
        )

        # Participants
        meeting["participants"] = self.detect_participants(action)

        return meeting
    
    async def smart_meeting_title(self, summary):

        if not summary:
            return "Meeting"

        system_prompt = """
        Generate a short meeting title (max 6 words).
        """

        prompt = f"{system_prompt}\n\nUser:\n{summary}"

        response = await safe_llm_call(prompt)

        return response["content"].strip()

    def detect_participants(self, action):

        sender = action.get("sender")
        cc = action.get("cc", [])

        participants = []

        if sender:
            participants.append(sender)

        participants.extend(cc)

        return participants
    
    def conflict_detection(self, db, meeting, workspace_id):

        meeting_start = meeting.get("utc_datetime")
        meeting_end = meeting_start + timedelta(minutes=30)

        existing_event = db.query(CalendarEvent).filter(
            CalendarEvent.workspace_id == str(workspace_id),
            CalendarEvent.event_date < meeting_end,
            CalendarEvent.event_date > meeting_start - timedelta(minutes=30)
        ).first()

        if existing_event:
            print("Conflict detected with event:", existing_event.id)
            return True

        print("No meeting conflict")
        return False

    def smart_reschedule(self, db, meeting, workspace_id):

        original_time = meeting.get("utc_datetime")

        print("Attempting smart reschedule...")

        # Try next slots
        possible_offsets = [
            timedelta(minutes=30),
            timedelta(hours=1),
            timedelta(hours=2)
        ]

        for offset in possible_offsets:

            new_time = original_time + offset

            meeting["utc_datetime"] = new_time

            conflict = self.conflict_detection(db, meeting, workspace_id)

            if not conflict:
                print("Rescheduled meeting to:", new_time)
                return meeting

        print("No free slot found. Keeping original time.")
        meeting["utc_datetime"] = original_time

        return meeting
    
    def store_event_db(self, db, workspace_id, meeting):

        try:

            event = CalendarEvent(
                workspace_id=workspace_id,
                title=meeting.get("title", "Meeting"),
                description=meeting.get("description"),
                event_date=meeting.get("utc_datetime"),
                event_time=meeting.get("local_datetime").strftime("%H:%M"),
                timezone=meeting.get("timezone"),
                location=meeting.get("location"),
                status="scheduled",
                created_at=datetime.utcnow()
            )

            db.add(event)
            db.commit()
            db.refresh(event)

            print("Calendar event stored:", event.id)

            return event

        except Exception as e:

            db.rollback()
            print("Error storing calendar event:", e)
            return None
        
    def sync_google_calendar(self, service, event):

        tz = pytz.timezone(event.timezone)

        # convert stored UTC → user timezone
        start_time = event.event_date.astimezone(tz)
        end_time = start_time + timedelta(minutes=30)


        event_body = {
            "summary": event.title,
            "description": event.description,
            "start": {
                "dateTime": start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "end": {
                 "dateTime": end_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            },
            "conferenceData": {
                "createRequest": {
                    "requestId": str(event.id),
                    "conferenceSolutionKey": {
                        "type": "hangoutsMeet"
                    }
                }
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 60},
                    {"method": "popup", "minutes": 5}
                ]
            }
            
        }

        created_event = service.events().insert(
            calendarId="primary",
            body=event_body,
            conferenceDataVersion=1
        ).execute()

        print("Google Calendar event created:", created_event["id"])

        meet_link = (
            created_event
            .get("conferenceData", {})
            .get("entryPoints", [{}])[0]
            .get("uri")
        )

        return {
            "event": created_event,
            "meet_link": meet_link
        }

    
    def create_remainder(self, event):

        try:

            event_time = event.event_date

            reminder_1 = event_time - timedelta(hours=1)
            reminder_2 = event_time - timedelta(minutes=2)

            reminders = [
                {
                    "event_id": event.id,
                    "reminder_time": reminder_1,
                    "type": "1_hour_before"
                },
                {
                    "event_id": event.id,
                    "reminder_time": reminder_2,
                    "type": "2_minutes_before"
                }
            ]

            print("Reminders created:", reminders)

            return reminders

        except Exception as e:

            print("Reminder creation error:", e)
            return []
    
    def notify_send(self, event):

        try:

            notification = {
                "title": "New Meeting Scheduled",
                "message": f"{event.title} at {event.event_time}",
                "location": event.location,
                "event_id": str(event.id)
            }

            print("Sending notification:", notification)

            # Later you can push this to notification service
            # Example:
            # notification_service.send(notification)

            return notification

        except Exception as e:

            print("Notification error:", e)
            return None

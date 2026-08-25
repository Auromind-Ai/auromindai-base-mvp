import logging
import uuid
import re
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone as dt_timezone
import pytz
from dateutil import parser
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from app.models.integration import CalendarEvent, Integration
from app.services.platform_settings_service import get_setting
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

geolocator = Nominatim(user_agent="calendar_ai")
tf = TimezoneFinder()

# Common timezone abbreviation mappings
TIMEZONE_ALIASES = {
    "ist": "Asia/Kolkata",
    "india": "Asia/Kolkata",
    "est": "America/New_York",
    "edt": "America/New_York",
    "eastern": "America/New_York",
    "cst": "America/Chicago",
    "cdt": "America/Chicago",
    "central": "America/Chicago",
    "mst": "America/Denver",
    "mdt": "America/Denver",
    "mountain": "America/Denver",
    "pst": "America/Los_Angeles",
    "pdt": "America/Los_Angeles",
    "pacific": "America/Los_Angeles",
    "gmt": "Etc/GMT",
    "utc": "UTC",
    "bst": "Europe/London",
    "london": "Europe/London",
    "cet": "Europe/Paris",
    "cest": "Europe/Paris",
    "paris": "Europe/Paris",
    "berlin": "Europe/Berlin",
    "jst": "Asia/Tokyo",
    "tokyo": "Asia/Tokyo",
    "aest": "Australia/Sydney",
    "aedt": "Australia/Sydney",
    "sydney": "Australia/Sydney",
    "sgt": "Asia/Singapore",
    "singapore": "Asia/Singapore",
    "gst": "Asia/Dubai",
    "dubai": "Asia/Dubai"
}


def _to_uuid(val):
    if isinstance(val, uuid.UUID):
        return val
    if isinstance(val, str):
        try:
            return uuid.UUID(val)
        except (ValueError, AttributeError):
            return val
    return val


class CalendarExecutor:
    

    # Google Calendar Service & OAuth Token Management
    def get_google_service(self, db, workspace_id):
        """
        Retrieves an authenticated Google Calendar API service instance for the workspace.
        Automatically refreshes expired access tokens and persists updated tokens to DB.
        """
        ws_uuid = _to_uuid(workspace_id)
        google_integration = db.query(Integration).filter(
            Integration.workspace_id == ws_uuid,
            Integration.integration_type == "google_calendar",
            Integration.is_active == True
        ).first()

        if not google_integration or not google_integration.access_token:
            logger.info(f"No active Google Calendar integration found for workspace {workspace_id}")
            return None

        try:
            from app.services.config_service import config_service
            client_id = config_service.get("google_client_id")
            client_secret = config_service.get("google_client_secret")

            creds = Credentials(
                token=google_integration.access_token,
                refresh_token=google_integration.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret
            )

            # Auto-refresh expired credentials
            if creds.expired and creds.refresh_token:
                logger.info(f"Refreshing expired Google OAuth token for workspace {workspace_id}...")
                creds.refresh(Request())
                google_integration.access_token = creds.token
                if creds.expiry:
                    google_integration.token_expiry = creds.expiry
                google_integration.updated_at = datetime.now(dt_timezone.utc)
                db.commit()
                logger.info("Google OAuth token refreshed and saved.")

            service = build("calendar", "v3", credentials=creds)
            return service

        except Exception as e:
            logger.error(f"Failed to build Google Calendar service for workspace {workspace_id}: {e}")
            return None

   
    # Timezone Handling & Normalization
   
    def normalize_timezone(self, tz_input: str | None, location: str | None = None) -> str:
        """
        Normalizes a timezone string or alias to a valid pytz timezone name.
        """
        if not tz_input or str(tz_input).strip().lower() in ["null", "none", "", "undefined", "unknown"]:
            if location:
                return self.detect_timezone_from_location(location)
            return "Asia/Kolkata"

        cleaned = str(tz_input).strip().lower().replace("_", " ")
        cleaned_key = re.sub(r"[^a-z0-9]", "", cleaned)

        # Check aliases
        if cleaned_key in TIMEZONE_ALIASES:
            return TIMEZONE_ALIASES[cleaned_key]
        if cleaned in TIMEZONE_ALIASES:
            return TIMEZONE_ALIASES[cleaned]

        # Check direct pytz support
        try:
            pytz.timezone(str(tz_input).strip())
            return str(tz_input).strip()
        except Exception:
            pass

        # Try location detection fallback
        detected = self.detect_timezone_from_location(str(tz_input).strip())
        if detected != "UTC":
            return detected

        return "Asia/Kolkata"

    def detect_timezone_from_location(self, location: str | None) -> str:
        if not location or location in ["Unknown", "Online", "null", "None"]:
            return "UTC"
        try:
            geo = geolocator.geocode(location, timeout=5)
            if not geo:
                return "UTC"
            timezone = tf.timezone_at(lng=geo.longitude, lat=geo.latitude)
            return timezone or "UTC"
        except Exception:
            return "UTC"

    @staticmethod
    def resolve_relative_date(date_str: str, tz=None) -> Optional[datetime]:
        """
        Resolves relative date strings like 'today', 'tomorrow', 'next monday'
        into a localized datetime at start of day.
        """
        if not date_str or not isinstance(date_str, str):
            return None

        if tz is None or isinstance(tz, str):
            try:
                tz = pytz.timezone(tz or "Asia/Kolkata")
            except Exception:
                tz = pytz.timezone("Asia/Kolkata")

        now_local = datetime.now(tz)
        s = str(date_str).strip().lower()

        if s in ("today", "tonight"):
            return now_local
        if s in ("tomorrow", "tmrw"):
            return now_local + timedelta(days=1)
        if s in ("day after tomorrow", "day after tmrw", "overmorrow"):
            return now_local + timedelta(days=2)

        weekdays = {
            "monday": 0, "mon": 0,
            "tuesday": 1, "tue": 1, "tues": 1,
            "wednesday": 2, "wed": 2,
            "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
            "friday": 4, "fri": 4,
            "saturday": 5, "sat": 5,
            "sunday": 6, "sun": 6,
        }

        clean = re.sub(r'\b(next|this|on|coming)\b', '', s).strip()
        if clean in weekdays:
            target_wd = weekdays[clean]
            days_ahead = target_wd - now_local.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return now_local + timedelta(days=days_ahead)

        return None

    def parse_meeting_datetime(self, date_str: str, time_str: str, tz_str: str):
        """
        Parses date, time, and timezone into localized datetime and UTC datetime.
        Supports both relative dates ('tomorrow', 'today', 'next monday') and ISO/standard dates.
        """
        if not date_str:
            raise ValueError("Meeting date is required")

        tz_name = self.normalize_timezone(tz_str)
        try:
            tz = pytz.timezone(tz_name)
        except Exception:
            tz = pytz.timezone("Asia/Kolkata")
            tz_name = "Asia/Kolkata"

        if time_str:
            time_str = str(time_str).replace(".", ":").strip()
        else:
            time_str = "10:00 AM"

        # Check for relative date expressions ('tomorrow', 'today', etc.)
        rel_dt = self.resolve_relative_date(date_str, tz)
        if rel_dt is not None:
            try:
                parsed_time = parser.parse(time_str).time()
            except Exception:
                try:
                    parsed_time = parser.parse(time_str, fuzzy=True).time()
                except Exception:
                    parsed_time = datetime.strptime("10:00 AM", "%I:%M %p").time()
            naive_dt = datetime.combine(rel_dt.date(), parsed_time)
            localized_dt = tz.localize(naive_dt)
        else:
            # Combine and parse standard date string
            full_str = f"{date_str} {time_str}"
            try:
                parsed_dt = parser.parse(full_str, fuzzy=True)
            except Exception:
                try:
                    parsed_dt = parser.parse(full_str, dayfirst=True, fuzzy=True)
                except Exception as pe:
                    raise ValueError(f"Invalid date/time format: {full_str}") from pe

            # Make naive if needed then localize to target timezone
            if parsed_dt.tzinfo is not None:
                localized_dt = parsed_dt.astimezone(tz)
            else:
                localized_dt = tz.localize(parsed_dt)

        utc_dt = localized_dt.astimezone(pytz.utc)

        # Check if in past
        now_utc = datetime.now(pytz.utc)
        if utc_dt < now_utc - timedelta(minutes=5):
            raise ValueError("The requested meeting date and time has already passed.")

        return {
            "local_datetime": localized_dt,
            "utc_datetime": utc_dt,
            "timezone": tz_name,
            "date": localized_dt.strftime("%Y-%m-%d"),
            "time": localized_dt.strftime("%I:%M %p"),
            "formatted_display": localized_dt.strftime("%A, %B %d, %Y at %I:%M %p")
        }

   
    # Availability Fetching & Slot Generator
   
    def get_available_slots(
        self,
        db,
        workspace_id: str,
        target_date: str | datetime | None = None,
        timezone_str: str = "Asia/Kolkata",
        slot_duration_minutes: int = 30,
        start_hour: int = 9,
        end_hour: int = 18,
        days_ahead: int = 3
    ) -> list:
        """
        Fetches calendar availability by checking Google Calendar FreeBusy and local DB events.
        Generates available time slots within business hours (default 9 AM to 6 PM) in the requested timezone.
        """
        tz_name = self.normalize_timezone(timezone_str)
        try:
            tz = pytz.timezone(tz_name)
        except Exception:
            tz = pytz.timezone("Asia/Kolkata")
            tz_name = "Asia/Kolkata"

        now_local = datetime.now(tz)

        if isinstance(target_date, str) and target_date.strip():
            try:
                base_dt = parser.parse(target_date, fuzzy=True)
                if base_dt.tzinfo is None:
                    base_local = tz.localize(base_dt)
                else:
                    base_local = base_dt.astimezone(tz)
            except Exception:
                base_local = now_local
        elif isinstance(target_date, datetime):
            if target_date.tzinfo is None:
                base_local = tz.localize(target_date)
            else:
                base_local = target_date.astimezone(tz)
        else:
            base_local = now_local

        # Dates to calculate slots for
        dates_to_check = []
        for i in range(days_ahead):
            d = (base_local + timedelta(days=i)).date()
            dates_to_check.append(d)

        # Range for Google Calendar FreeBusy
        range_start_local = tz.localize(datetime.combine(dates_to_check[0], datetime.min.time().replace(hour=start_hour)))
        range_end_local = tz.localize(datetime.combine(dates_to_check[-1], datetime.min.time().replace(hour=end_hour)))
        range_start_utc = range_start_local.astimezone(pytz.utc)
        range_end_utc = range_end_local.astimezone(pytz.utc)

        # 1. Fetch busy intervals from Google Calendar
        busy_intervals = []
        service = self.get_google_service(db, workspace_id)
        if service:
            try:
                body = {
                    "timeMin": range_start_utc.isoformat(),
                    "timeMax": range_end_utc.isoformat(),
                    "timeZone": tz_name,
                    "items": [{"id": "primary"}]
                }
                freebusy = service.freebusy().query(body=body).execute()
                g_busy = freebusy.get("calendars", {}).get("primary", {}).get("busy", [])
                for b in g_busy:
                    s_utc = parser.parse(b["start"]).astimezone(pytz.utc)
                    e_utc = parser.parse(b["end"]).astimezone(pytz.utc)
                    busy_intervals.append((s_utc, e_utc))
            except Exception as e:
                logger.warning(f"Error fetching Google FreeBusy: {e}")

        # 2. Fetch busy intervals from local DB
        ws_uuid = _to_uuid(workspace_id)
        db_events = db.query(CalendarEvent).filter(
            CalendarEvent.workspace_id == ws_uuid,
            CalendarEvent.event_date >= range_start_utc - timedelta(hours=1),
            CalendarEvent.event_date <= range_end_utc + timedelta(hours=1),
            CalendarEvent.status != "cancelled"
        ).all()

        for ev in db_events:
            ev_dt = ev.event_date
            if ev_dt.tzinfo is None:
                ev_utc = pytz.utc.localize(ev_dt)
            else:
                ev_utc = ev_dt.astimezone(pytz.utc)
            ev_end_utc = ev_utc + timedelta(minutes=slot_duration_minutes)
            busy_intervals.append((ev_utc, ev_end_utc))

        # 3. Generate candidate slots and filter busy/past slots
        available_slots = []
        for day in dates_to_check:
            # Skip Sunday if desired or include all business days
            current_slot_start_local = tz.localize(datetime.combine(day, datetime.min.time().replace(hour=start_hour)))
            day_end_local = tz.localize(datetime.combine(day, datetime.min.time().replace(hour=end_hour)))

            while current_slot_start_local + timedelta(minutes=slot_duration_minutes) <= day_end_local:
                slot_start_utc = current_slot_start_local.astimezone(pytz.utc)
                slot_end_utc = slot_start_utc + timedelta(minutes=slot_duration_minutes)

                # Skip past slots (buffer 15 mins)
                if slot_start_utc <= datetime.now(pytz.utc) + timedelta(minutes=15):
                    current_slot_start_local += timedelta(minutes=slot_duration_minutes)
                    continue

                # Check overlap with busy intervals
                is_busy = False
                for b_start, b_end in busy_intervals:
                    if max(slot_start_utc, b_start) < min(slot_end_utc, b_end):
                        is_busy = True
                        break

                if not is_busy:
                    available_slots.append({
                        "date": current_slot_start_local.strftime("%Y-%m-%d"),
                        "time": current_slot_start_local.strftime("%I:%M %p"),
                        "datetime_iso": current_slot_start_local.isoformat(),
                        "utc_iso": slot_start_utc.isoformat(),
                        "timezone": tz_name,
                        "display": current_slot_start_local.strftime("%A, %B %d at %I:%M %p")
                    })

                current_slot_start_local += timedelta(minutes=slot_duration_minutes)

        return available_slots

   
    # Conflict Detection (Double-Booking Prevention)
   
    def conflict_detection(self, db, meeting_data: dict, workspace_id: str, duration_minutes: int = 30) -> bool:
        """
        Checks if meeting slot conflicts with existing appointments in DB or Google Calendar.
        Returns True if a conflict exists (double booking), False otherwise.
        """
        start_utc = meeting_data.get("utc_datetime")
        if not start_utc:
            return False

        end_utc = start_utc + timedelta(minutes=duration_minutes)
        ws_uuid = _to_uuid(workspace_id)

        # 1. Local DB Conflict Check
        existing_event = db.query(CalendarEvent).filter(
            CalendarEvent.workspace_id == ws_uuid,
            CalendarEvent.event_date < end_utc,
            CalendarEvent.event_date > start_utc - timedelta(minutes=duration_minutes),
            CalendarEvent.status != "cancelled"
        ).first()

        if existing_event:
            logger.info(f"Local DB conflict detected with event: {existing_event.id}")
            return True

        # 2. Google Calendar FreeBusy Check
        service = self.get_google_service(db, workspace_id)
        if service:
            try:
                body = {
                    "timeMin": (start_utc - timedelta(minutes=1)).isoformat(),
                    "timeMax": (end_utc + timedelta(minutes=1)).isoformat(),
                    "items": [{"id": "primary"}]
                }
                freebusy = service.freebusy().query(body=body).execute()
                busy_list = freebusy.get("calendars", {}).get("primary", {}).get("busy", [])
                if busy_list:
                    logger.info(f"Google Calendar conflict detected: {busy_list}")
                    return True
            except Exception as e:
                logger.warning(f"FreeBusy query failed during conflict check: {e}")

        logger.info("No meeting conflict detected.")
        return False

   
    # Appointment Creation & Main Execution Flow
   
    def execute(self, db, workspace_id, action: dict, decision: dict = None):
        """
        Main entry point for scheduling an appointment / demo booking.
        Validates date/time, checks conflicts, creates DB record, syncs with Google Calendar,
        generates Google Meet link, and dispatches confirmation email.
        """
        calendar_enabled = get_setting(db, "enable_calendar_integration", True)
        if not calendar_enabled:
            logger.info("Calendar integration disabled by admin")
            return None

        try:
            logger.info(f"Calendar executor starting execution for workspace {workspace_id}...")
            data = action.get("data", {})
            decision = decision or {}

            raw_date = data.get("meeting_date")
            raw_time = data.get("meeting_time")
            raw_tz = data.get("timezone") or data.get("location")

            client_name = data.get("name") or data.get("client_name") or "Valued Client"
            client_email = data.get("email") or data.get("client_email")
            client_phone = data.get("phone") or data.get("client_phone") or action.get("sender")
            location = data.get("location", "Google Meet / Online")
            notes = data.get("notes") or decision.get("summary") or "Product Demo & AI Discovery"
            conversation_id = data.get("conversation_id") or action.get("conversation_id")
            duration_minutes = int(data.get("duration_minutes", 30))

            # 1. Parse & Normalize Date/Time/Timezone
            parsed = self.parse_meeting_datetime(raw_date, raw_time, raw_tz)
            meeting = {
                **parsed,
                "client_name": client_name,
                "client_email": client_email,
                "client_phone": client_phone,
                "location": location,
                "notes": notes,
                "duration_minutes": duration_minutes,
                "conversation_id": conversation_id
            }

            # 2. Conflict Detection (Double-Booking Prevention)
            has_conflict = self.conflict_detection(db, meeting, workspace_id, duration_minutes=duration_minutes)
            if has_conflict:
                logger.warning(f"Booking slot conflict for {parsed['formatted_display']}")
                # Suggest nearest open slots
                alternative_slots = self.get_available_slots(
                    db=db,
                    workspace_id=workspace_id,
                    target_date=parsed["local_datetime"],
                    timezone_str=parsed["timezone"],
                    slot_duration_minutes=duration_minutes,
                    days_ahead=3
                )
                suggested_text = ", ".join([s["display"] for s in alternative_slots[:3]]) if alternative_slots else "later this week"
                return {
                    "status": "conflict",
                    "conflict": True,
                    "message": f"The requested slot on {parsed['formatted_display']} ({parsed['timezone']}) is already booked. Here are some open slots: {suggested_text}",
                    "alternative_slots": alternative_slots[:5]
                }

            # 3. AI Enrichment (Title & Description)
            meeting = self.ai_layer(meeting, action, decision)

            # 4. Store Event in Database
            event = self.store_event_db(db, workspace_id, meeting)
            if not event:
                logger.error("Failed to store calendar event in DB")
                return None

            # 5. Sync with Google Calendar
            meet_link = None
            google_event = None
            service = self.get_google_service(db, workspace_id)
            if service:
                created_result = self.sync_google_calendar(service, event)
                if created_result:
                    google_event = created_result.get("event")
                    meet_link = created_result.get("meet_link")
                    event.google_event_id = google_event.get("id") if google_event else None
                    event.meet_link = meet_link
                    event.sync_status = "synced"
                    db.commit()
                    db.refresh(event)

            # 6. Create Reminders
            self.create_remainder(event)

            # 7. Send Email Confirmation
            if client_email and "@" in str(client_email):
                try:
                    self.send_booking_confirmation_email(
                        db=db,
                        workspace_id=workspace_id,
                        event=event,
                        meet_link=meet_link
                    )
                except Exception as email_err:
                    logger.error(f"Failed to send confirmation email: {email_err}")

            # 8. Send Notification
            self.notify_send(event)

            logger.info("Calendar executor completed booking successfully")
            return {
                "status": "success",
                "event_id": str(event.id),
                "google_event_id": event.google_event_id,
                "meet_link": meet_link,
                "formatted_date": parsed["date"],
                "formatted_time": parsed["time"],
                "formatted_display": parsed["formatted_display"],
                "timezone": parsed["timezone"],
                "client_name": client_name,
                "client_email": client_email,
                "client_phone": client_phone,
                "event": google_event or {"id": str(event.id)}
            }

        except Exception as e:
            logger.exception(f"Calendar executor execution error: {e}")
            return None

   
    # AI Enrichment & Payload Building

    def ai_layer(self, meeting: dict, action: dict, decision: dict) -> dict:
        client_name = meeting.get("client_name") or "Client"
        client_email = meeting.get("client_email") or "Not provided"
        client_phone = meeting.get("client_phone") or "Not provided"
        notes = meeting.get("notes") or decision.get("summary") or "AI Discovery & Product Demo"
        location = meeting.get("location") or "Online (Google Meet)"
        tz_name = meeting.get("timezone", "UTC")

        meeting["title"] = f"Demo Meeting: {client_name}"

        meeting["description"] = (
            f"Meeting Details:\n"
            f"----------------------------------------\n"
            f"Client Name:  {client_name}\n"
            f"Client Email: {client_email}\n"
            f"Client Phone: {client_phone}\n"
            f"Timezone:     {tz_name}\n"
            f"Topic / Note: {notes}\n"
            f"Location:     {location}\n"
            f"----------------------------------------\n"
            f"Scheduled via Orbion AI Assistant"
        )

        participants = []
        if client_email and "@" in str(client_email):
            participants.append(client_email)
        sender = action.get("sender")
        if sender and "@" in str(sender) and sender not in participants:
            participants.append(sender)

        meeting["participants"] = participants
        return meeting

   
    # Database Persistence
   
    def store_event_db(self, db, workspace_id, meeting: dict) -> CalendarEvent | None:
        try:
            ws_uuid = _to_uuid(workspace_id)
            conv_id = _to_uuid(meeting.get("conversation_id")) if meeting.get("conversation_id") else None

            event = CalendarEvent(
                workspace_id=ws_uuid,
                title=meeting.get("title", "Meeting"),
                description=meeting.get("description"),
                event_date=meeting.get("utc_datetime"),
                event_time=meeting.get("time") or meeting.get("local_datetime").strftime("%I:%M %p"),
                timezone=meeting.get("timezone"),
                location=meeting.get("location"),
                client_name=meeting.get("client_name"),
                client_email=meeting.get("client_email"),
                client_phone=meeting.get("client_phone"),
                conversation_id=conv_id,
                status="scheduled",
                sync_status="pending",
                created_at=datetime.now(dt_timezone.utc)
            )

            db.add(event)
            db.commit()
            db.refresh(event)

            logger.info(f"Calendar event stored in DB: {event.id}")
            return event

        except Exception as e:
            db.rollback()
            logger.error(f"Error storing calendar event: {e}")
            return None

   
    # Google Calendar Sync & Google Meet Generation
   
    def sync_google_calendar(self, service, event: CalendarEvent) -> dict | None:
        try:
            tz_str = event.timezone or "Asia/Kolkata"
            tz = pytz.timezone(tz_str)

            if event.event_date.tzinfo is None:
                utc_dt = pytz.utc.localize(event.event_date)
            else:
                utc_dt = event.event_date.astimezone(pytz.utc)

            start_time = utc_dt.astimezone(tz)
            end_time = start_time + timedelta(minutes=30)

            # Build attendee list
            attendees = []
            if event.client_email and "@" in str(event.client_email):
                attendees.append({
                    "email": event.client_email,
                    "displayName": event.client_name or "Client"
                })

            event_body = {
                "summary": event.title,
                "description": event.description,
                "start": {
                    "dateTime": start_time.isoformat(),
                    "timeZone": tz_str
                },
                "end": {
                    "dateTime": end_time.isoformat(),
                    "timeZone": tz_str
                },
                "attendees": attendees,
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
                        {"method": "popup", "minutes": 10},
                        {"method": "email", "minutes": 1440}
                    ]
                }
            }

            created_event = service.events().insert(
                calendarId="primary",
                body=event_body,
                conferenceDataVersion=1,
                sendUpdates="all"
            ).execute()

            logger.info(f"Google Calendar event created: {created_event.get('id')}")

            meet_link = (
                created_event
                .get("conferenceData", {})
                .get("entryPoints", [{}])[0]
                .get("uri")
                or created_event.get("hangoutLink")
            )

            return {
                "event": created_event,
                "meet_link": meet_link
            }

        except Exception as e:
            logger.error(f"Error syncing with Google Calendar: {e}")
            return None

   
    # Appointment Rescheduling
   
    def reschedule_appointment(
        self,
        db,
        workspace_id: str,
        new_date: str,
        new_time: str,
        new_timezone: str | None = None,
        event_id: str | None = None,
        conversation_id: str | None = None,
        client_email: str | None = None
    ) -> dict:
        """
        Reschedules an existing appointment to a new date and time.
        Validates new slot availability, updates Google Calendar and DB.
        """
        ws_uuid = _to_uuid(workspace_id)
        query = db.query(CalendarEvent).filter(
            CalendarEvent.workspace_id == ws_uuid,
            CalendarEvent.status == "scheduled"
        )

        if event_id:
            event = query.filter(CalendarEvent.id == _to_uuid(event_id)).first()
        elif conversation_id:
            event = query.filter(CalendarEvent.conversation_id == _to_uuid(conversation_id)).order_by(CalendarEvent.created_at.desc()).first()
        elif client_email:
            event = query.filter(CalendarEvent.client_email == client_email).order_by(CalendarEvent.created_at.desc()).first()
        else:
            event = query.order_by(CalendarEvent.created_at.desc()).first()

        if not event:
            return {"status": "not_found", "message": "No active appointment found to reschedule."}

        target_tz = new_timezone or event.timezone or "Asia/Kolkata"
        parsed = self.parse_meeting_datetime(new_date, new_time, target_tz)

        # Check conflict for new time
        check_data = {
            "utc_datetime": parsed["utc_datetime"],
            "duration_minutes": 30
        }
        has_conflict = self.conflict_detection(db, check_data, workspace_id)
        if has_conflict:
            alternative_slots = self.get_available_slots(
                db=db,
                workspace_id=workspace_id,
                target_date=parsed["local_datetime"],
                timezone_str=parsed["timezone"],
                days_ahead=3
            )
            return {
                "status": "conflict",
                "message": f"The requested reschedule slot on {parsed['formatted_display']} is busy.",
                "alternative_slots": alternative_slots[:4]
            }

        # Update local DB event
        event.event_date = parsed["utc_datetime"]
        event.event_time = parsed["time"]
        event.timezone = parsed["timezone"]
        event.updated_at = datetime.now(dt_timezone.utc)

        # Update Google Calendar event
        meet_link = event.meet_link
        service = self.get_google_service(db, workspace_id)
        if service and event.google_event_id:
            try:
                start_iso = parsed["local_datetime"].isoformat()
                end_iso = (parsed["local_datetime"] + timedelta(minutes=30)).isoformat()
                patch_body = {
                    "start": {"dateTime": start_iso, "timeZone": parsed["timezone"]},
                    "end": {"dateTime": end_iso, "timeZone": parsed["timezone"]}
                }
                updated_g_event = service.events().patch(
                    calendarId="primary",
                    eventId=event.google_event_id,
                    body=patch_body,
                    sendUpdates="all"
                ).execute()

                meet_link = (
                    updated_g_event.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri")
                    or updated_g_event.get("hangoutLink")
                    or meet_link
                )
                event.meet_link = meet_link
            except Exception as ge:
                logger.error(f"Failed to update Google Calendar event during reschedule: {ge}")

        db.commit()
        db.refresh(event)

        # Send updated confirmation email
        if event.client_email:
            try:
                self.send_booking_confirmation_email(
                    db=db,
                    workspace_id=workspace_id,
                    event=event,
                    meet_link=meet_link,
                    is_reschedule=True
                )
            except Exception as mail_err:
                logger.warning(f"Could not send reschedule confirmation email: {mail_err}")

        return {
            "status": "success",
            "message": f"Appointment successfully rescheduled to {parsed['formatted_display']} ({parsed['timezone']}).",
            "event_id": str(event.id),
            "meet_link": meet_link,
            "formatted_display": parsed["formatted_display"],
            "timezone": parsed["timezone"]
        }

   
    # Appointment Cancellation
   
    def cancel_appointment(
        self,
        db,
        workspace_id: str,
        event_id: str | None = None,
        conversation_id: str | None = None,
        client_email: str | None = None
    ) -> dict:
        """
        Cancels an active appointment in DB and Google Calendar.
        """
        ws_uuid = _to_uuid(workspace_id)
        query = db.query(CalendarEvent).filter(
            CalendarEvent.workspace_id == ws_uuid,
            CalendarEvent.status == "scheduled"
        )

        if event_id:
            event = query.filter(CalendarEvent.id == _to_uuid(event_id)).first()
        elif conversation_id:
            event = query.filter(CalendarEvent.conversation_id == _to_uuid(conversation_id)).order_by(CalendarEvent.created_at.desc()).first()
        elif client_email:
            event = query.filter(CalendarEvent.client_email == client_email).order_by(CalendarEvent.created_at.desc()).first()
        else:
            event = query.order_by(CalendarEvent.created_at.desc()).first()

        if not event:
            return {"status": "not_found", "message": "No active appointment found to cancel."}

        event.status = "cancelled"
        event.updated_at = datetime.now(dt_timezone.utc)

        # Delete / cancel from Google Calendar
        service = self.get_google_service(db, workspace_id)
        if service and event.google_event_id:
            try:
                service.events().delete(
                    calendarId="primary",
                    eventId=event.google_event_id,
                    sendUpdates="all"
                ).execute()
                logger.info(f"Google Calendar event {event.google_event_id} deleted successfully.")
            except Exception as ge:
                logger.warning(f"Failed to delete Google Calendar event: {ge}")

        db.commit()

        return {
            "status": "success",
            "message": "Your appointment has been successfully cancelled.",
            "event_id": str(event.id)
        }

   
    # Confirmation Email
   
    def send_booking_confirmation_email(self, db, workspace_id, event: CalendarEvent, meet_link: str | None = None, is_reschedule: bool = False):
        if not event.client_email or "@" not in str(event.client_email):
            logger.info("Skipping booking confirmation email: no valid client email")
            return {"status": "skipped", "reason": "No valid client email"}

        ws_uuid = _to_uuid(workspace_id)
        from app.models.workspace import Workspace
        ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first() if db else None
        workspace_name = ws.name if ws else "Orbion Agents"

        subject_prefix = "Rescheduled: " if is_reschedule else "Confirmed: "
        subject = f"{subject_prefix}Demo Meeting with {workspace_name}"

        formatted_time = f"{event.event_date.strftime('%A, %B %d, %Y')} at {event.event_time} ({event.timezone})"
        meet_section = (
            f"<div style='margin: 20px 0; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;'>"
            f"<p style='margin: 0 0 8px 0; font-weight: bold; color: #166534; font-size: 15px;'>🎥 Google Meet Video Call</p>"
            f"<p style='margin: 0 0 10px 0;'><a href='{meet_link}' style='display: inline-block; padding: 10px 22px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;'>Join Google Meet</a></p>"
            f"<p style='margin: 0; font-size: 12px; color: #4b5563;'>Direct link: <a href='{meet_link}' style='color: #2563eb;'>{meet_link}</a></p>"
            f"</div>"
        ) if meet_link else "<p style='color: #4b5563;'><strong>Location:</strong> Online Meeting</p>"

        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.6; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
            <div style="border-bottom: 2px solid #f3f4f6; padding-bottom: 16px; margin-bottom: 20px;">
                <h2 style="color: #111827; margin: 0; font-size: 22px;">
                    {'Appointment Rescheduled' if is_reschedule else 'Appointment Confirmed'}
                </h2>
                <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">{workspace_name} Demo & Discovery Call</p>
            </div>
            
            <p style="font-size: 15px;">Hi <strong>{event.client_name or 'there'}</strong>,</p>
            <p style="font-size: 14px; color: #374151;">
                {'Your demo appointment has been successfully rescheduled.' if is_reschedule else 'Thank you for booking a demo with us! Your session is confirmed.'}
            </p>
            
            <div style="background: #f9fafb; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; font-size: 14px;">
                <p style="margin: 6px 0;"><strong>📅 Date & Time:</strong> {formatted_time}</p>
                <p style="margin: 6px 0;"><strong>👤 Client Name:</strong> {event.client_name or 'Valued Client'}</p>
                <p style="margin: 6px 0;"><strong>📧 Email:</strong> {event.client_email}</p>
                <p style="margin: 6px 0;"><strong>📱 Phone:</strong> {event.client_phone or 'N/A'}</p>
                <p style="margin: 6px 0;"><strong>🏢 Organization:</strong> {workspace_name}</p>
            </div>

            {meet_section}

            <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 6px 0; font-weight: bold; color: #1e293b; font-size: 13px;">📌 Next Steps & Preparation:</p>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569;">
                    <li>Please join the meeting link 2 minutes before the scheduled time.</li>
                    <li>Ensure your audio and video connections are working properly.</li>
                    <li>If you need to reschedule or cancel, reply in chat anytime.</li>
                </ul>
            </div>

            <p style="font-size: 12px; color: #9ca3af; margin-top: 28px; border-top: 1px solid #f3f4f6; padding-top: 14px; text-align: center;">
                Sent on behalf of <strong>{workspace_name}</strong> by Orbion AI Assistant.
            </p>
        </div>
        """

        plain_text = (
            f"{'Meeting Rescheduled' if is_reschedule else 'Appointment Confirmed'}\n\n"
            f"Hi {event.client_name or 'there'},\n\n"
            f"{'Your demo appointment has been rescheduled.' if is_reschedule else 'Thank you for scheduling a demo with us!'}\n\n"
            f"Date & Time: {formatted_time}\n"
            f"Client: {event.client_name or 'Valued Client'}\n"
            f"Email: {event.client_email}\n"
            f"Organization: {workspace_name}\n"
            f"{f'Google Meet: {meet_link}' if meet_link else 'Location: Online Meeting'}\n\n"
            f"Best regards,\n{workspace_name} Team"
        )

        send_res = EmailService.send_email_for_workspace(
            db=db,
            workspace_id=workspace_id,
            to_email=event.client_email,
            subject=subject,
            body=html_body,
            plain_text=plain_text,
            metadata={"workspace_id": str(workspace_id), "event_id": str(event.id)}
        )
        logger.info(f"Booking confirmation email dispatched for {event.client_email}: {send_res}")
        return send_res

   
    # Backwards-Compatible Helpers
   
    def create_remainder(self, event: CalendarEvent) -> list:
        try:
            event_time = event.event_date
            reminders = [
                {"event_id": event.id, "reminder_time": event_time - timedelta(hours=1), "type": "1_hour_before"},
                {"event_id": event.id, "reminder_time": event_time - timedelta(minutes=10), "type": "10_minutes_before"}
            ]
            return reminders
        except Exception as e:
            logger.error(f"Reminder creation error: {e}")
            return []

    def notify_send(self, event: CalendarEvent) -> dict | None:
        try:
            notification = {
                "title": "New Meeting Scheduled",
                "message": f"{event.title} at {event.event_time}",
                "location": event.location,
                "event_id": str(event.id)
            }
            logger.info(f"Calendar notification generated: {notification}")
            return notification
        except Exception as e:
            logger.error(f"Notification error: {e}")
            return None

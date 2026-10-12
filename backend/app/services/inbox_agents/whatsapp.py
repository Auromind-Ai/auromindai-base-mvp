import requests
import logging
import json
from typing import Optional

logger = logging.getLogger(__name__)


class WhatsAppService:

    def __init__(self, access_token: str, phone_number_id: str):
        from app.services.config_service import config_service
        # Meta Embedded Signup strictly requires the Solution Provider's System User Token to send messages.
        self.access_token = config_service.get("meta_system_user_token") or access_token
        self.phone_number_id = phone_number_id
        self.base_url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    @staticmethod
    def _clean_recipient_phone(to: str) -> str:
        clean = "".join(filter(str.isdigit, str(to or "")))
        if clean.startswith("0"):
            clean = clean.lstrip("0")
        if len(clean) == 10:
            clean = f"91{clean}"
        elif len(clean) == 14 and clean.startswith("9191"):
            clean = clean[2:]
        return clean

    # SEND TEXT MESSAGE
    
    def send_text_message(self, to: str, message: str) -> Optional[str]:
        try:
            to = self._clean_recipient_phone(to)
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {
                    "body": message
                }
            }
            # Debug log without token details
            logger.debug(f"Sending WhatsApp text message to: {to}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers(),
                timeout=10
            )

            # Log response status for verification
            logger.debug(f"WhatsApp send response status: {response.status_code}")

            data = response.json()

            if response.status_code != 200:
                logger.error(f"WhatsApp send error: {data}")
                return None

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"WhatsApp message sent: {message_id}")

            return message_id

        except Exception as e:
            logger.error(f"Send message failed: {str(e)}")
            return None

    # SEND TEMPLATE MESSAGE 
    def send_template(
        self,
        to: str,
        template_name: str,
        language: str = "en_US",
        components: list = None
    ) -> Optional[str]:
        try:
            to = self._clean_recipient_phone(to)
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": language
                    }
                }
            }

            if components:
                payload["template"]["components"] = components

            # Debug log template payload details safely
            logger.debug(f"Sending WhatsApp template message to: {to}, Template: {template_name}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers(),
                timeout=10
            )

            # Log response status for verification
            logger.debug(f"WhatsApp template send response status: {response.status_code}")

            data = response.json()

            if response.status_code != 200:
                logger.error(f"Template send error: {data}")
                err_obj = data.get("error", {})
                err_code = err_obj.get("code")
                err_detail = err_obj.get("message") or err_obj.get("error_user_msg") or str(data)
                err_data_details = str(err_obj.get("error_data", {}).get("details", "")).lower()
                if (
                    err_code == 131026
                    or "incapable of receiving" in err_data_details
                    or "not a valid whatsapp user" in err_data_details
                    or "not a valid whatsapp user" in err_detail.lower()
                    or "undeliverable" in err_detail.lower()
                ):
                    raise RuntimeError(f"The recipient +{to} does not have an active WhatsApp account.")
                raise RuntimeError(f"WhatsApp API Error ({response.status_code}): {err_detail}")

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"Template sent: {message_id}")

            return message_id

        except RuntimeError:
            raise
        except Exception as e:
            logger.error(f"Send template failed: {str(e)}")
            raise RuntimeError(f"Send template failed: {str(e)}")

    # MARK MESSAGE AS READ
    def mark_as_read(self, message_id: str):
        try:
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers(),
                timeout=10
            )

            if response.status_code != 200:
                logger.warning(f"Mark read failed: {response.json()}")

        except Exception as e:
            logger.error(f"Mark read error: {str(e)}")

    def upload_media_to_meta(self, file_bytes: bytes, mime_type: str, filename: str) -> Optional[str]:
        try:
            url = f"https://graph.facebook.com/v19.0/{self.phone_number_id}/media"
            headers = {"Authorization": f"Bearer {self.access_token}"}
            files = {
                "file": (filename, file_bytes, mime_type),
            }
            data = {
                "messaging_product": "whatsapp",
                "type": mime_type,
            }
            res = requests.post(url, headers=headers, files=files, data=data, timeout=30)
            if res.status_code == 200:
                res_data = res.json()
                media_id = res_data.get("id")
                logger.info(f"Successfully uploaded media to Meta: id={media_id}")
                return media_id
            logger.error(f"Meta media upload failed ({res.status_code}): {res.text}")
            return None
        except Exception as e:
            logger.error(f"Error uploading media to Meta: {e}")
            return None

    def _resolve_media_bytes(self, media_url: str) -> Optional[tuple[bytes, str, str]]:
        """Resolves raw media bytes, MIME type, and filename from local storage or URL."""
        try:
            from pathlib import Path
            import mimetypes
            from urllib.parse import urlparse, unquote

            parsed = urlparse(media_url)
            clean_path = unquote(parsed.path)

            if clean_path.startswith("/temp_uploads/"):
                rel_path = clean_path[len("/temp_uploads/"):]
            elif "temp_uploads" in clean_path:
                rel_path = clean_path.split("temp_uploads/")[-1]
            else:
                rel_path = clean_path.lstrip("/")

            # 1. Try resolving via get_storage()
            try:
                from app.services.storage.service import get_storage
                storage = get_storage()
                b = storage.get_file_bytes(rel_path)
                mime, _ = mimetypes.guess_type(rel_path)
                return b, mime or "application/octet-stream", Path(rel_path).name
            except Exception:
                pass

            # 2. Check local directories
            candidate_dirs = [
                Path(__file__).resolve().parents[3] / "temp_uploads",
                Path(__file__).resolve().parents[4] / "temp_uploads",
                Path.cwd() / "temp_uploads",
                Path.cwd() / "backend" / "temp_uploads",
            ]
            for c_dir in candidate_dirs:
                local_candidate = c_dir / rel_path
                if local_candidate.exists() and local_candidate.is_file():
                    b = local_candidate.read_bytes()
                    mime, _ = mimetypes.guess_type(str(local_candidate))
                    return b, mime or "application/octet-stream", local_candidate.name

            # 3. Try fetching from URL if http/https
            if media_url.startswith("http://") or media_url.startswith("https://"):
                r = requests.get(media_url, timeout=15)
                if r.status_code == 200:
                    mime = r.headers.get("content-type", "application/octet-stream").split(";")[0].strip()
                    name = Path(parsed.path).name or "media"
                    return r.content, mime, name
        except Exception as e:
            logger.warning(f"Could not resolve media bytes for {media_url}: {e}")
        return None

    @staticmethod
    def _convert_audio_for_whatsapp(file_bytes: bytes, mime_type: str = "audio/webm") -> tuple[bytes, str, str]:
        """Converts audio to WhatsApp-compliant Opus OGG format using ffmpeg if needed."""
        import shutil, subprocess, tempfile, os
        ffmpeg_bin = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
        if not os.path.exists(ffmpeg_bin):
            return file_bytes, mime_type or "audio/ogg", "voice_note.ogg"

        with tempfile.NamedTemporaryFile(suffix=".input", delete=False) as in_f:
            in_f.write(file_bytes)
            in_path = in_f.name

        out_path = in_path + ".ogg"
        try:
            cmd = [
                ffmpeg_bin, "-y", "-i", in_path,
                "-c:a", "libopus", "-b:a", "64k",
                "-f", "ogg", out_path
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True, timeout=15)
            with open(out_path, "rb") as out_f:
                converted_bytes = out_f.read()
            return converted_bytes, "audio/ogg", "voice_note.ogg"
        except Exception as e:
            logger.warning(f"FFmpeg audio conversion to Opus failed: {e}")
            return file_bytes, "audio/ogg", "voice_note.ogg"
        finally:
            for p in (in_path, out_path):
                if os.path.exists(p):
                    try:
                        os.unlink(p)
                    except Exception:
                        pass

    # SEND MEDIA MESSAGE (IMAGE / VIDEO / DOCUMENT / AUDIO)
    def send_media_message(
        self,
        to: str,
        media_url: str,
        media_type: str = "image",
        caption: Optional[str] = None
    ) -> Optional[str]:
        try:
            to = self._clean_recipient_phone(to)
            media_type = media_type.lower()
            if media_type not in {"image", "video", "document", "audio"}:
                media_type = "image"

            media_id = None
            resolved = self._resolve_media_bytes(media_url)
            if resolved:
                raw_bytes, raw_mime, filename = resolved
                if media_type == "audio":
                    audio_bytes, audio_mime, audio_name = self._convert_audio_for_whatsapp(raw_bytes, raw_mime)
                    media_id = self.upload_media_to_meta(audio_bytes, audio_mime, audio_name)
                elif not (media_url.startswith("https://") and "localhost" not in media_url and "127.0.0.1" not in media_url):
                    media_id = self.upload_media_to_meta(raw_bytes, raw_mime, filename)

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": media_type,
            }

            if media_id:
                payload[media_type] = {"id": media_id}
            else:
                payload[media_type] = {"link": media_url}

            if caption and media_type in {"image", "video", "document"}:
                import re
                if not re.match(r"^\[(IMAGE|VIDEO|AUDIO|VOICE|DOCUMENT)\]$", caption.strip(), re.I):
                    payload[media_type]["caption"] = caption

            if media_type == "document" and "filename" not in payload[media_type]:
                import os
                from urllib.parse import urlparse
                filename = os.path.basename(urlparse(media_url).path) or "document"
                payload[media_type]["filename"] = filename

            logger.debug(f"Sending WhatsApp {media_type} message to: {to}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers(),
                timeout=15
            )

            logger.debug(f"WhatsApp send {media_type} response status: {response.status_code}")
            data = response.json()

            if response.status_code != 200:
                logger.error(f"WhatsApp send {media_type} error: {data}")
                err_detail = data.get("error", {}).get("message") or str(data)
                raise RuntimeError(f"WhatsApp API Error ({response.status_code}): {err_detail}")

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"WhatsApp {media_type} message sent: {message_id}")
            return message_id

        except Exception as e:
            logger.error(f"Send {media_type} failed: {str(e)}")
            raise

    # SEND INTERACTIVE BUTTONS (REPLY BUTTONS - MAX 3) WITH OPTIONAL MEDIA HEADER
    def send_interactive_buttons(
        self,
        to: str,
        text: str,
        buttons: list,
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
        media_url: Optional[str] = None,
        media_type: Optional[str] = None,
    ) -> Optional[str]:
        try:
            to = self._clean_recipient_phone(to)
            formatted_buttons = []
            for i, btn in enumerate(buttons[:3]):
                label = btn.get("label") or btn.get("title") or f"Option {i+1}"
                val = btn.get("value") or btn.get("id") or label
                if len(label) > 20:
                    label = label[:17] + "..."
                formatted_buttons.append({
                    "type": "reply",
                    "reply": {
                        "id": val,
                        "title": label
                    }
                })

            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {
                        "text": text or "Choose an option below:"
                    },
                    "action": {
                        "buttons": formatted_buttons
                    }
                }
            }

            if media_url and media_type:
                m_type = media_type.lower()
                if m_type in {"image", "video", "document"}:
                    payload["interactive"]["header"] = {
                        "type": m_type,
                        m_type: {
                            "link": media_url
                        }
                    }
            elif header_text:
                payload["interactive"]["header"] = {
                    "type": "text",
                    "text": header_text
                }

            if footer_text:
                payload["interactive"]["footer"] = {
                    "text": footer_text
                }

            logger.debug(f"Sending WhatsApp interactive buttons to: {to}")

            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers(),
                timeout=10
            )

            logger.debug(f"WhatsApp interactive buttons response status: {response.status_code}")
            data = response.json()

            if response.status_code != 200:
                logger.error(f"WhatsApp interactive buttons send error: {data}")
                return None

            message_id = data.get("messages", [{}])[0].get("id")
            logger.info(f"WhatsApp interactive buttons sent: {message_id}")
            return message_id

        except Exception as e:
            logger.error(f"Send interactive buttons failed: {str(e)}")
            return None
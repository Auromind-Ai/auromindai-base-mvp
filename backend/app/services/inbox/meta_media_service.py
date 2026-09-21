import os
import time
import json
import uuid
import logging
from pathlib import Path
from typing import Optional, Any
import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.config_service import config_service
from app.services.storage.service import get_storage, LocalStorageProvider
from app.models.media import MediaFile
from app.models.message import Message
from app.models.workspace import Workspace

logger = logging.getLogger(__name__)

FAILED_META_MEDIA_CACHE: dict[str, float] = {}

MIME_EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/x-m4a": ".m4a",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}

EXTENSION_MIME_MAP = {v: k for k, v in MIME_EXTENSION_MAP.items()}


def _to_uuid(val: Any) -> Optional[uuid.UUID]:
    if not val:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


class MetaMediaService:
    @staticmethod
    def get_cached_media(
        workspace_id: str | uuid.UUID,
        media_id: str,
        message: Optional[Message] = None,
        db: Optional[Session] = None,
    ) -> tuple[Optional[bytes], Optional[str], Optional[str]]:
        """
        Check if media is already saved in persistent storage or on local disk.
        Returns: (file_bytes, mime_type, stored_path) or (None, None, None)
        """
        media_id = str(media_id).strip()
        if not media_id:
            return None, None, None

        ws_uuid = _to_uuid(workspace_id)
        storage = get_storage()

        # 1. Check message metadata_json for stored_path
        stored_path = None
        mime_type = None
        if message and message.metadata_json:
            meta = message.metadata_json
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            if isinstance(meta, dict):
                stored_path = meta.get("stored_path")
                mime_type = meta.get("mime_type")

        if stored_path:
            try:
                content = storage.get_file_bytes(stored_path)
                if content:
                    logger.debug("Meta media %s hit via message stored_path %s", media_id, stored_path)
                    return content, mime_type or "application/octet-stream", stored_path
            except Exception as exc:
                logger.debug("Could not read stored_path %s: %s", stored_path, exc)

        # 2. Check MediaFile table in DB
        if db and ws_uuid:
            try:
                mf = (
                    db.query(MediaFile)
                    .filter(
                        MediaFile.workspace_id == ws_uuid,
                        MediaFile.file_path.contains(media_id),
                    )
                    .first()
                )
                if mf and mf.file_path:
                    try:
                        content = storage.get_file_bytes(mf.file_path)
                        if content:
                            logger.debug("Meta media %s hit via MediaFile record %s", media_id, mf.file_path)
                            return content, mf.mime_type or "application/octet-stream", mf.file_path
                    except Exception as exc:
                        logger.debug("Could not read MediaFile path %s: %s", mf.file_path, exc)
            except Exception as exc:
                logger.debug("MediaFile lookup failed: %s", exc)

        # 3. Check local disk fallback if using LocalStorageProvider
        if isinstance(storage.provider, LocalStorageProvider) and ws_uuid:
            try:
                media_dir = storage.provider.upload_dir / str(ws_uuid) / "meta_media"
                if media_dir.exists():
                    for f in media_dir.iterdir():
                        if f.stem == media_id and f.is_file():
                            content = f.read_bytes()
                            rel_path = f"{ws_uuid}/meta_media/{f.name}"
                            ext = f.suffix.lower()
                            guessed_mime = EXTENSION_MIME_MAP.get(ext, "application/octet-stream")
                            logger.debug("Meta media %s hit via local file %s", media_id, f)
                            return content, guessed_mime, rel_path
            except Exception as exc:
                logger.debug("Local disk search failed for %s: %s", media_id, exc)

        return None, None, None

    @staticmethod
    def download_and_store_meta_media(
        workspace_id: str | uuid.UUID,
        media_id: str,
        message_id: Optional[str | uuid.UUID] = None,
        access_token: Optional[str] = None,
        mime_type: Optional[str] = None,
        media_type: Optional[str] = None,
        db: Optional[Session] = None,
    ) -> tuple[Optional[bytes], Optional[str], Optional[str]]:
        """
        Download media from Meta Graph API, save to storage, and update DB.
        Returns: (file_bytes, mime_type, stored_path) or (None, None, None)
        """
        media_id = str(media_id).strip()
        if not media_id:
            return None, None, None

        ws_uuid = _to_uuid(workspace_id)
        storage = get_storage()

        # 1. Fast check if already cached
        content, cached_mime, stored_path = MetaMediaService.get_cached_media(
            workspace_id=workspace_id,
            media_id=media_id,
            db=db,
        )
        if content:
            return content, cached_mime, stored_path

        # 2. Check failure cache
        if FAILED_META_MEDIA_CACHE.get(media_id, 0) > time.time():
            logger.debug("Meta media %s is in negative cache (expired/unavailable)", media_id)
            return None, None, None

        # 3. Resolve access token
        tokens_to_try = []
        if access_token:
            tokens_to_try.append(access_token)

        ws_token = None
        if db and ws_uuid:
            try:
                ws = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
                if ws and ws.meta_access_token:
                    ws_token = ws.meta_access_token
                    if ws_token not in tokens_to_try:
                        tokens_to_try.append(ws_token)
            except Exception as ws_err:
                logger.warning("Failed to lookup workspace for access token: %s", ws_err)

        system_token = config_service.get("meta_system_user_token") or os.getenv("META_SYSTEM_USER_TOKEN")
        if system_token and system_token not in tokens_to_try:
            tokens_to_try.append(system_token)

        if not tokens_to_try:
            logger.error("No Meta access token available for workspace %s to fetch media %s", workspace_id, media_id)
            return None, None, None

        # 4. Request Meta Graph API for temporary download URL
        meta_url = f"https://graph.facebook.com/v19.0/{media_id}"
        media_info = None
        working_token = None

        for tok in tokens_to_try:
            try:
                res = requests.get(
                    meta_url,
                    headers={"Authorization": f"Bearer {tok}"},
                    timeout=15,
                )
                if res.status_code == 200:
                    media_info = res.json()
                    working_token = tok
                    break
                elif res.status_code in (401, 403):
                    logger.warning("Token failed with HTTP %s for media %s, trying next token if available", res.status_code, media_id)
                    continue
                elif res.status_code in (400, 404):
                    logger.info("Meta reported media %s as expired or not found (HTTP %s)", media_id, res.status_code)
                    FAILED_META_MEDIA_CACHE[media_id] = time.time() + 3600
                    _mark_media_expired_in_db(db, message_id)
                    return None, None, None
            except requests.RequestException as req_exc:
                logger.warning("Meta Graph API request error for media %s: %s", media_id, req_exc)
                continue

        if not media_info or not working_token:
            FAILED_META_MEDIA_CACHE[media_id] = time.time() + 1800
            _mark_media_expired_in_db(db, message_id)
            return None, None, None

        temporary_url = media_info.get("url")
        if not temporary_url:
            logger.warning("Meta response did not contain media download URL: %s", media_info)
            return None, None, None

        # 5. Determine MIME type & extension
        resolved_mime = (
            media_info.get("mime_type")
            or mime_type
            or "application/octet-stream"
        ).split(";")[0].strip().lower()

        ext = MIME_EXTENSION_MAP.get(resolved_mime, "")
        if not ext:
            if media_type == "image":
                ext = ".jpg"
            elif media_type in ("audio", "voice"):
                ext = ".ogg"
            elif media_type == "video":
                ext = ".mp4"
            elif media_type == "document":
                ext = ".pdf"
            else:
                ext = ".bin"

        # 6. Download media bytes from temporary URL
        try:
            download_res = requests.get(
                temporary_url,
                headers={"Authorization": f"Bearer {working_token}"},
                timeout=30,
            )
            if download_res.status_code not in (200, 206):
                logger.warning("Downloading media from Meta temporary URL failed with HTTP %s", download_res.status_code)
                if download_res.status_code in (403, 404):
                    FAILED_META_MEDIA_CACHE[media_id] = time.time() + 3600
                    _mark_media_expired_in_db(db, message_id)
                return None, None, None

            file_bytes = download_res.content
            if not file_bytes:
                logger.warning("Downloaded empty media bytes for media %s", media_id)
                return None, None, None

        except requests.RequestException as dl_exc:
            logger.error("Failed to download media content from Meta for media %s: %s", media_id, dl_exc)
            return None, None, None

        # 7. Persist file to storage
        relative_path = f"{ws_uuid}/meta_media/{media_id}{ext}"
        try:
            storage.save_file_sync(relative_path, file_bytes, resolved_mime)
            logger.info("Successfully persisted Meta media %s to storage at %s (%d bytes)", media_id, relative_path, len(file_bytes))
        except Exception as save_exc:
            logger.error("Failed to save media %s to storage: %s", media_id, save_exc)
            # Return downloaded bytes even if storage save fails so caller can still serve it
            return file_bytes, resolved_mime, None

        # 8. Record in DB (MediaFile + Message metadata)
        if db and ws_uuid:
            try:
                # Check if MediaFile record already exists
                existing_mf = (
                    db.query(MediaFile)
                    .filter(
                        MediaFile.workspace_id == ws_uuid,
                        MediaFile.file_path == relative_path,
                    )
                    .first()
                )
                if not existing_mf:
                    db_file = MediaFile(
                        workspace_id=ws_uuid,
                        file_path=relative_path,
                        file_type=media_type or "image",
                        original_filename=f"meta_{media_id}{ext}",
                        file_size=len(file_bytes),
                        mime_type=resolved_mime,
                    )
                    db.add(db_file)

                # Update Message metadata
                msg_uuid = _to_uuid(message_id)
                if msg_uuid:
                    msg = db.query(Message).filter(Message.id == msg_uuid).first()
                    if msg:
                        meta = {}
                        if msg.metadata_json:
                            try:
                                meta = json.loads(msg.metadata_json) if isinstance(msg.metadata_json, str) else msg.metadata_json
                            except Exception:
                                meta = {}
                        meta["stored_path"] = relative_path
                        meta["is_cached"] = True
                        meta["file_size"] = len(file_bytes)
                        meta["mime_type"] = resolved_mime
                        msg.metadata_json = json.dumps(meta)

                db.commit()
            except Exception as db_commit_err:
                db.rollback()
                logger.warning("Failed to save media record/metadata to database: %s", db_commit_err)

        return file_bytes, resolved_mime, relative_path

    @staticmethod
    async def download_and_store_meta_media_background(
        workspace_id: str,
        media_id: str,
        message_external_id: Optional[str] = None,
        message_id: Optional[str] = None,
        mime_type: Optional[str] = None,
        media_type: Optional[str] = None,
    ) -> None:
        """
        Background task triggered upon webhook ingestion to download and store
        media proactively before it expires on Meta servers.
        """
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            resolved_msg_id = message_id
            if not resolved_msg_id and message_external_id:
                msg = db.query(Message).filter(Message.external_id == message_external_id).first()
                if msg:
                    resolved_msg_id = str(msg.id)

            logger.info("Starting background download of Meta media %s for workspace %s", media_id, workspace_id)
            MetaMediaService.download_and_store_meta_media(
                workspace_id=workspace_id,
                media_id=media_id,
                message_id=resolved_msg_id,
                mime_type=mime_type,
                media_type=media_type,
                db=db,
            )
        except Exception as bg_exc:
            logger.warning("Background download of Meta media %s encountered an error: %s", media_id, bg_exc)
        finally:
            db.close()


def _mark_media_expired_in_db(db: Optional[Session], message_id: Optional[str | uuid.UUID]) -> None:
    if not db or not message_id:
        return
    msg_uuid = _to_uuid(message_id)
    if not msg_uuid:
        return
    try:
        msg = db.query(Message).filter(Message.id == msg_uuid).first()
        if msg:
            meta = {}
            if msg.metadata_json:
                try:
                    meta = json.loads(msg.metadata_json) if isinstance(msg.metadata_json, str) else msg.metadata_json
                except Exception:
                    meta = {}
            meta["media_expired"] = True
            msg.metadata_json = json.dumps(meta)
            db.commit()
    except Exception as exc:
        db.rollback()
        logger.debug("Failed to mark media expired in message: %s", exc)

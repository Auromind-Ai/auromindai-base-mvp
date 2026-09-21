import uuid
import time
import json
import pytest
from unittest.mock import patch, MagicMock
from app.routers.inbox_chennal.conversations import create_media_token, verify_media_token
from app.services.inbox.meta_media_service import MetaMediaService, FAILED_META_MEDIA_CACHE
from app.models.message import Message


def test_create_media_token_stability():
    """Verify that create_media_token generates identical tokens across frequent calls in the same time bucket."""
    media_id = "test_media_123"
    ws_id = str(uuid.uuid4())

    token1 = create_media_token(media_id, ws_id)
    token2 = create_media_token(media_id, ws_id)

    assert token1 == token2, "Tokens generated in the same time bucket must be identical to enable browser caching"
    assert verify_media_token(token1, media_id, ws_id) is True


def test_verify_media_token_rejects_tampered():
    """Verify that tampering with token or media_id fails verification."""
    media_id = "test_media_123"
    ws_id = str(uuid.uuid4())

    token = create_media_token(media_id, ws_id)
    assert verify_media_token(token, "different_media_id", ws_id) is False
    assert verify_media_token(token, media_id, str(uuid.uuid4())) is False
    assert verify_media_token("invalid.token.structure", media_id, ws_id) is False


def test_get_cached_media_from_message_metadata():
    """Verify get_cached_media finds content if stored_path is in message metadata."""
    ws_id = uuid.uuid4()
    media_id = "media_abc"
    fake_bytes = b"fake-image-bytes-content"

    msg = MagicMock(spec=Message)
    msg.metadata_json = json.dumps({
        "stored_path": f"{ws_id}/meta_media/{media_id}.jpg",
        "mime_type": "image/jpeg",
        "is_cached": True,
    })

    with patch("app.services.inbox.meta_media_service.get_storage") as mock_get_storage:
        mock_storage = MagicMock()
        mock_storage.get_file_bytes.return_value = fake_bytes
        mock_get_storage.return_value = mock_storage

        content, mime_type, stored_path = MetaMediaService.get_cached_media(
            workspace_id=ws_id,
            media_id=media_id,
            message=msg,
        )

        assert content == fake_bytes
        assert mime_type == "image/jpeg"
        assert stored_path == f"{ws_id}/meta_media/{media_id}.jpg"
        mock_storage.get_file_bytes.assert_called_once_with(f"{ws_id}/meta_media/{media_id}.jpg")


def test_download_and_store_meta_media_success():
    """Verify download_and_store_meta_media downloads from Meta and saves to storage."""
    ws_id = str(uuid.uuid4())
    media_id = "media_download_test"
    fake_content = b"\xff\xd8\xff\xe0\x00\x10JFIF"  # JPEG magic bytes

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    with patch.object(MetaMediaService, "get_cached_media", return_value=(None, None, None)), \
         patch("app.services.inbox.meta_media_service.requests.get") as mock_requests_get, \
         patch("app.services.inbox.meta_media_service.get_storage") as mock_get_storage:

        mock_storage = MagicMock()
        mock_get_storage.return_value = mock_storage

        # First request gets media info from Meta Graph API
        meta_info_resp = MagicMock()
        meta_info_resp.status_code = 200
        meta_info_resp.json.return_value = {
            "url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/temp_url",
            "mime_type": "image/jpeg",
        }

        # Second request downloads the binary from temporary_url
        download_resp = MagicMock()
        download_resp.status_code = 200
        download_resp.content = fake_content

        mock_requests_get.side_effect = [meta_info_resp, download_resp]

        content, mime_type, stored_path = MetaMediaService.download_and_store_meta_media(
            workspace_id=ws_id,
            media_id=media_id,
            access_token="fake_access_token",
            db=mock_db,
        )

        assert content == fake_content
        assert mime_type == "image/jpeg"
        assert stored_path == f"{ws_id}/meta_media/{media_id}.jpg"
        mock_storage.save_file_sync.assert_called_once_with(stored_path, fake_content, "image/jpeg")


def test_download_and_store_meta_media_expired_404():
    """Verify download_and_store_meta_media handles Meta 404 gracefully and negative-caches."""
    ws_id = str(uuid.uuid4())
    media_id = "expired_media_404"

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    with patch.object(MetaMediaService, "get_cached_media", return_value=(None, None, None)), \
         patch("app.services.inbox.meta_media_service.requests.get") as mock_requests_get:

        meta_404_resp = MagicMock()
        meta_404_resp.status_code = 404
        mock_requests_get.return_value = meta_404_resp

        content, mime_type, stored_path = MetaMediaService.download_and_store_meta_media(
            workspace_id=ws_id,
            media_id=media_id,
            access_token="fake_access_token",
            db=mock_db,
        )

        assert content is None
        assert mime_type is None
        assert stored_path is None
        assert FAILED_META_MEDIA_CACHE.get(media_id, 0) > time.time()

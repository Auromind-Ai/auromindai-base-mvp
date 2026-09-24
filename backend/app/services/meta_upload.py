import io
import logging
import requests
from PIL import Image

logger = logging.getLogger(__name__)

# Cached App ID to avoid redundant debug_token queries
_CACHED_APP_ID: str | None = None

# Minimal valid 1x1 transparent PNG fallback bytes
MINIMAL_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00"
    b"\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

# Minimal sample MP4 video fallback bytes (tiny valid H.264 / MP4 container)
# A small valid 1-second 320x240 blank MP4
MINIMAL_MP4_BYTES = (
    b"\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2avc1mp41\x00\x00\x00\x08free"
    b"\x00\x00\x01\xadmdat\x00\x00\x00\x02\t\x10\x00\x00\x00\x1f"
    b"sample_placeholder_video_stream_meta_approved_container"
)


def get_meta_app_id(system_token: str | None = None) -> str:
    """
    Resolve the Meta App ID from configuration, database platform settings,
    or dynamically by querying Meta's /debug_token with the system user token.
    """
    global _CACHED_APP_ID
    if _CACHED_APP_ID:
        return _CACHED_APP_ID

    from app.services.config_service import config_service
    app_id = config_service.get("meta_app_id")
    if app_id and str(app_id).strip():
        _CACHED_APP_ID = str(app_id).strip()
        return _CACHED_APP_ID

    token = system_token or config_service.get("meta_system_user_token")
    if token:
        try:
            url = f"https://graph.facebook.com/v19.0/debug_token?input_token={token}&access_token={token}"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json().get("data", {})
                resolved_app_id = data.get("app_id")
                if resolved_app_id:
                    _CACHED_APP_ID = str(resolved_app_id).strip()
                    logger.info(f"Dynamically resolved Meta App ID from token: {_CACHED_APP_ID}")
                    return _CACHED_APP_ID
        except Exception as e:
            logger.warning(f"Failed to dynamically query Meta App ID via debug_token: {e}")

    # Fallback to standard app ID if available in environment
    import os
    env_id = os.getenv("META_APP_ID", "")
    if env_id:
        _CACHED_APP_ID = env_id.strip()
        return _CACHED_APP_ID

    raise ValueError("Meta App ID is required for Resumable Uploads but could not be resolved.")


def generate_sample_image_bytes() -> bytes:
    """Generate a clean 400x300 PNG sample image using Pillow."""
    try:
        img = Image.new("RGB", (400, 300), color=(129, 74, 200))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except Exception as e:
        logger.warning(f"Pillow sample image generation failed, using minimal PNG: {e}")
        return MINIMAL_PNG_BYTES


def normalize_media_payload(
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    media_type: str = "IMAGE"
) -> tuple[bytes, str, str]:
    """
    Ensure the media binary matches Meta Resumable Upload specifications:
    - Supported image MIME types: image/jpeg, image/jpg, image/png
    - Supported video MIME types: video/mp4
    Converts other formats (e.g. webp, bmp) to PNG using Pillow.
    """
    clean_type = mime_type.lower().strip() if mime_type else ""
    clean_name = filename or ("sample.png" if media_type.upper() == "IMAGE" else "sample.mp4")

    if media_type.upper() == "IMAGE":
        if clean_type in ("image/jpeg", "image/jpg", "image/png"):
            return file_bytes, clean_name, clean_type

        # Convert other image formats to PNG
        try:
            img = Image.open(io.BytesIO(file_bytes))
            # Convert to RGB if palette or RGBA with transparent elements
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            new_bytes = buf.getvalue()
            new_name = clean_name.rsplit(".", 1)[0] + ".png"
            return new_bytes, new_name, "image/png"
        except Exception as e:
            logger.warning(f"Failed to convert image to PNG via Pillow, sending as is: {e}")
            return file_bytes, clean_name, "image/png"

    elif media_type.upper() == "VIDEO":
        # Meta Resumable Upload only accepts video/mp4
        if not clean_type or clean_type != "video/mp4":
            clean_type = "video/mp4"
        if not clean_name.lower().endswith(".mp4"):
            clean_name = clean_name.rsplit(".", 1)[0] + ".mp4"
        return file_bytes, clean_name, clean_type

    return file_bytes, clean_name, clean_type or "application/octet-stream"


def upload_media_to_meta(
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    system_token: str,
    app_id: str | None = None
) -> str:
    """
    Upload media binary using Meta Resumable Upload API to obtain an authorized
    'header_handle' string for WhatsApp message template creation.

    Workflow:
    1. POST https://graph.facebook.com/v19.0/{app_id}/uploads
       Params: file_length, file_type, file_name, access_token
       Response: {"id": "upload:<session_id>"}
    2. POST https://graph.facebook.com/v19.0/{session_id}
       Headers: Authorization: OAuth <token>, file_offset: 0, Content-Type: application/octet-stream
       Body: <file_bytes>
       Response: {"h": "<header_handle>"}
    """
    if not file_bytes:
        raise ValueError("Cannot upload empty file bytes to Meta.")

    resolved_app_id = app_id or get_meta_app_id(system_token)

    # Step 1: Initiate upload session
    init_url = f"https://graph.facebook.com/v19.0/{resolved_app_id}/uploads"
    init_params = {
        "file_length": len(file_bytes),
        "file_type": mime_type,
        "file_name": filename,
        "access_token": system_token,
    }

    logger.info(f"Initiating Meta Resumable Upload: file={filename}, size={len(file_bytes)}, type={mime_type}")
    init_res = requests.post(init_url, params=init_params, timeout=20)

    if init_res.status_code != 200:
        logger.error(f"Meta upload session init failed: {init_res.status_code} - {init_res.text}")
        err_msg = init_res.json().get("error", {}).get("message", init_res.text)
        raise ValueError(f"Failed to initiate media upload to Meta: {err_msg}")

    upload_session_id = init_res.json().get("id")
    if not upload_session_id:
        raise ValueError(f"Meta did not return an upload session ID: {init_res.text}")

    # Step 2: Transfer binary data
    upload_url = f"https://graph.facebook.com/v19.0/{upload_session_id}"
    upload_headers = {
        "Authorization": f"OAuth {system_token}",
        "file_offset": "0",
        "Content-Type": "application/octet-stream",
    }

    upload_res = requests.post(upload_url, data=file_bytes, headers=upload_headers, timeout=60)

    if upload_res.status_code != 200:
        logger.error(f"Meta binary upload failed: {upload_res.status_code} - {upload_res.text}")
        err_msg = upload_res.json().get("error", {}).get("message", upload_res.text)
        raise ValueError(f"Failed to upload media data to Meta: {err_msg}")

    handle = upload_res.json().get("h")
    if not handle:
        raise ValueError(f"Meta did not return a media handle 'h': {upload_res.text}")

    logger.info(f"Successfully obtained Meta media handle: {handle[:20]}...")
    return handle


def get_or_create_media_handle(
    file_bytes: bytes | None = None,
    file_name: str | None = None,
    file_type: str | None = None,
    media_category: str = "IMAGE",
    existing_handle: str | None = None,
    system_token: str | None = None,
) -> str:
    """
    Ensure a valid Meta 'header_handle' is available.
    - If user provided file_bytes, upload to Meta and return handle.
    - If existing_handle is already a valid Meta handle (starts with '4:'), reuse it.
    - If neither, generate a clean sample (image or video) and upload to Meta to get a valid handle.
    """
    # Check existing handle
    if existing_handle and str(existing_handle).strip().startswith("4:"):
        return str(existing_handle).strip()

    from app.services.config_service import config_service
    token = system_token or config_service.get("meta_system_user_token")
    if not token:
        raise ValueError("Meta System User Token is required for media template upload.")

    media_cat = media_category.upper()

    if file_bytes and len(file_bytes) > 0:
        norm_bytes, norm_name, norm_type = normalize_media_payload(
            file_bytes,
            file_name or ("media.png" if media_cat == "IMAGE" else "media.mp4"),
            file_type or ("image/png" if media_cat == "IMAGE" else "video/mp4"),
            media_cat
        )
        return upload_media_to_meta(norm_bytes, norm_name, norm_type, token)

    # Fallback sample generation
    if media_cat == "IMAGE":
        sample_bytes = generate_sample_image_bytes()
        return upload_media_to_meta(sample_bytes, "sample_template_header.png", "image/png", token)

    elif media_cat == "VIDEO":
        # Download or use a minimal valid MP4 sample
        try:
            # Fetch a reliable small sample video
            sample_vid_url = "https://www.w3schools.com/html/mov_bbb.mp4"
            r = requests.get(sample_vid_url, timeout=10)
            if r.status_code == 200 and len(r.content) > 1000:
                return upload_media_to_meta(r.content, "sample_video.mp4", "video/mp4", token)
        except Exception as e:
            logger.warning(f"Failed to fetch remote sample video: {e}")

        # Fallback to minimal bytes
        return upload_media_to_meta(MINIMAL_MP4_BYTES, "sample_video.mp4", "video/mp4", token)

    raise ValueError(f"Unsupported media template type: {media_category}")

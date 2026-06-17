"""TOTP utilities — secret generation, QR code, encryption, verification."""

import io
import base64
import hashlib
import pyotp
import qrcode
from cryptography.fernet import Fernet
from app.core.config import settings


# ─── Encryption (uses your existing SECRET_KEY) ───────────────────────────────

def _fernet() -> Fernet:
    """Derive a Fernet key from SECRET_KEY so no extra env var is needed."""
    raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()   # 32 bytes
    key = base64.urlsafe_b64encode(raw)                           # Fernet expects this
    return Fernet(key)


def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(encrypted: str) -> str:
    return _fernet().decrypt(encrypted.encode()).decode()


# ─── TOTP ─────────────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Random RFC-6238 base32 secret."""
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    """Allow ±1 window (30 s) for clock drift."""
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def generate_qr_code(email: str, secret: str, issuer: str = "Auromind") -> str:
    """Return base64-encoded PNG suitable for <img src='data:image/png;base64,...'>."""
    uri = pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
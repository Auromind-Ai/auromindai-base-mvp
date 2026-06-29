from cryptography.fernet import Fernet
from app.core.config import settings

def _get_fernet_key() -> bytes:
    key = settings.ENCRYPTION_KEY

    if not key:
        raise RuntimeError("ENCRYPTION_KEY is required in production")

    if isinstance(key, str):
        key = key.encode()

    try:
        Fernet(key)  
    except Exception:
        raise RuntimeError(" Invalid ENCRYPTION_KEY format")

    return key

fernet = Fernet(_get_fernet_key())

def encrypt_value(value: str) -> str:
    if not value:
        return value
    return fernet.encrypt(value.encode()).decode()


def decrypt_value(encrypted_value: str) -> str:
    if not encrypted_value:
        return encrypted_value
    try:
        return fernet.decrypt(encrypted_value.encode()).decode()
    except Exception:
        raise RuntimeError(" Failed to decrypt value — wrong key or corrupted data")


def is_encrypted(value: str) -> bool:
    if not value or not isinstance(value, str):
        return False
    if not value.startswith("gAAAAA"):
        return False
    try:
        import base64
        missing_padding = len(value) % 4
        if missing_padding:
            value += '=' * (4 - missing_padding)
        decoded = base64.urlsafe_b64decode(value.encode('ascii'))
        return len(decoded) > 0 and decoded[0] == 0x80
    except Exception:
        return False
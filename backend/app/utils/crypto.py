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
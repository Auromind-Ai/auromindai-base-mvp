from cryptography.fernet import Fernet
import os

SECRET_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
fernet = Fernet(SECRET_KEY)

def encrypt_value(value: str) -> str:
    return fernet.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    return fernet.decrypt(value.encode()).decode()
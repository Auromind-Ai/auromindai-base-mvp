from cryptography.fernet import Fernet
import os

SECRET_KEY = os.getenv("ENCRYPTION_KEY")
if not SECRET_KEY:
    print("⚠️ WARNING: ENCRYPTION_KEY not set. Using temporary key (data will be lost on restart!)")
    SECRET_KEY = Fernet.generate_key()

fernet = Fernet(SECRET_KEY)

def encrypt_value(value: str) -> str:
    return fernet.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    return fernet.decrypt(value.encode()).decode()
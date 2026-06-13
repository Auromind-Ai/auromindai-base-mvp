from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings
import bcrypt
import hashlib
import base64

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def _pre_hash_password(password: str) -> bytes:
    
    sha256_hash = hashlib.sha256(password.encode('utf-8')).digest()
    return base64.b64encode(sha256_hash)

def verify_password(plain_password: str, hashed_password: str) -> bool:
   
    try:
        return bcrypt.checkpw(_pre_hash_password(plain_password), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
   
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(_pre_hash_password(password), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
   
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

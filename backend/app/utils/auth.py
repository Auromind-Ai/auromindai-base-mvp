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
   
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_client_ip(request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.headers.get("x-real-ip", request.client.host if request.client else "unknown").strip()


def parse_user_agent(ua: str) -> str:
    if not ua:
        return "Unknown Device"
    
    ua_lower = ua.lower()
    
    # OS detection
    os_name = "Unknown OS"
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "macintosh" in ua_lower or "mac os x" in ua_lower:
        os_name = "macOS"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
    elif "android" in ua_lower:
        os_name = "Android"
    elif "linux" in ua_lower:
        os_name = "Linux"

    # Browser detection
    browser_name = "Unknown Browser"
    if "chrome" in ua_lower and "edg" not in ua_lower and "opr" not in ua_lower:
        browser_name = "Chrome"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser_name = "Safari"
    elif "firefox" in ua_lower:
        browser_name = "Firefox"
    elif "edg" in ua_lower:
        browser_name = "Edge"
    elif "opr" in ua_lower or "opera" in ua_lower:
        browser_name = "Opera"

    return f"{browser_name} on {os_name}"

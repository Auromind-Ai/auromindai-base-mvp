from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from app.routers.auth import get_current_user, CurrentUser
from app.core.enums import PlatformRole
from app.core.config import settings

async def require_platform_admin(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """
    Dependency verifying that the authenticated user is a platform admin.
    """
    user_role = current_user.user.platform_role
    role_str = user_role.value if hasattr(user_role, "value") else str(user_role)
    
    if role_str != PlatformRole.PLATFORM_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform administrative privileges required."
        )
    return current_user


async def require_platform_admin_session(
    request: Request,
    current_user: CurrentUser = Depends(require_platform_admin)
) -> CurrentUser:
    """
    Dependency verifying BOTH that the user is a platform admin AND has an active admin_session cookie with purpose='admin_console'.
    """
    token = request.cookies.get("admin_session") or request.headers.get("x-admin-session")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin console session required."
        )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        purpose = payload.get("purpose")
        role = payload.get("role") or payload.get("platform_role")
        sub = payload.get("sub")
        
        if purpose != "admin_console" or role != PlatformRole.PLATFORM_ADMIN.value or sub != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid admin console session."
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired or invalid admin session."
        )

    return current_user

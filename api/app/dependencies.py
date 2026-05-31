from fastapi import Cookie, HTTPException
from jose import JWTError, jwt

from .config import JWT_ALGORITHM, JWT_SECRET
from .db import query_one


def get_current_user(access_token: str = Cookie(default=None)) -> dict:
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_key = int(payload.get("sub"))
        if user_key is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = query_one(
        """
        SELECT c.user_key, p.email, p.first_name, p.last_name, p.phone_number, p.role,
               p.business_name, p.business_phone, p.business_address
        FROM users.credentials c
        JOIN users.profiles p USING (user_key)
        WHERE c.user_key = %s AND c.is_active = TRUE
        """,
        (user_key,),
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return dict(user)


def require_admin(user: dict = None) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

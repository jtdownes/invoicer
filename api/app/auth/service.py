import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import jwt

from ..config import JWT_ALGORITHM, JWT_EXPIRE_DAYS, JWT_SECRET
from ..db import execute, query_all, query_one

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_key: int, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_key, "email": email, "role": role, "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def get_user_by_email(email: str) -> Optional[dict]:
    return query_one(
        """
        SELECT c.user_key, c.password_hash, c.is_active,
               p.email, p.first_name, p.last_name, p.phone_number, p.role
        FROM users.credentials c
        JOIN users.profiles p USING (user_key)
        WHERE p.email = %s
        """,
        (email.lower().strip(),),
    )


def register_user(first_name: str, last_name: str, email: str,
                  phone_number: Optional[str], password: str) -> dict:
    password_hash = hash_password(password)
    result = execute(
        """
        WITH creds AS (
            INSERT INTO users.credentials (password_hash)
            VALUES (%s)
            RETURNING user_key
        )
        INSERT INTO users.profiles (user_key, email, first_name, last_name, phone_number)
        SELECT user_key, %s, %s, %s, %s FROM creds
        RETURNING user_key, email, first_name, last_name, phone_number,
                  role, created_at
        """,
        (password_hash, email.lower().strip(), first_name.strip(),
         last_name.strip(), phone_number),
        returning=True,
    )
    if not result:
        raise RuntimeError("Failed to create user")
    logger.info(f"Registered user: {email}")
    return dict(result)


def validate_invite(token: str) -> Optional[dict]:
    return query_one(
        """
        SELECT invite_key, token, email AS locked_email
        FROM users.invites
        WHERE token = %s AND used = FALSE AND expires_at > NOW()
        """,
        (token,),
    )


def consume_invite(token: str) -> None:
    execute(
        "UPDATE users.invites SET used = TRUE WHERE token = %s",
        (token,),
    )


def create_invite(created_by: Optional[int], email: Optional[str],
                  expires_days: int) -> dict:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
    result = execute(
        """
        INSERT INTO users.invites (token, email, expires_at, created_by)
        VALUES (%s, %s, %s, %s)
        RETURNING invite_key, token, email, expires_at, created_at
        """,
        (token, email, expires_at, created_by),
        returning=True,
    )
    return dict(result)


def list_invites() -> list[dict]:
    return [dict(r) for r in query_all(
        """
        SELECT i.invite_key, i.token, i.email, i.used, i.expires_at,
               i.created_at, p.email AS created_by_email
        FROM users.invites i
        LEFT JOIN users.profiles p ON p.user_key = i.created_by
        ORDER BY i.created_at DESC
        """,
    )]


def seed_first_invite(token: str) -> None:
    existing = query_one("SELECT 1 FROM users.credentials LIMIT 1")
    if existing:
        return
    invite = query_one("SELECT 1 FROM users.invites WHERE token = %s", (token,))
    if invite:
        return
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    execute(
        "INSERT INTO users.invites (token, expires_at) VALUES (%s, %s)",
        (token, expires_at),
    )
    logger.info(f"Seeded first invite token: {token}")

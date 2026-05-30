from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    invite_token: str
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$", v.lower()):
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[A-Z]", v):
            errors.append("an uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("a lowercase letter")
        if not re.search(r"\d", v):
            errors.append("a number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            errors.append("a special character")
        if errors:
            raise ValueError("Password must include " + ", ".join(errors))
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        digits = re.sub(r"\D", "", v)
        if len(digits) not in (0, 10):
            raise ValueError("Phone number must be 10 digits")
        return v if digits else None


class InviteCreateRequest(BaseModel):
    email: Optional[str] = None
    expires_days: int = 7

    @field_validator("expires_days")
    @classmethod
    def validate_expires(cls, v: int) -> int:
        if v not in (1, 7, 30):
            raise ValueError("expires_days must be 1, 7, or 30")
        return v


class UserResponse(BaseModel):
    user_key: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: Optional[str]
    role: str

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..db import execute, query_one
from ..dependencies import get_current_user, require_admin
from .schemas import InviteCreateRequest, LoginRequest, RegisterRequest, UserResponse
from .service import (
    consume_invite,
    create_invite,
    create_token,
    get_user_by_email,
    list_invites,
    register_user,
    validate_invite,
    verify_password,
)

router = APIRouter(prefix="/api/auth")
invite_router = APIRouter(prefix="/api/invites")

COOKIE_OPTS = dict(httponly=True, samesite="lax", secure=True, path="/")


@router.post("/login")
def login(body: LoginRequest, response: Response):
    user = get_user_by_email(body.email)
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["user_key"], user["email"], user["role"])
    response.set_cookie("access_token", token, max_age=60 * 60 * 24 * 7, **COOKIE_OPTS)
    return {
        "user_key": user["user_key"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "phone_number": user["phone_number"],
        "role": user["role"],
    }


@router.post("/register")
def register(body: RegisterRequest, response: Response):
    invite = validate_invite(body.invite_token)
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite")

    if invite["locked_email"] and invite["locked_email"].lower() != body.email.lower():
        raise HTTPException(status_code=400, detail="This invite is locked to a different email")

    existing = get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail=f"{body.email} is already registered")

    user = register_user(
        body.first_name, body.last_name, body.email,
        body.phone_number, body.password
    )
    consume_invite(body.invite_token)

    token = create_token(user["user_key"], user["email"], user["role"])
    response.set_cookie("access_token", token, max_age=60 * 60 * 24 * 7, **COOKIE_OPTS)
    return {
        "user_key": user["user_key"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"],
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token", **COOKIE_OPTS)
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    business_name: Optional[str] = None
    business_phone: Optional[str] = None
    business_address: Optional[str] = None


@router.patch("/me")
def update_me(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    field_map = {
        "first_name":       body.first_name,
        "last_name":        body.last_name,
        "phone_number":     body.phone_number,
        "business_name":    body.business_name,
        "business_phone":   body.business_phone,
        "business_address": body.business_address,
    }
    updates = []
    values  = []
    for col, val in field_map.items():
        if val is not None:
            updates.append(f"{col} = %s")
            values.append(val.strip() or None)
    if not updates:
        return user
    values.append(user["user_key"])
    execute(f"UPDATE users.profiles SET {', '.join(updates)} WHERE user_key = %s", values)
    updated = query_one(
        """
        SELECT c.user_key, p.email, p.first_name, p.last_name, p.phone_number, p.role,
               p.business_name, p.business_phone, p.business_address
        FROM users.credentials c
        JOIN users.profiles p USING (user_key)
        WHERE c.user_key = %s
        """,
        (user["user_key"],),
    )
    return dict(updated) if updated else user


@invite_router.get("/validate")
def validate(token: str):
    invite = validate_invite(token)
    if not invite:
        return {"valid": False}
    return {"valid": True, "locked_email": invite["locked_email"]}


@invite_router.get("")
def get_invites(user: dict = Depends(get_current_user)):
    require_admin(user)
    return list_invites()


@invite_router.post("")
def generate_invite(body: InviteCreateRequest, user: dict = Depends(get_current_user)):
    require_admin(user)
    invite = create_invite(
        created_by=user["user_key"],
        email=body.email,
        expires_days=body.expires_days,
    )
    return invite

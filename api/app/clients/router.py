from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import execute, query_all, query_one
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/clients")


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_clients(user: dict = Depends(get_current_user)):
    rows = query_all(
        """
        SELECT client_key, name, email, phone, address, created_at
        FROM clients.directory
        WHERE created_by = %s
        ORDER BY name ASC
        """,
        (user["user_key"],),
    )
    return [dict(r) for r in rows]


@router.post("")
def create_client(body: ClientCreate, user: dict = Depends(get_current_user)):
    result = execute(
        """
        INSERT INTO clients.directory (name, email, phone, address, notes, created_by)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING client_key, name, email, phone, address, created_at
        """,
        (body.name.strip(), body.email, body.phone, body.address, body.notes, user["user_key"]),
        returning=True,
    )
    return dict(result)


@router.get("/{client_key}")
def get_client(client_key: int, user: dict = Depends(get_current_user)):
    row = query_one(
        """
        SELECT client_key, name, email, phone, address, notes, created_at
        FROM clients.directory
        WHERE client_key = %s AND created_by = %s
        """,
        (client_key, user["user_key"]),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    return dict(row)

"""
Public (no-auth) endpoints for estimate viewing and approval.
These are accessed by customers via the link in the estimate email.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..db import execute, query_all, query_one
from .email import send_approval_notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/public")


@router.get("/e/{token}")
def get_public_estimate(token: str):
    """
    Return a full estimate by its public token.
    Increments the view counter and records first/last viewed timestamps.
    No authentication required.
    """
    est = query_one(
        """
        SELECT e.*,
               c.name    AS client_name,
               c.email   AS client_email,
               c.phone   AS client_phone,
               c.address AS client_address
        FROM estimates.jobs e
        LEFT JOIN clients.directory c USING (client_key)
        WHERE e.public_token = %s
        """,
        (token,),
    )
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found")

    execute(
        """
        UPDATE estimates.jobs
        SET view_count      = view_count + 1,
            last_viewed_at  = NOW(),
            first_viewed_at = COALESCE(first_viewed_at, NOW())
        WHERE public_token = %s
        """,
        (token,),
    )

    items = query_all(
        "SELECT * FROM estimates.line_items WHERE job_key = %s ORDER BY sort_order",
        (est["job_key"],),
    )

    owner = query_one(
        """
        SELECT p.first_name, p.last_name, p.business_name,
               p.business_phone, p.business_address, p.business_email, p.email
        FROM users.profiles p
        WHERE p.user_key = %s
        """,
        (est["created_by"],),
    )

    approval = query_one(
        "SELECT signer_name, signed_at FROM estimates.approvals WHERE job_key = %s",
        (est["job_key"],),
    )

    result               = dict(est)
    result["line_items"] = [dict(i) for i in items]
    result["owner"]      = dict(owner) if owner else {}
    result["approval"]   = dict(approval) if approval else None
    return result


class ApproveRequest(BaseModel):
    signer_name: str


@router.post("/e/{token}/approve")
def approve_estimate(token: str, body: ApproveRequest, request: Request):
    """
    Customer approves the estimate. Stores their name + timestamp.
    No authentication required.
    """
    if not body.signer_name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    est = query_one(
        """
        SELECT e.job_key, e.status, e.created_by, e.estimate_number,
               e.total, e.public_token,
               c.name AS client_name
        FROM estimates.jobs e
        LEFT JOIN clients.directory c USING (client_key)
        WHERE e.public_token = %s
        """,
        (token,),
    )
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found")

    if est["status"] == "approved":
        raise HTTPException(status_code=409, detail="This estimate has already been approved")

    if est["status"] == "declined":
        raise HTTPException(status_code=400, detail="This estimate has been declined")

    ip = request.client.host if request.client else None
    execute(
        """
        INSERT INTO estimates.approvals (job_key, signer_name, ip_address)
        VALUES (%s, %s, %s)
        ON CONFLICT (job_key) DO UPDATE
            SET signer_name = EXCLUDED.signer_name,
                signed_at   = NOW(),
                ip_address  = EXCLUDED.ip_address
        """,
        (est["job_key"], body.signer_name.strip(), ip),
    )

    execute(
        "UPDATE estimates.jobs SET status = 'approved', approved_at = NOW(), updated_at = NOW() WHERE job_key = %s",
        (est["job_key"],),
    )

    logger.info("Estimate %s approved by '%s' from %s", est["estimate_number"], body.signer_name, ip)

    owner = query_one(
        """
        SELECT p.first_name, p.last_name, p.business_name,
               p.business_email, p.email
        FROM users.profiles p
        WHERE p.user_key = %s
        """,
        (est["created_by"],),
    )
    if owner:
        send_approval_notification(dict(est), dict(owner), body.signer_name.strip())

    return {"ok": True}

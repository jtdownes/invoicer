import logging
import uuid
from datetime import date as DateType
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..db import execute, query_all, query_one
from ..dependencies import get_current_user
from ..config import APP_BASE_URL

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/estimates")


class LineItemIn(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    sort_order: int = 0


class EstimateCreate(BaseModel):
    client_key: Optional[int] = None
    title: Optional[str] = None
    estimate_date: Optional[DateType] = None
    tax_rate: float = 0.0
    discount_type: str = 'percent'
    discount_value: float = 0.0
    notes: Optional[str] = None
    terms: Optional[str] = None
    valid_days: int = 30
    line_items: List[LineItemIn] = []


class StatusUpdate(BaseModel):
    status: str


def _next_number() -> str:
    result = execute(
        "SELECT nextval('estimates.estimate_number_seq') AS n",
        returning=True,
    )
    return f"EST-{int(result['n']):04d}"


@router.get("/dashboard")
def get_dashboard(user: dict = Depends(get_current_user)):
    stats = query_one(
        """
        SELECT
            COUNT(*)                                                          AS total_count,
            COUNT(*) FILTER (WHERE status IN ('draft','sent'))                AS pending_count,
            COUNT(*) FILTER (WHERE status = 'approved')                       AS approved_count,
            COALESCE(SUM(total) FILTER (WHERE status = 'approved'), 0)        AS approved_total,
            COALESCE(SUM(total) FILTER (WHERE status IN ('draft','sent')), 0) AS pending_total
        FROM estimates.jobs
        WHERE created_by = %s
        """,
        (user["user_key"],),
    )
    recent = query_all(
        """
        SELECT e.job_key AS id, e.estimate_number AS number, e.title,
               e.status, e.total, e.view_count, e.created_at,
               c.name AS client_name
        FROM estimates.jobs e
        LEFT JOIN clients.directory c USING (client_key)
        WHERE e.created_by = %s
        ORDER BY e.created_at DESC
        LIMIT 5
        """,
        (user["user_key"],),
    )
    return {
        "stats": dict(stats) if stats else {},
        "recent_estimates": [dict(r) for r in recent],
    }


@router.get("")
def list_estimates(user: dict = Depends(get_current_user)):
    rows = query_all(
        """
        SELECT e.job_key, e.estimate_number, e.title, e.status,
               e.total, e.view_count, e.created_at, e.sent_at, e.approved_at,
               c.name AS client_name, c.email AS client_email
        FROM estimates.jobs e
        LEFT JOIN clients.directory c USING (client_key)
        WHERE e.created_by = %s
        ORDER BY e.created_at DESC
        """,
        (user["user_key"],),
    )
    return [dict(r) for r in rows]


@router.post("")
def create_estimate(body: EstimateCreate, user: dict = Depends(get_current_user)):
    subtotal = round(sum(i.quantity * i.unit_price for i in body.line_items), 2)

    if body.discount_type == 'percent':
        discount_amount = round(subtotal * body.discount_value / 100, 2)
    else:
        discount_amount = round(min(float(body.discount_value), subtotal), 2)

    discounted = round(subtotal - discount_amount, 2)
    tax_amount = round(discounted * body.tax_rate / 100, 2)
    total      = round(discounted + tax_amount, 2)
    est_num    = _next_number()

    est = execute(
        """
        INSERT INTO estimates.jobs
            (estimate_number, client_key, title, status,
             subtotal, tax_rate, tax_amount, total,
             discount_type, discount_value, discount_amount,
             notes, terms, valid_days, estimate_date, created_by)
        VALUES (%s, %s, %s, 'draft', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING job_key, estimate_number, status, created_at
        """,
        (est_num, body.client_key, body.title or None,
         subtotal, body.tax_rate, tax_amount, total,
         body.discount_type, body.discount_value, discount_amount,
         body.notes or None, body.terms or None, body.valid_days,
         body.estimate_date or None,
         user["user_key"]),
        returning=True,
    )

    for i, item in enumerate(body.line_items):
        execute(
            """
            INSERT INTO estimates.line_items
                (job_key, description, quantity, unit_price, total, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (est["job_key"], item.description,
             item.quantity, item.unit_price,
             round(item.quantity * item.unit_price, 2), i),
        )

    logger.info("Created estimate %s for user %s", est_num, user["user_key"])
    return dict(est)


@router.get("/{job_key}")
def get_estimate(job_key: int, user: dict = Depends(get_current_user)):
    est = query_one(
        """
        SELECT e.*,
               c.name AS client_name, c.email AS client_email,
               c.phone AS client_phone, c.address AS client_address
        FROM estimates.jobs e
        LEFT JOIN clients.directory c USING (client_key)
        WHERE e.job_key = %s AND e.created_by = %s
        """,
        (job_key, user["user_key"]),
    )
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found")
    items = query_all(
        "SELECT * FROM estimates.line_items WHERE job_key = %s ORDER BY sort_order",
        (job_key,),
    )
    result = dict(est)
    result["line_items"] = [dict(i) for i in items]
    return result


@router.post("/{job_key}/send")
def send_estimate(job_key: int, request: Request, user: dict = Depends(get_current_user)):
    est = query_one(
        """
        SELECT e.*, c.name AS client_name, c.email AS client_email
        FROM estimates.jobs e
        LEFT JOIN clients.directory c USING (client_key)
        WHERE e.job_key = %s AND e.created_by = %s
        """,
        (job_key, user["user_key"]),
    )
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found")

    est = dict(est)

    # Generate or reuse public token
    token = est.get("public_token") or str(uuid.uuid4())
    public_url = f"{APP_BASE_URL}/e/{token}"
    to_email = est.get("client_email")

    execute(
        """
        UPDATE estimates.jobs
        SET status = 'sent', sent_at = NOW(),
            public_token = %s,
            sent_to_email = %s,
            updated_at = NOW()
        WHERE job_key = %s AND created_by = %s
        """,
        (token, to_email, job_key, user["user_key"]),
    )

    email_sent = False
    if to_email:
        from ..public.email import send_estimate_email
        email_sent = send_estimate_email(est, user, public_url, to_email)

    return {
        "ok": True,
        "public_url": public_url,
        "email_sent": email_sent,
        "to_email": to_email,
    }


@router.patch("/{job_key}/status")
def set_status(job_key: int, body: StatusUpdate, user: dict = Depends(get_current_user)):
    if body.status not in ("draft", "sent", "approved", "declined"):
        raise HTTPException(status_code=400, detail="Invalid status")
    execute(
        """
        UPDATE estimates.jobs
        SET status = %s, updated_at = NOW()
        WHERE job_key = %s AND created_by = %s
        """,
        (body.status, job_key, user["user_key"]),
    )
    return {"ok": True}

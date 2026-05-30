from fastapi import APIRouter, Depends
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/invoices")


@router.get("/dashboard")
def get_dashboard(user: dict = Depends(get_current_user)):
    # TODO: query invoices table once schema is finalized
    return {
        "stats": {
            "total_billed":       0.0,
            "outstanding_amount": 0.0,
            "outstanding_count":  0,
            "overdue_amount":     0.0,
            "overdue_count":      0,
            "paid_this_month":    0.0,
        },
        "recent_invoices": [],
    }


@router.get("")
def list_invoices(user: dict = Depends(get_current_user)):
    # TODO: query invoices table once schema is finalized
    return []

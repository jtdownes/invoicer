from fastapi import APIRouter, Depends
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/clients")


@router.get("")
def list_clients(user: dict = Depends(get_current_user)):
    # TODO: query clients table once schema is finalized
    return []

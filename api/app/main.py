import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth.router import invite_router, router as auth_router
from .auth.service import seed_first_invite
from .clients.router import router as clients_router
from .config import CORS_ORIGINS, FIRST_INVITE_TOKEN
from .estimates.router import router as estimates_router
from .invoices.router import router as invoices_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Invoicer API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(invite_router)
app.include_router(clients_router)
app.include_router(estimates_router)
app.include_router(invoices_router)


@app.on_event("startup")
async def startup():
    if FIRST_INVITE_TOKEN:
        seed_first_invite(FIRST_INVITE_TOKEN)


@app.get("/api/health")
def health():
    return {"ok": True}

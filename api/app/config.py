import os

# Load .env directly from the mounted file. Docker's env_file directive isn't
# always honored by the deploy tooling, so we read it ourselves; this also works
# under plain Dockge where env_file would load it too (harmless double-load).
try:
    from dotenv import load_dotenv
    load_dotenv("/app/.env")
except ImportError:
    pass

DB_HOST = os.environ.get("DC_DB_HOST", "downes-capital-db")
DB_PORT = int(os.environ.get("DC_DB_PORT", "5432"))
DB_NAME = os.environ.get("DC_DB_NAME", "invoicer")
DB_USER = os.environ.get("DC_DB_USER", "admin")
DB_PASS = os.environ.get("DC_DB_PASSWORD", "")

JWT_SECRET    = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = int(os.environ.get("JWT_EXPIRE_DAYS", "7"))

FIRST_INVITE_TOKEN = os.environ.get("FIRST_INVITE_TOKEN", "")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://192.168.1.10:7862").split(",")

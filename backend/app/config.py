"""All settings in one place. Values come from the repo-root .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

load_dotenv(ROOT_DIR / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

CLAUDE_MODEL = "claude-opus-5-5"

DB_PATH = Path(os.getenv("DB_PATH", BACKEND_DIR / "data" / "visitcoach.db"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", BACKEND_DIR / "data" / "uploads"))

# Built React app (npm run build). Served by FastAPI in production.
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"

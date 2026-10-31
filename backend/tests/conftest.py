import os
import tempfile

import pytest

# Point the app at a throwaway database and upload folder before it is imported.
_tmp = tempfile.mkdtemp()
os.environ["DB_PATH"] = os.path.join(_tmp, "test.db")
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    """Logged in as the demo mentor."""
    with TestClient(app) as test_client:
        log_in(test_client, "sachin", "sachin123")
        yield test_client


@pytest.fixture
def anonymous():
    with TestClient(app) as test_client:
        yield test_client


def log_in(client, username, password):
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    client.headers["Authorization"] = f"Bearer {response.json()['token']}"
    return response.json()["user"]


def log_in_as_mentor(client, name):
    """Log in as a mentor with this name, creating the user the first time."""
    from app import db
    from app.controllers.auth import create_user

    username = "test-" + "-".join(name.lower().split())
    if not db.query_one("SELECT id FROM users WHERE username = ?", (username,)):
        create_user(username, "secret", name, "mentor")
    return log_in(client, username, "secret")


FAKE_PACKET = {"strength": "s", "priority": "p", "need_area": "early_reading", "english_gloss": "g"}


@pytest.fixture
def fake_ai(monkeypatch):
    """Replace Sarvam and Claude so tests are fast, free and offline. Records what they were given."""
    from app.controllers import visits as visits_controller
    from app.services import asr

    calls = {"asr": [], "packet": []}

    def transcribe(path, language, mime):
        calls["asr"].append((path, language, mime))
        return f"transcript {len(calls['asr'])}"

    def generate_packet(visit):
        calls["packet"].append(visit)
        return FAKE_PACKET, [{}]

    monkeypatch.setattr(asr, "transcribe", transcribe)
    monkeypatch.setattr(visits_controller, "generate_packet", generate_packet)
    return calls

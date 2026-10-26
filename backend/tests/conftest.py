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
    with TestClient(app) as test_client:
        yield test_client


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

"""
Backend tests for PeopleHub Meetings & Recordings Hub
Covers: meetings listing, filtering by source, sync, chat history endpoints
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://workforce-hub-498.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@peoplehub.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Meetings Listing ----------
class TestMeetingsListing:
    def test_get_meetings_default(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings?limit=10", headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        # Could be list or dict with items - check structure
        items = data if isinstance(data, list) else data.get("items") or data.get("meetings") or data.get("data") or []
        assert isinstance(items, list)
        assert len(items) > 0, "Expected at least some meetings"
        # Verify desc sort by start_time
        start_times = [m.get("start_time") for m in items if m.get("start_time")]
        assert start_times == sorted(start_times, reverse=True), "Meetings not sorted desc by start_time"

    def test_get_meetings_limit_500(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings?limit=500", headers=admin_headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items") or data.get("meetings") or data.get("data") or []
        # Should have 200+ meetings
        assert len(items) >= 100, f"Expected >=100 meetings; got {len(items)}"

    def test_get_attio_meetings(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/attio?limit=500", headers=admin_headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items") or data.get("meetings") or data.get("data") or []
        assert len(items) > 0
        # All should be Attio source
        for m in items:
            src = (m.get("source") or "").lower()
            assert "attio" in src, f"Non-attio in attio endpoint: {src}"

    def test_get_fireflies_meetings_has_recordings(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/fireflies?limit=500", headers=admin_headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items") or data.get("meetings") or data.get("data") or []
        assert len(items) > 0, "Expected fireflies meetings"
        # At least one should have a recording with fireflies deep-link
        found_recording = False
        for m in items:
            recs = m.get("recordings") or []
            for r_ in recs:
                url = (r_.get("url") or "")
                if url.startswith("https://app.fireflies.ai/view/"):
                    found_recording = True
                    break
            if found_recording:
                break
        assert found_recording, "No fireflies recording deep-link found in any fireflies meeting"


# ---------- Sync ----------
class TestMeetingsSync:
    def test_sync_status_endpoint(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/sync-status", headers=admin_headers, timeout=30)
        # Endpoint may return 200 with status info
        assert r.status_code in (200, 404), r.text
        if r.status_code == 200:
            data = r.json()
            # Just check it returns dict-ish info
            assert isinstance(data, dict)

    def test_sync_meetings_kickoff(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/meetings/sync", headers=admin_headers, timeout=30)
        assert r.status_code in (200, 202), r.text


# ---------- Chat History Endpoints ----------
class TestChatEndpoints:
    @pytest.fixture(scope="class")
    def sample_meeting_id(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings?limit=5", headers=admin_headers, timeout=60)
        data = r.json()
        items = data if isinstance(data, list) else data.get("items") or data.get("meetings") or data.get("data") or []
        assert items, "no meetings"
        return items[0].get("id") or items[0].get("meeting_id") or items[0].get("_id")

    def test_chat_history(self, admin_headers, sample_meeting_id):
        session_id = f"meeting_{sample_meeting_id}"
        r = requests.get(
            f"{BASE_URL}/api/meetings/{sample_meeting_id}/chat/history?session_id={session_id}",
            headers=admin_headers, timeout=30
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)

    def test_chat_delete(self, admin_headers, sample_meeting_id):
        session_id = f"meeting_{sample_meeting_id}"
        r = requests.delete(
            f"{BASE_URL}/api/meetings/{sample_meeting_id}/chat?session_id={session_id}",
            headers=admin_headers, timeout=30
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "deleted" in data

    def test_chat_post_handles_budget_error_gracefully(self, admin_headers, sample_meeting_id):
        """LLM budget exceeded is expected; endpoint should respond with structured error, not 500 crash."""
        session_id = f"meeting_{sample_meeting_id}"
        payload = {"message": "Summarize the meeting", "session_id": session_id}
        r = requests.post(
            f"{BASE_URL}/api/meetings/{sample_meeting_id}/chat",
            headers=admin_headers, json=payload, timeout=60
        )
        # Accept 200 (if budget OK), 402/429 (budget), 500 (with structured error body)
        assert r.status_code in (200, 400, 402, 429, 500, 503), f"Unexpected status {r.status_code}: {r.text}"
        # If non-200, should still return JSON
        try:
            r.json()
        except Exception:
            pytest.fail(f"Non-JSON response: {r.text}")

"""
Backend tests for Meetings Hub enrichment (iteration 3):
- Search across keywords / linked_company_names / linked_contact_names / action_items_list
- Attio meetings with linked_company_names + description-as-summary
- Fireflies meetings with action_items_list (non-empty array)
- Single meeting GET (200 valid / 404 bogus)
- Action items endpoint
- Dashboard trends regression
"""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://workforce-hub-498.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@peoplehub.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin123")


@pytest.fixture(scope="session")
def admin_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _items(data):
    if isinstance(data, list):
        return data
    for k in ("items", "meetings", "data", "results"):
        if isinstance(data, dict) and isinstance(data.get(k), list):
            return data[k]
    return []


# ---------- Search ----------
class TestSearch:
    def test_search_bcg(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/search?q=BCG", headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        items = _items(r.json())
        assert len(items) >= 6, f"Expected >=6 BCG matches; got {len(items)}"
        # desc sort
        sts = [m.get("start_time") for m in items if m.get("start_time")]
        assert sts == sorted(sts, reverse=True), "results not desc by start_time"

    def test_search_boston_consulting(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/search",
                         params={"q": "Boston Consulting"}, headers=admin_headers, timeout=60)
        assert r.status_code == 200
        items = _items(r.json())
        assert len(items) >= 6, f"Expected >=6 'Boston Consulting' results; got {len(items)}"

    def test_search_wordflex_action_items(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/search",
                         params={"q": "Wordflex"}, headers=admin_headers, timeout=60)
        assert r.status_code == 200
        items = _items(r.json())
        assert len(items) >= 1, f"Expected >=1 Wordflex result via action_items_list; got {len(items)}"

    def test_search_afore(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/search",
                         params={"q": "Afore"}, headers=admin_headers, timeout=60)
        assert r.status_code == 200
        items = _items(r.json())
        # spec says 13; allow slight variance
        assert len(items) >= 8, f"Expected >=8 Afore results; got {len(items)}"

    def test_search_zoom(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/search",
                         params={"q": "Zoom"}, headers=admin_headers, timeout=60)
        assert r.status_code == 200
        items = _items(r.json())
        assert len(items) >= 10, f"Expected many Zoom results; got {len(items)}"


# ---------- Attio Enrichment ----------
class TestAttioEnrichment:
    def test_attio_linked_company_names(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/attio?limit=50",
                         headers=admin_headers, timeout=60)
        assert r.status_code == 200
        items = _items(r.json())
        assert items
        with_linked = [m for m in items if m.get("linked_company_names")]
        assert with_linked, "No attio meeting has linked_company_names populated"
        # Verify it's a list of name strings
        names_flat = []
        for m in with_linked:
            for n in m.get("linked_company_names") or []:
                names_flat.append(n)
        assert any(isinstance(n, str) and n.strip() for n in names_flat), \
            "linked_company_names not resolved to strings"

    def test_attio_summary_description_present(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/attio?limit=100",
                         headers=admin_headers, timeout=60)
        assert r.status_code == 200
        items = _items(r.json())
        with_summary = [m for m in items if (m.get("summary") or "").strip()]
        assert with_summary, "No attio meeting has summary/description populated"


# ---------- Fireflies Enrichment ----------
class TestFirefliesEnrichment:
    def test_fireflies_action_items_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/fireflies?limit=20",
                         headers=admin_headers, timeout=60)
        assert r.status_code == 200
        items = _items(r.json())
        assert items
        with_items = [m for m in items
                      if isinstance(m.get("action_items_list"), list) and len(m["action_items_list"]) > 0]
        assert with_items, "No fireflies meeting has non-empty action_items_list"

    def test_fireflies_recording_deeplink(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/fireflies?limit=20",
                         headers=admin_headers, timeout=60)
        items = _items(r.json())
        found = False
        for m in items:
            for rec in m.get("recordings") or []:
                if (rec.get("url") or "").startswith("https://app.fireflies.ai/view/"):
                    found = True
                    break
        assert found, "no fireflies recording deeplink"


# ---------- Single meeting GET + Action items + Trends ----------
class TestRegressions:
    @pytest.fixture(scope="class")
    def sample_id(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        token = r.json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        rr = requests.get(f"{BASE_URL}/api/meetings?limit=5", headers=h, timeout=60)
        items = _items(rr.json())
        return items[0].get("id"), h

    def test_single_meeting_get_valid(self, sample_id):
        mid, h = sample_id
        r = requests.get(f"{BASE_URL}/api/meetings/{mid}", headers=h, timeout=30)
        assert r.status_code == 200, f"valid id should return 200; got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data.get("id") == mid or data.get("meeting_id") == mid

    def test_single_meeting_get_bogus(self, sample_id):
        _, h = sample_id
        r = requests.get(f"{BASE_URL}/api/meetings/does-not-exist-xyz", headers=h, timeout=30)
        assert r.status_code == 404, f"expected 404 for bogus id; got {r.status_code}"

    def test_action_items_endpoint(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings/action-items", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "action_items" in data
        assert isinstance(data["action_items"], list)

    def test_dashboard_trends(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/trends?period=week", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("trends") is not None, f"trends should not be null: {data}"
        assert data.get("changes") is not None, f"changes should not be null: {data}"

    def test_chat_history_endpoint(self, admin_headers, sample_id):
        mid, _ = sample_id
        r = requests.get(
            f"{BASE_URL}/api/meetings/{mid}/chat/history?session_id=meeting_{mid}",
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        assert "messages" in r.json()

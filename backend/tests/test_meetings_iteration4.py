"""
Iteration 4 backend tests for PeopleHub Meetings & Recordings Hub.
Validates the new Attio pagination fix, email-aliases mapping, lazy
recording fetch and full-corpus stats aggregation.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@peoplehub.com"
ADMIN_PASSWORD = "admin123"
EMP_ID = "emp_0_9541"


@pytest.fixture(scope="session")
def admin_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed: {r.text}"
    return {
        "Authorization": f"Bearer {r.json()['token']}",
        "Content-Type": "application/json",
    }


def _items(payload):
    if isinstance(payload, list):
        return payload
    return (
        payload.get("items")
        or payload.get("meetings")
        or payload.get("data")
        or payload.get("results")
        or []
    )


# ---------- Attio pagination & desc sort ----------
class TestMeetingsListing:
    def test_total_meetings_after_pagination_fix(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings?limit=3000", headers=admin_headers, timeout=120
        )
        assert r.status_code == 200, r.text
        items = _items(r.json())
        # Spec says ~2855 (was 208 pre-fix). Accept >= 2500 as healthy.
        assert len(items) >= 2500, f"Expected >=2500 meetings post-pagination-fix, got {len(items)}"

    def test_meetings_sorted_desc_with_future_dates_on_top(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings?limit=100", headers=admin_headers, timeout=60
        )
        assert r.status_code == 200
        items = _items(r.json())
        starts = [m.get("start_time") for m in items if m.get("start_time")]
        assert starts == sorted(starts, reverse=True), "Not sorted desc by start_time"
        # Top date should be in 2027/2028 (Attio future test data)
        top_year = int(starts[0][:4])
        assert top_year >= 2027, f"Top meeting year was {top_year}, expected 2027+"

    def test_source_split_attio_dominant_fireflies_present(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings?limit=3000", headers=admin_headers, timeout=120
        )
        items = _items(r.json())
        counts = {}
        for m in items:
            s = (m.get("source") or "unknown").lower()
            counts[s] = counts.get(s, 0) + 1
        attio_total = counts.get("attio", 0) + counts.get("both", 0)
        fireflies_total = counts.get("fireflies", 0) + counts.get("both", 0)
        assert attio_total >= 2500, f"Attio low: {attio_total}"
        assert fireflies_total >= 1, f"Fireflies missing: {fireflies_total}"


# ---------- Unmapped participants admin endpoint ----------
class TestUnmappedParticipants:
    def test_unmapped_returns_real_emails_and_known_count(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings/unmapped-participants?limit=10",
            headers=admin_headers,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "unmapped" in data and "total_known_employees" in data
        assert isinstance(data["unmapped"], list)
        assert data["total_known_employees"] >= 16
        if data["unmapped"]:
            row = data["unmapped"][0]
            for k in ("email", "count", "last_meeting"):
                assert k in row, f"missing {k}"
            assert "@" in row["email"]
            assert row["count"] >= 1

    def test_unmapped_excludes_admin(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings/unmapped-participants?limit=50",
            headers=admin_headers,
            timeout=60,
        )
        emails = {u["email"] for u in r.json().get("unmapped", [])}
        # admin@peoplehub.com is a known employee, must NOT be in unmapped
        assert "admin@peoplehub.com" not in emails

    def test_unmapped_requires_admin(self):
        # Non-admin login
        login = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "harper.martin@peoplehub.com", "password": "employee123"},
            timeout=30,
        )
        if login.status_code != 200:
            pytest.skip("Employee login unavailable")
        tok = login.json()["token"]
        r = requests.get(
            f"{BASE_URL}/api/meetings/unmapped-participants?limit=10",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=30,
        )
        assert r.status_code == 403


# ---------- Email aliases + employee meetings ----------
class TestEmailAliases:
    """End-to-end alias flow with cleanup."""

    @pytest.fixture(scope="class", autouse=True)
    def _cleanup(self, admin_headers):
        yield
        # Always clear aliases for the test employee
        requests.put(
            f"{BASE_URL}/api/employees/{EMP_ID}/email-aliases",
            headers=admin_headers,
            json=[],
            timeout=30,
        )

    def test_put_email_aliases_persists(self, admin_headers):
        # Pick the top unmapped participant as the alias
        r = requests.get(
            f"{BASE_URL}/api/meetings/unmapped-participants?limit=10",
            headers=admin_headers,
            timeout=60,
        )
        unmapped = r.json().get("unmapped", [])
        assert unmapped, "Need at least one unmapped participant for this test"
        alias_email = unmapped[0]["email"]
        alias_count = unmapped[0]["count"]

        put = requests.put(
            f"{BASE_URL}/api/employees/{EMP_ID}/email-aliases",
            headers=admin_headers,
            json=[alias_email],
            timeout=30,
        )
        assert put.status_code == 200, put.text
        body = put.json()
        assert "email_aliases" in body
        assert alias_email.lower() in [a.lower() for a in body["email_aliases"]]

        # Now alias should be excluded from unmapped list
        r2 = requests.get(
            f"{BASE_URL}/api/meetings/unmapped-participants?limit=20",
            headers=admin_headers,
            timeout=60,
        )
        still_unmapped = {u["email"].lower() for u in r2.json().get("unmapped", [])}
        assert alias_email.lower() not in still_unmapped

        # Employee meetings should reflect alias matching
        m = requests.get(
            f"{BASE_URL}/api/employees/{EMP_ID}/meetings?limit=10",
            headers=admin_headers,
            timeout=60,
        )
        assert m.status_code == 200, m.text
        m_data = m.json()
        assert "meetings" in m_data and "stats" in m_data and "total" in m_data
        # Full-corpus total should match stats.total_meetings
        assert m_data["total"] == m_data["stats"]["total_meetings"], (
            f"total ({m_data['total']}) != stats.total_meetings "
            f"({m_data['stats']['total_meetings']}) — aggregation drift"
        )
        # Should pick up the alias's meetings (>= alias_count, may be slightly more
        # if primary email already had any meetings).
        assert m_data["total"] >= alias_count, (
            f"Expected total >= {alias_count} (alias count), got {m_data['total']}"
        )
        # Top meeting partners present
        assert isinstance(m_data["stats"].get("top_meeting_partners"), list)

    def test_put_email_aliases_dedup_and_lowercase(self, admin_headers):
        r = requests.put(
            f"{BASE_URL}/api/employees/{EMP_ID}/email-aliases",
            headers=admin_headers,
            json=["Foo@Example.COM", "foo@example.com", "  bar@x.io ", ""],
            timeout=30,
        )
        assert r.status_code == 200
        aliases = sorted(r.json()["email_aliases"])
        assert aliases == sorted(["foo@example.com", "bar@x.io"]), aliases

    def test_put_email_aliases_404_unknown_employee(self, admin_headers):
        r = requests.put(
            f"{BASE_URL}/api/employees/does_not_exist_xyz/email-aliases",
            headers=admin_headers,
            json=["x@y.com"],
            timeout=30,
        )
        assert r.status_code == 404


# ---------- Lazy recording fetch ----------
class TestLazyRecordings:
    def test_meeting_recordings_endpoint(self, admin_headers):
        # Pick any Attio meeting id
        r = requests.get(
            f"{BASE_URL}/api/meetings/attio?limit=5", headers=admin_headers, timeout=60
        )
        items = _items(r.json())
        assert items, "Need at least one Attio meeting"
        mid = items[0].get("id") or items[0].get("meeting_id")
        assert mid

        r2 = requests.get(
            f"{BASE_URL}/api/meetings/{mid}/recordings",
            headers=admin_headers,
            timeout=60,
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "recordings" in data
        assert isinstance(data["recordings"], list)
        # `cached` boolean should be present
        assert "cached" in data

    def test_recordings_404_for_unknown_meeting(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings/bogus_meeting_id_xyz/recordings",
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 404


# ---------- Regression: search, single meeting, action items ----------
class TestRegression:
    def test_search_bcg(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings/search?q=BCG", headers=admin_headers, timeout=30
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("count", 0) >= 6
        starts = [m.get("start_time") for m in data.get("results", []) if m.get("start_time")]
        assert starts == sorted(starts, reverse=True)

    def test_get_single_meeting_200(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/meetings?limit=1", headers=admin_headers, timeout=30)
        items = _items(r.json())
        mid = items[0].get("id")
        r2 = requests.get(f"{BASE_URL}/api/meetings/{mid}", headers=admin_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("id") == mid

    def test_action_items_endpoint_200(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/meetings/action-items", headers=admin_headers, timeout=30
        )
        assert r.status_code == 200

"""
Attio CRM API Client - Updated for 2025/2026 API
"""
import httpx
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pytz

class AttioClient:
    def __init__(self):
        self.api_key = os.environ.get("ATTIO_API_KEY")
        self.base_url = os.environ.get("ATTIO_BASE_URL", "https://api.attio.com/v2")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def list_meetings(
        self,
        limit: int = 50,
        cursor: Optional[str] = None,
        sort: Optional[str] = "start_desc",
    ) -> Dict[str, Any]:
        """List meetings from Attio.

        Returns: { data: [...], next_cursor: str|None }
        Pagination cursor lives at `response.pagination.next_cursor` — we
        normalize that to a top-level `next_cursor` for caller convenience.
        Default sort is `start_desc` (newest meetings first).
        """
        url = f"{self.base_url}/meetings"

        params = {"limit": min(limit, 200)}
        if sort:
            params["sort"] = sort
        if cursor:
            params["cursor"] = cursor

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                body = response.json()
                # Normalize cursor location
                pagination = body.get("pagination") or {}
                next_cursor = pagination.get("next_cursor") or body.get("next_cursor")
                return {
                    "data": body.get("data", []),
                    "next_cursor": next_cursor,
                    "pagination": pagination,
                }
            except httpx.HTTPError as e:
                print(f"Attio API Error - list_meetings: {e}")
                if hasattr(e, 'response') and e.response:
                    print(f"Response: {e.response.text}")
                return {"data": [], "next_cursor": None}
    
    async def get_meeting(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific meeting"""
        url = f"{self.base_url}/meetings/{meeting_id}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - get_meeting: {e}")
                return None
    
    async def list_call_recordings(
        self,
        meeting_id: str,
        limit: int = 50,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """List all call recordings for a meeting"""
        url = f"{self.base_url}/meetings/{meeting_id}/call_recordings"
        
        params = {"limit": min(limit, 200)}
        if cursor:
            params["cursor"] = cursor
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - list_call_recordings for meeting {meeting_id}: {e}")
                return {"data": [], "next_cursor": None}
    
    async def get_call_recording(
        self,
        meeting_id: str,
        recording_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get full call recording with transcript"""
        url = f"{self.base_url}/meetings/{meeting_id}/call_recordings/{recording_id}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - get_call_recording: {e}")
                return None

    async def get_record(self, object_slug: str, record_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single record (company / person / deal) by id."""
        url = f"{self.base_url}/objects/{object_slug}/records/{record_id}"
        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                r = await client.get(url, headers=self.headers)
                r.raise_for_status()
                return r.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - get_record({object_slug}/{record_id}): {e}")
                return None

    @staticmethod
    def extract_name_from_record(record: Dict[str, Any]) -> Optional[str]:
        """Pull a sensible display name out of an Attio record."""
        if not record:
            return None
        values = (record.get("data") or {}).get("values") or record.get("values") or {}
        # Company → name attribute is a list with {"value": "Acme"}
        for key in ("name", "full_name"):
            v = values.get(key)
            if isinstance(v, list) and v:
                item = v[0]
                if isinstance(item, dict):
                    return (
                        item.get("value")
                        or item.get("full_name")
                        or item.get("formatted")
                    )
                return str(item)
        # People → first/last
        first = values.get("first_name") or []
        last = values.get("last_name") or []
        parts = []
        if first and isinstance(first, list):
            f = first[0]
            parts.append(f.get("value") if isinstance(f, dict) else str(f))
        if last and isinstance(last, list):
            l = last[0]
            parts.append(l.get("value") if isinstance(l, dict) else str(l))
        joined = " ".join(p for p in parts if p)
        return joined or None


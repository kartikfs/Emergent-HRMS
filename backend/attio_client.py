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
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """List all meetings from Attio"""
        url = f"{self.base_url}/meetings"
        
        params = {"limit": min(limit, 200)}
        if cursor:
            params["cursor"] = cursor
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                return response.json()
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


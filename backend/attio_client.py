"""
Attio CRM API Client
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
    
    async def search_meetings(
        self, 
        starts_after: Optional[str] = None,
        starts_before: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search meetings from Attio CRM"""
        url = f"{self.base_url}/meetings/query"
        
        payload = {
            "limit": limit,
            "offset": offset
        }
        
        if starts_after:
            payload["starts_after"] = starts_after
        if starts_before:
            payload["starts_before"] = starts_before
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - search_meetings: {e}")
                return {"data": [], "has_more": False}
    
    async def search_call_recordings(
        self,
        title: Optional[str] = None,
        speaker: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Search call recordings from Attio"""
        url = f"{self.base_url}/call-recordings/query"
        
        payload = {"limit": limit}
        filters = []
        
        if title:
            filters.append({"attribute": "title", "operator": "contains", "value": title})
        if speaker:
            filters.append({"attribute": "speaker", "operator": "contains", "value": speaker})
        if date_from:
            filters.append({"attribute": "started_at", "operator": ">=", "value": date_from})
        if date_to:
            filters.append({"attribute": "started_at", "operator": "<=", "value": date_to})
        
        if filters:
            payload["filters"] = filters
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - search_call_recordings: {e}")
                return {"data": []}
    
    async def get_meeting_transcript(
        self,
        meeting_id: str,
        recording_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get full transcript for a meeting recording"""
        url = f"{self.base_url}/meetings/{meeting_id}/call-recordings/{recording_id}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - get_meeting_transcript: {e}")
                return None
    
    async def search_notes(
        self,
        meeting_id: Optional[str] = None,
        parent_record_id: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Search notes linked to meetings"""
        url = f"{self.base_url}/notes/query"
        
        payload = {"limit": limit}
        filters = []
        
        if meeting_id:
            filters.append({"attribute": "meeting_id", "operator": "=", "value": meeting_id})
        if parent_record_id:
            filters.append({"attribute": "parent_record_id", "operator": "=", "value": parent_record_id})
        
        if filters:
            payload["filters"] = filters
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - search_notes: {e}")
                return {"data": []}
    
    async def semantic_search_recordings(self, query: str, limit: int = 20) -> Dict[str, Any]:
        """Semantic search across transcript content"""
        url = f"{self.base_url}/call-recordings/semantic-search"
        
        payload = {
            "query": query,
            "limit": limit
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - semantic_search_recordings: {e}")
                return {"results": []}
    
    async def create_task(
        self,
        title: str,
        description: Optional[str] = None,
        due_date: Optional[str] = None,
        assignee: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a task in Attio"""
        url = f"{self.base_url}/tasks"
        
        payload = {"title": title}
        if description:
            payload["description"] = description
        if due_date:
            payload["due_date"] = due_date
        if assignee:
            payload["assignee"] = assignee
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Attio API Error - create_task: {e}")
                return None

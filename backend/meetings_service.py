"""
Meetings Service - Handles sync, deduplication, and data management
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import pytz
from dateutil import parser
from motor.motor_asyncio import AsyncIOMotorDatabase

from attio_client import AttioClient
from fireflies_client import FirefliesClient
from meetings_models import (
    Meeting, MeetingParticipant, MeetingSentiment, 
    SpeakerAnalytics, ActionItem, TranscriptLine,
    MeetingTranscript, MeetingSyncStatus
)

class MeetingsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.attio = AttioClient()
        self.fireflies = FirefliesClient()
        self.timezone = pytz.timezone(os.environ.get("MEETINGS_TIMEZONE", "Asia/Kolkata"))
    
    def _deduplicate_meetings(
        self, 
        meeting1: Dict[str, Any], 
        meeting2: Dict[str, Any]
    ) -> bool:
        """
        Check if two meetings are duplicates based on:
        - Timestamp within 15 minutes
        - At least one overlapping participant email
        """
        try:
            time1 = parser.parse(meeting1["start_time"])
            time2 = parser.parse(meeting2["start_time"])
            time_diff = abs((time1 - time2).total_seconds() / 60)
            
            if time_diff > 15:
                return False
            
            # Check for overlapping participants
            emails1 = {p["email"].lower() for p in meeting1.get("participants", []) if p.get("email")}
            emails2 = {p["email"].lower() for p in meeting2.get("participants", []) if p.get("email")}
            
            return len(emails1 & emails2) > 0
        except Exception as e:
            print(f"Deduplication error: {e}")
            return False
    
    async def _process_attio_meeting(self, meeting_data: Dict[str, Any]) -> Meeting:
        """Convert Attio meeting data to Meeting model"""
        
        # Attio ID structure is nested
        meeting_id_obj = meeting_data.get("id", {})
        meeting_id = meeting_id_obj.get("meeting_id") if isinstance(meeting_id_obj, dict) else str(meeting_id_obj)
        
        # Parse start/end times from Attio format
        start_obj = meeting_data.get("start", {})
        start_time = start_obj.get("datetime") if isinstance(start_obj, dict) else meeting_data.get("start")
        
        end_obj = meeting_data.get("end", {})
        end_time = end_obj.get("datetime") if isinstance(end_obj, dict) else meeting_data.get("end")
        
        # Calculate duration
        duration = None
        if start_time and end_time:
            try:
                from dateutil import parser
                start = parser.parse(start_time)
                end = parser.parse(end_time)
                duration = int((end - start).total_seconds() / 60)
            except:
                pass
        
        # Process participants
        participants = []
        for p in meeting_data.get("participants", []):
            name = p.get("name", p.get("email_address", "Unknown").split('@')[0])
            email = p.get("email_address", p.get("email", ""))
            if email:
                participants.append(MeetingParticipant(
                    name=name,
                    email=email,
                    role="organizer" if p.get("is_organizer") else "participant"
                ))
        
        # Check for call recordings
        has_recordings = len(meeting_data.get("call_recordings", [])) > 0
        
        return Meeting(
            id=f"attio_{meeting_id}",
            source="attio",
            attio_id=meeting_id,
            title=meeting_data.get("title", "Untitled Meeting"),
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration,
            participants=participants,
            has_recording=has_recordings,
            has_transcript=has_recordings,
            linked_companies=[r.get("record_id") for r in meeting_data.get("linked_records", []) if r.get("object_slug") == "companies"],
            raw_data=meeting_data
        )
    
    async def _process_fireflies_meeting(self, transcript_data: Dict[str, Any]) -> Meeting:
        """Convert Fireflies transcript data to Meeting model"""
        participants = []
        for attendee in transcript_data.get("meeting_attendees", []):
            if attendee.get("email") or attendee.get("name"):
                participants.append(MeetingParticipant(
                    name=attendee.get("name", "Unknown"),
                    email=attendee.get("email", "")
                ))
        
        # Parse Fireflies date (Unix timestamp in milliseconds)
        start_time = None
        if transcript_data.get("date"):
            try:
                # Fireflies uses milliseconds since epoch
                timestamp = int(transcript_data["date"]) / 1000
                from datetime import datetime, timezone
                start_time = datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()
            except:
                start_time = transcript_data.get("date")
        
        # Extract action items
        summary = transcript_data.get("summary", {})
        action_items = summary.get("action_items", [])
        action_items_count = len(action_items) if isinstance(action_items, list) else 0
        
        # Duration in minutes
        duration_minutes = None
        if transcript_data.get("duration"):
            duration_minutes = int(transcript_data["duration"] / 60)
        
        # Extract summary text
        summary_text = summary.get("overview", summary.get("shorthand_bullet", ""))
        if isinstance(summary_text, list):
            summary_text = " ".join(summary_text)
        
        return Meeting(
            id=f"fireflies_{transcript_data['id']}",
            source="fireflies",
            fireflies_id=transcript_data["id"],
            title=transcript_data.get("title", "Untitled Meeting"),
            start_time=start_time,
            duration_minutes=duration_minutes,
            participants=participants,
            summary=summary_text,
            keywords=summary.get("keywords", []) if summary.get("keywords") else [],
            has_recording=True,  # Fireflies always has recordings
            has_transcript=True,
            action_items_count=action_items_count,
            raw_data=transcript_data
        )
    
    async def sync_meetings(self, lookback_days: int = 90) -> Dict[str, Any]:
        """
        Sync meetings from Attio and Fireflies
        - Fetches meetings from last N days  
        - Prioritizes latest data (sorted by date desc)
        - Deduplicates and merges
        - Stores in MongoDB
        """
        try:
            # Update sync status
            await self.db.meetings_sync_status.update_one(
                {"_id": "main"},
                {"$set": {
                    "is_syncing": True,
                    "sync_started_at": datetime.utcnow().isoformat()
                }},
                upsert=True
            )
            
            # Calculate date range - prioritize latest
            end_date = datetime.now(self.timezone)
            start_date = end_date - timedelta(days=lookback_days)
            
            print(f"🔄 Syncing meetings from {start_date.date()} to {end_date.date()}")
            
            # === FETCH FROM ATTIO ===
            print("📞 Fetching Attio meetings...")
            attio_meetings = []
            cursor = None
            
            while True:
                result = await self.attio.list_meetings(limit=200, cursor=cursor)
                meetings_data = result.get("data", [])
                
                if not meetings_data:
                    break
                
                # Filter by date and get call recordings
                for meeting in meetings_data:
                    # Get call recordings for this meeting
                    meeting_id = meeting.get("id", {}).get("meeting_id")
                    if meeting_id:
                        recordings_result = await self.attio.list_call_recordings(meeting_id, limit=10)
                        meeting["call_recordings"] = recordings_result.get("data", [])
                        attio_meetings.append(meeting)
                
                cursor = result.get("next_cursor")
                if not cursor:
                    break
            
            print(f"✅ Fetched {len(attio_meetings)} Attio meetings")
            
            # === FETCH FROM FIREFLIES ===
            print("🔥 Fetching Fireflies transcripts...")
            fireflies_transcripts = []
            skip = 0
            batch_size = 50  # API limit
            
            while True:
                batch = await self.fireflies.get_transcripts(
                    limit=batch_size,
                    skip=skip,
                    from_date=start_date.isoformat(),
                    to_date=end_date.isoformat()
                )
                
                if not batch:
                    break
                
                fireflies_transcripts.extend(batch)
                
                if len(batch) < batch_size:
                    break
                
                skip += batch_size
            
            # Sort by date descending (prioritize latest) - ALL meetings
            fireflies_transcripts.sort(
                key=lambda x: x.get('date', 0), 
                reverse=True
            )
            
            print(f"✅ Fetched {len(fireflies_transcripts)} Fireflies transcripts")
            
            # Process and deduplicate
            processed_attio = []
            for meeting in attio_meetings:
                processed = await self._process_attio_meeting(meeting)
                processed_attio.append(processed.model_dump())
            
            # Sort Attio by date too (latest first)
            processed_attio.sort(
                key=lambda x: x.get('start_time', ''),
                reverse=True
            )
            
            processed_fireflies = []
            for transcript in fireflies_transcripts:
                processed = await self._process_fireflies_meeting(transcript)
                processed_fireflies.append(processed.model_dump())
            
            # Deduplicate
            merged_meetings = []
            matched_fireflies = set()
            
            for attio_meeting in processed_attio:
                # Look for matching Fireflies meeting
                match_found = False
                for i, ff_meeting in enumerate(processed_fireflies):
                    if i in matched_fireflies:
                        continue
                    
                    if self._deduplicate_meetings(attio_meeting, ff_meeting):
                        # Merge the two
                        merged = attio_meeting.copy()
                        merged["source"] = "both"
                        merged["fireflies_id"] = ff_meeting["fireflies_id"]
                        merged["summary"] = ff_meeting.get("summary")
                        merged["topics"] = ff_meeting.get("topics", [])
                        merged["keywords"] = ff_meeting.get("keywords", [])
                        merged["sentiment"] = ff_meeting.get("sentiment")
                        merged["action_items_count"] = ff_meeting.get("action_items_count", 0)
                        merged["audio_url"] = ff_meeting.get("audio_url")
                        merged["video_url"] = ff_meeting.get("video_url")
                        merged["has_video"] = ff_meeting.get("has_video", False)
                        merged["has_audio"] = ff_meeting.get("has_audio", False)
                        
                        merged_meetings.append(merged)
                        matched_fireflies.add(i)
                        match_found = True
                        break
                
                if not match_found:
                    merged_meetings.append(attio_meeting)
            
            # Add unmatched Fireflies meetings
            for i, ff_meeting in enumerate(processed_fireflies):
                if i not in matched_fireflies:
                    merged_meetings.append(ff_meeting)
            
            # SORT ALL MEETINGS BY DATE (LATEST FIRST)
            merged_meetings.sort(
                key=lambda x: x.get('start_time', ''),
                reverse=True
            )
            
            print(f"✅ Total merged meetings: {len(merged_meetings)} (sorted latest first)")
            
            # Upsert to MongoDB
            for meeting in merged_meetings:
                await self.db.meetings_cache.update_one(
                    {"id": meeting["id"]},
                    {"$set": meeting},
                    upsert=True
                )
            
            # Extract and store action items from Fireflies
            for ff_meeting in processed_fireflies:
                if ff_meeting.get("raw_data") and ff_meeting["raw_data"].get("summary"):
                    action_items = ff_meeting["raw_data"]["summary"].get("action_items", [])
                    if isinstance(action_items, list):
                        for i, item_text in enumerate(action_items):
                            # Try to auto-assign to employees
                            assigned_to = None
                            assigned_to_name = None
                            
                            # Simple heuristic: check if any employee email is mentioned
                            employees = await self.db.employees.find({}, {"_id": 0, "email": 1, "first_name": 1, "last_name": 1}).to_list(1000)
                            for emp in employees:
                                if emp["email"].lower() in item_text.lower():
                                    assigned_to = emp["email"]
                                    assigned_to_name = f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip()
                                    break
                            
                            action_item = ActionItem(
                                id=f"{ff_meeting['id']}_action_{i}",
                                text=item_text,
                                meeting_id=ff_meeting["id"],
                                meeting_title=ff_meeting["title"],
                                assigned_to=assigned_to,
                                assigned_to_name=assigned_to_name,
                                source="fireflies",
                                created_at=datetime.utcnow().isoformat()
                            )
                            
                            await self.db.meeting_action_items.update_one(
                                {"id": action_item.id},
                                {"$set": action_item.model_dump()},
                                upsert=True
                            )
            
            # Update sync status
            await self.db.meetings_sync_status.update_one(
                {"_id": "main"},
                {"$set": {
                    "last_sync_attio": datetime.utcnow().isoformat(),
                    "last_sync_fireflies": datetime.utcnow().isoformat(),
                    "total_meetings": len(merged_meetings),
                    "attio_count": len(processed_attio),
                    "fireflies_count": len(processed_fireflies),
                    "deduplicated_count": len(matched_fireflies),
                    "is_syncing": False
                }},
                upsert=True
            )
            
            return {
                "success": True,
                "total_meetings": len(merged_meetings),
                "attio_count": len(processed_attio),
                "fireflies_count": len(processed_fireflies),
                "deduplicated_count": len(matched_fireflies)
            }
            
        except Exception as e:
            print(f"Sync error: {e}")
            await self.db.meetings_sync_status.update_one(
                {"_id": "main"},
                {"$set": {"is_syncing": False}},
                upsert=True
            )
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_transcript(self, meeting_id: str) -> Optional[MeetingTranscript]:
        """Fetch transcript on-demand and cache it"""
        # Check cache first
        cached = await self.db.meeting_transcripts.find_one({"meeting_id": meeting_id}, {"_id": 0})
        if cached:
            return MeetingTranscript(**cached)
        
        # Determine source and fetch
        meeting = await self.db.meetings_cache.find_one({"id": meeting_id}, {"_id": 0})
        if not meeting:
            return None
        
        transcript_lines = []
        source = None
        
        # Try Fireflies first (has AI highlights)
        if meeting.get("fireflies_id"):
            transcript_data = await self.fireflies.get_transcript(meeting["fireflies_id"])
            if transcript_data and transcript_data.get("sentences"):
                source = "fireflies"
                for sentence in transcript_data["sentences"]:
                    transcript_lines.append(TranscriptLine(
                        speaker=sentence.get("speaker_name", "Unknown"),
                        text=sentence.get("text", ""),
                        start_time=sentence.get("start_time", 0),
                        end_time=sentence.get("end_time", 0),
                        ai_filters=sentence.get("ai_filters")
                    ))
        
        # Fallback to Attio
        if not transcript_lines and meeting.get("attio_id"):
            # Get first recording ID
            raw_data = meeting.get("raw_data", {})
            recording_ids = raw_data.get("call_recording_ids", [])
            if recording_ids:
                transcript_data = await self.attio.get_meeting_transcript(
                    meeting["attio_id"],
                    recording_ids[0]
                )
                if transcript_data and transcript_data.get("transcript"):
                    source = "attio"
                    for line in transcript_data["transcript"]:
                        transcript_lines.append(TranscriptLine(
                            speaker=line.get("speaker", "Unknown"),
                            text=line.get("text", ""),
                            start_time=line.get("start", 0),
                            end_time=line.get("end", 0)
                        ))
        
        if not transcript_lines:
            return None
        
        # Cache transcript
        transcript = MeetingTranscript(
            meeting_id=meeting_id,
            source=source,
            lines=transcript_lines
        )
        
        await self.db.meeting_transcripts.insert_one(transcript.model_dump())
        
        return transcript

import os

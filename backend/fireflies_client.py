"""
Fireflies AI GraphQL Client
"""
import os
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport
from typing import List, Dict, Any, Optional

class FirefliesClient:
    def __init__(self):
        self.api_key = os.environ.get("FIREFLIES_API_KEY")
        self.graphql_url = os.environ.get("FIREFLIES_GRAPHQL_URL", "https://api.fireflies.ai/graphql")
        
        transport = AIOHTTPTransport(
            url=self.graphql_url,
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        self.client = Client(transport=transport, fetch_schema_from_transport=False)
    
    async def get_transcripts(
        self, 
        limit: int = 50, 
        skip: int = 0,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get list of transcripts - minimal query without paid fields"""
        query = gql("""
            query GetTranscripts($limit: Int, $skip: Int) {
                transcripts(limit: $limit, skip: $skip) {
                    id
                    title
                    date
                    duration
                    participants
                    meeting_attendees {
                        name
                        email
                    }
                    summary {
                        action_items
                        overview
                        shorthand_bullet
                        keywords
                    }
                }
            }
        """)
        
        variables = {
            "limit": min(limit, 50),
            "skip": skip
        }
        
        try:
            async with self.client as session:
                result = await session.execute(query, variable_values=variables)
                transcripts = result.get("transcripts", [])

                # Filter by date if needed. Fireflies returns `date` as Unix
                # milliseconds (int). Previous implementation called
                # parser.parse() on an int which always threw, silently
                # dropping every transcript.
                if from_date or to_date:
                    from dateutil import parser as _dt_parser
                    from datetime import datetime, timezone as _tz

                    def _to_dt(value):
                        if value is None:
                            return None
                        if isinstance(value, (int, float)):
                            # Fireflies ms epoch
                            return datetime.fromtimestamp(value / 1000, tz=_tz.utc)
                        if isinstance(value, str):
                            # ISO or numeric string
                            if value.isdigit():
                                return datetime.fromtimestamp(int(value) / 1000, tz=_tz.utc)
                            dt = _dt_parser.parse(value)
                            if dt.tzinfo is None:
                                dt = dt.replace(tzinfo=_tz.utc)
                            return dt
                        return None

                    from_d = _to_dt(from_date)
                    to_d = _to_dt(to_date)

                    filtered = []
                    for t in transcripts:
                        t_date = _to_dt(t.get("date"))
                        if t_date is None:
                            # Keep meetings with unknown date rather than drop
                            filtered.append(t)
                            continue
                        if from_d and t_date < from_d:
                            continue
                        if to_d and t_date > to_d:
                            continue
                        filtered.append(t)
                    return filtered

                return transcripts
        except Exception as e:
            print(f"Fireflies API Error - get_transcripts: {e}")
            return []
    
    async def get_transcript_details(self, transcript_id: str) -> Optional[Dict[str, Any]]:
        """Lightweight per-transcript details (free-tier safe).

        Avoids `analytics` and other paid-tier fields. Used during sync to
        enrich list items with audio_url / video_url / host_email."""
        query = gql("""
            query GetTranscriptDetails($id: String!) {
                transcript(id: $id) {
                    id
                    host_email
                    audio_url
                    video_url
                }
            }
        """)
        try:
            async with self.client as session:
                result = await session.execute(
                    query, variable_values={"id": transcript_id}
                )
                return result.get("transcript")
        except Exception as e:
            print(f"Fireflies API Error - get_transcript_details: {e}")
            return None

    async def get_transcript(self, transcript_id: str) -> Optional[Dict[str, Any]]:
        """Get single transcript with full sentences (free-tier safe)."""
        query = gql("""
            query GetTranscript($id: String!) {
                transcript(id: $id) {
                    id
                    title
                    date
                    duration
                    host_email
                    meeting_attendees {
                        name
                        email
                    }
                    summary {
                        action_items
                        overview
                        bullet_gist
                        keywords
                    }
                    sentences {
                        speaker_name
                        text
                        start_time
                        end_time
                    }
                    audio_url
                    video_url
                }
            }
        """)
        
        try:
            async with self.client as session:
                result = await session.execute(
                    query,
                    variable_values={"id": transcript_id}
                )
                return result.get("transcript")
        except Exception as e:
            print(f"Fireflies API Error - get_transcript: {e}")
            return None
    
    async def get_user_info(self) -> Optional[Dict[str, Any]]:
        """Get current user info"""
        query = gql("""
            query GetUser {
                user {
                    name
                    email
                    workspace_name
                }
            }
        """)
        
        try:
            async with self.client as session:
                result = await session.execute(query)
                return result.get("user")
        except Exception as e:
            print(f"Fireflies API Error - get_user_info: {e}")
            return None

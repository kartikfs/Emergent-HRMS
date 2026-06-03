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
        """Get list of transcripts - simplified query without optional filters"""
        query = gql("""
            query GetTranscripts($limit: Int, $skip: Int) {
                transcripts(limit: $limit, skip: $skip) {
                    id
                    title
                    dateString
                    date
                    duration
                    host_email
                    participants
                    meeting_attendees {
                        name
                        email
                    }
                    summary {
                        action_items
                        overview
                        bullet_gist
                        topics_discussed
                        keywords
                        meeting_type
                    }
                    audio_url
                    video_url
                    transcript_url
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
                
                # Filter by date if needed
                if from_date or to_date:
                    from dateutil import parser
                    filtered = []
                    for t in transcripts:
                        if t.get("date"):
                            t_date = parser.parse(t["date"])
                            if from_date:
                                from_d = parser.parse(from_date)
                                if t_date < from_d:
                                    continue
                            if to_date:
                                to_d = parser.parse(to_date)
                                if t_date > to_d:
                                    continue
                            filtered.append(t)
                    return filtered
                
                return transcripts
        except Exception as e:
            print(f"Fireflies API Error - get_transcripts: {e}")
            return []
    
    async def get_transcript(self, transcript_id: str) -> Optional[Dict[str, Any]]:
        """Get single transcript with full sentences"""
        query = gql("""
            query GetTranscript($id: String!) {
                transcript(id: $id) {
                    id
                    title
                    date
                    duration
                    host_email
                    participants
                    meeting_attendees {
                        name
                        email
                    }
                    summary {
                        action_items
                        overview
                        bullet_gist
                        topics_discussed
                        keywords
                        meeting_type
                    }
                    analytics {
                        sentiments {
                            positive_pct
                            negative_pct
                            neutral_pct
                        }
                        speakers {
                            name
                        }
                    }
                    sentences {
                        speaker_name
                        text
                        start_time
                        end_time
                        ai_filters {
                            task
                            pricing
                            metric
                            question
                            sentiment
                        }
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

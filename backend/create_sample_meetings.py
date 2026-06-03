"""
Create sample meeting data for demo purposes
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
import random

async def create_sample_meetings():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    print("🎬 Creating sample meeting data for demo...")
    
    # Clear existing meetings
    await db.meetings_cache.delete_many({})
    await db.meeting_transcripts.delete_many({})
    await db.meeting_action_items.delete_many({})
    
    # Get employee emails
    employees = await db.employees.find({}, {"_id": 0, "email": 1, "first_name": 1, "last_name": 1}).to_list(100)
    
    if not employees:
        print("❌ No employees found. Please seed employees first.")
        return
    
    meeting_titles = [
        "Weekly Team Standup",
        "Q4 Planning Meeting",
        "Product Roadmap Discussion",
        "Client Presentation - Project Alpha",
        "Sprint Retrospective",
        "Marketing Campaign Review",
        "Budget Planning Session",
        "1:1 with Manager",
        "Design Review Meeting",
        "Engineering Sync",
        "Sales Pipeline Review",
        "Customer Feedback Session",
        "HR Policy Update",
        "Quarterly Business Review",
        "Project Kickoff Meeting"
    ]
    
    topics = [
        ["project updates", "blockers", "next steps"],
        ["quarterly goals", "resource allocation", "budget"],
        ["feature prioritization", "timeline", "dependencies"],
        ["client requirements", "deliverables", "timeline"],
        ["team feedback", "improvements", "action items"],
        ["campaign performance", "ROI", "next quarter"],
        ["expense review", "forecasting", "approvals"],
        ["career growth", "performance", "goals"],
        ["UI/UX feedback", "mockups", "iterations"],
        ["technical debt", "architecture", "deployment"],
        ["deal progress", "obstacles", "strategy"],
        ["customer satisfaction", "pain points", "improvements"],
        ["policy changes", "compliance", "benefits"],
        ["financial results", "market analysis", "strategy"],
        ["project scope", "stakeholders", "milestones"]
    ]
    
    summaries = [
        "Discussed current sprint progress and identified blockers. Team agreed on action items for the week.",
        "Reviewed quarterly objectives and aligned team priorities. Budget allocation approved for next quarter.",
        "Prioritized features for upcoming release. Engineering team to provide estimates by Friday.",
        "Successfully presented project deliverables to client. Received positive feedback and approval to proceed.",
        "Team shared insights on process improvements. Identified 3 key areas for optimization next sprint.",
        "Analyzed campaign performance metrics. Decided to increase budget for high-performing channels.",
        "Reviewed expenses and forecasts. Approved budget increases for critical departments.",
        "Discussed career development goals and performance metrics. Set quarterly objectives.",
        "Reviewed design mockups and gathered feedback. Design team to iterate based on comments.",
        "Addressed technical debt and planned refactoring schedule. Deployment pipeline improvements discussed.",
        "Reviewed current sales pipeline and upcoming opportunities. Strategized on key accounts.",
        "Analyzed customer feedback from recent surveys. Prioritized top 5 improvement areas.",
        "Announced new HR policies and compliance updates. Q&A session held for clarifications.",
        "Presented financial results and market analysis. Board approved strategic initiatives.",
        "Outlined project scope and success criteria. Assigned roles and responsibilities to team."
    ]
    
    # Create 30 sample meetings
    for i in range(30):
        # Random date in last 60 days
        days_ago = random.randint(1, 60)
        meeting_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        
        # Random participants (2-6 people)
        num_participants = random.randint(2, 6)
        participants = random.sample(employees, min(num_participants, len(employees)))
        
        participant_list = [
            {"name": f"{p['first_name']} {p['last_name']}", "email": p["email"]}
            for p in participants
        ]
        
        # Random source
        source = random.choice(["attio", "fireflies", "both"])
        
        # Random duration
        duration = random.choice([15, 30, 45, 60, 90])
        
        meeting_idx = i % len(meeting_titles)
        
        meeting = {
            "id": f"demo_meeting_{i+1}",
            "source": source,
            "attio_id": f"attio_{i+1}" if source in ["attio", "both"] else None,
            "fireflies_id": f"ff_{i+1}" if source in ["fireflies", "both"] else None,
            "title": meeting_titles[meeting_idx],
            "start_time": meeting_date.isoformat(),
            "end_time": (meeting_date + timedelta(minutes=duration)).isoformat(),
            "duration_minutes": duration,
            "participants": participant_list,
            "host_email": participants[0]["email"] if participants else None,
            "summary": summaries[meeting_idx],
            "topics": topics[meeting_idx],
            "keywords": random.sample(["planning", "review", "sync", "discussion", "feedback", "update"], 3),
            "has_recording": random.choice([True, False]),
            "has_video": random.choice([True, False]) if source == "fireflies" else False,
            "has_audio": random.choice([True, False]),
            "has_transcript": True,
            "action_items_count": random.randint(0, 5),
            "sentiment": {
                "positive": random.uniform(40, 70),
                "negative": random.uniform(5, 20),
                "neutral": random.uniform(20, 40)
            } if source in ["fireflies", "both"] else None,
            "audio_url": f"https://example.com/audio/{i+1}.mp3" if random.choice([True, False]) else None,
            "video_url": f"https://example.com/video/{i+1}.mp4" if source in ["fireflies", "both"] and random.choice([True, False]) else None,
            "meeting_type": random.choice(["team_meeting", "client_call", "1on1", "all_hands"]),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await db.meetings_cache.insert_one(meeting)
        
        # Create action items if any
        if meeting["action_items_count"] > 0:
            action_templates = [
                "Follow up with client by end of week",
                "Update project documentation",
                "Schedule follow-up meeting",
                "Review and approve budget proposal",
                "Prepare presentation for next meeting",
                "Complete code review by Friday",
                "Send meeting notes to team",
                "Research competitor solutions",
                "Draft proposal for new initiative",
                "Schedule 1:1 with team members"
            ]
            
            for j in range(meeting["action_items_count"]):
                # Randomly assign to one of the participants
                assigned = random.choice(participants)
                
                action_item = {
                    "id": f"action_{meeting['id']}_{j+1}",
                    "text": action_templates[j % len(action_templates)],
                    "meeting_id": meeting["id"],
                    "meeting_title": meeting["title"],
                    "assigned_to": assigned["email"],
                    "assigned_to_name": f"{assigned['first_name']} {assigned['last_name']}",
                    "status": random.choice(["open", "done"]),
                    "source": "fireflies" if source in ["fireflies", "both"] else "attio",
                    "created_at": datetime.utcnow().isoformat()
                }
                
                await db.meeting_action_items.insert_one(action_item)
    
    # Update sync status
    await db.meetings_sync_status.update_one(
        {"_id": "main"},
        {"$set": {
            "last_sync_attio": datetime.utcnow().isoformat(),
            "last_sync_fireflies": datetime.utcnow().isoformat(),
            "total_meetings": 30,
            "attio_count": len([m async for m in db.meetings_cache.find({"source": {"$in": ["attio", "both"]}})]),
            "fireflies_count": len([m async for m in db.meetings_cache.find({"source": {"$in": ["fireflies", "both"]}})]),
            "deduplicated_count": len([m async for m in db.meetings_cache.find({"source": "both"})]),
            "is_syncing": False
        }},
        upsert=True
    )
    
    print(f"✅ Created 30 sample meetings with realistic data")
    print(f"✅ Created action items for meetings")
    print(f"✅ Updated sync status")
    
    # Print stats
    total = await db.meetings_cache.count_documents({})
    attio = await db.meetings_cache.count_documents({"source": {"$in": ["attio", "both"]}})
    fireflies = await db.meetings_cache.count_documents({"source": {"$in": ["fireflies", "both"]}})
    actions = await db.meeting_action_items.count_documents({})
    
    print(f"\n📊 Stats:")
    print(f"   Total Meetings: {total}")
    print(f"   Attio Meetings: {attio}")
    print(f"   Fireflies Meetings: {fireflies}")
    print(f"   Total Action Items: {actions}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_sample_meetings())

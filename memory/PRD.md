# PeopleHub HRMS — PRD

## Original Problem Statement
Build a "Meetings & Recordings Hub" integrated into the PeopleHub HRMS that aggregates
meeting data from Attio CRM and Fireflies AI into one unified view.

### Core requirements
1. Three source-aware tabs (All Meetings, Attio, Fireflies) with real data.
2. Deduplication, keyword/semantic search, filters (date, participant).
3. Background sync and on-demand transcript fetching.
4. Action Items tracker + per-employee meeting profile.
5. **Calendar Timeline view** (Month / Week / Day).
6. **AI Chat** in transcript drawer to ask questions about each meeting (GPT-5.2).
7. Latest-first ordering across all views.
8. Present in a polished, principal-PM-grade UI.

## Personas
- **Admin / HR** — sees all meetings org-wide, syncs data, manages action items.
- **Employee** — sees only meetings they participated in, manages own action items.

## Implemented (Feb 2026 session)
- ✅ Admin & employee login (bcrypt) — `/login`, `/employee/login`
- ✅ Attio CRM client (REST) — `attio_client.py`
- ✅ Fireflies AI client (GraphQL, free-tier safe) — `fireflies_client.py`
- ✅ Meetings sync pipeline with deduplication — `meetings_service.py`
- ✅ Meetings Hub UI with 4 tabs (All / Attio / Fireflies / Timeline) — `MeetingsHub.js`
- ✅ Date-grouped All Meetings list (Today / Yesterday / This week / Earlier this month / Older)
- ✅ Polished MeetingCard with participants avatars + indicator badges
- ✅ Month / Week / Day calendar timeline — `MeetingsTimeline.js`
- ✅ Meeting drawer with Summary / Transcript / Actions / **AI Chat** — `MeetingDetailDrawer.js`
- ✅ **AI Chat (GPT-5.2)** via Emergent Universal Key — `/api/meetings/{id}/chat`
- ✅ Recording deep-links surfaced for Fireflies meetings
- ✅ Sort latest → oldest across All / Attio / Fireflies / Timeline
- ✅ Global stat cards (Total / Attio / Fireflies / With Recordings) — fetched independent of active tab
- ✅ Sync resilience — per-row try/except, partial-failure logging, MongoDB upsert tolerant

## Backlog (P1 / P2)
- P1 Employee Meeting Profile — show meetings on each employee's detail page (endpoint exists at `GET /api/employees/{id}/meetings`; UI not built yet).
- P1 Standalone Action Items Tracker page (aggregated across all meetings).
- P2 Global Cmd+K search.
- P2 Semantic search (embedding-based) — currently keyword fallback only.
- P2 GET `/api/meetings/{id}` single-meeting endpoint for shareable URLs.
- P2 Fix dashboard "trends" null-deref console warning (unrelated to meetings hub).
- P3 Real audio/video URLs from Fireflies — requires user upgrading to Fireflies Pro tier.
- P3 Real Attio call-recordings — current data set has 0 recordings linked in Attio.

## Known limitations
- Fireflies free tier returns **403 paid_required** for `audio_url`, `video_url`, `host_email`, `analytics`, and full `sentences`. We compensate by exposing a deep-link to `https://app.fireflies.ai/view/<id>` so users can still open the recording in Fireflies.
- Attio account has no `call_recordings` linked to any meeting — `has_recording=false` for all 200 Attio meetings.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`) + MongoDB (`meetings_cache`, `meeting_transcripts`, `meeting_action_items`, `meeting_chat_messages`).
- Frontend: React + Tailwind + shadcn/ui.
- LLM: GPT-5.2 via `emergentintegrations.llm.chat.LlmChat`.

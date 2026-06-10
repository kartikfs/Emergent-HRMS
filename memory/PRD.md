# PeopleHub HRMS — PRD (canonical, Feb 2026)

> Full PRD also mirrored at `/app/PRD.md` for team-facing reference.

## 1. Product Overview
PeopleHub HRMS is a full-stack HRMS unifying the hire-to-retire employee lifecycle with a Meetings & Recordings Intelligence layer that aggregates Attio CRM + Fireflies AI into one pane.

## 2. Personas
- **Super Admin / HR** — org-wide access
- **Manager** (role-flagged admin) — team-scoped
- **Employee** — self-service only

## 3. Third-Party Integrations
- **Attio CRM** (`ATTIO_API_KEY`) — meetings, linked companies/contacts, transcripts. Cursor pagination, 2,800+ records.
- **Fireflies AI** (`FIREFLIES_API_KEY`) — meetings + transcripts + action items. Free tier blocks `audio_url`, `video_url`, `host_email`, `analytics`.
- **OpenAI GPT-5.2** via Emergent LLM Key — AI Chat over transcripts.
- **MongoDB** (`MONGO_URL`) — primary datastore.

## 4. Pages (28 routes)
**Public:** `/`, `/login`, `/admin/signup`, `/employee/login`, `/employee/signup`
**Admin:** `/dashboard`, `/employees`, `/employees/:id`, `/attendance`, `/leaves`, `/recruitment`, `/onboarding`, `/payroll`, `/performance`, `/org-structure`, `/user-management`, `/meetings` (flagship)
**Employee Portal:** `/employee/portal`, `/employee/dashboard`, `/employee/profile`, `/employee/attendance`, `/employee/leaves`, `/employee/payslips`, `/employee/documents`, `/employee/meetings`

## 5. Meetings & Recordings Hub (Flagship)
4 tabs: All · Attio · Fireflies · Timeline (Month/Week/Day)
- Dedup by `(source, source_id)`; cursor-based background sync
- Lazy-loaded recordings via `/api/meetings/{id}/recordings`
- Full-text search across title/summary/participants/action items/companies
- Detail Drawer: Summary · Transcript · Action Items · AI Chat (GPT-5.2, persisted)
- Shareable deep-links (`/meetings?id=...`)
- Employee email alias mapping + Unmapped Participants admin queue

## 6. Security & Auth
- bcrypt(12) password hash · JWT HS256 24h expiry · role-scoped FastAPI deps
- All secrets in `.env`; CORS via `CORS_ORIGINS`
- Audit logs for admin/employee creation
- **P1**: Migrate JWT from localStorage → httpOnly cookies
- **Test creds**: see `/app/memory/test_credentials.md`

## 7. Design System
React 19 + Tailwind + shadcn/ui + Lucide + Sonner. Slate-900 / blue-600 / emerald / rose palette. Card-based, left-aligned, generous spacing. `data-testid` on all interactive elements.

## 8. Architecture
React SPA (3000) → FastAPI (8001) → MongoDB (motor) + Attio REST + Fireflies GraphQL + Emergent LLM (GPT-5.2). Kubernetes, supervisor-managed.

## 9. Implemented (Feb 2026)
- Admin & employee auth (bcrypt + JWT)
- Attio (REST) + Fireflies (GraphQL) clients with free-tier safety
- Meetings sync + dedup pipeline
- 4-tab Meetings Hub UI with date-grouped feed
- Month/Week/Day Calendar Timeline
- Meeting drawer with Summary / Transcript / Actions / AI Chat
- AI Chat via GPT-5.2 (Emergent Universal Key), persisted per meeting
- Shareable deep-links + Copy-link button
- Lazy-loaded recordings (event-loop safe)
- Employee email alias mapping + Unmapped Participants panel
- Global stat cards (Total / Attio / Fireflies / With Recordings) — independent of active tab
- Sync resilience: per-row try/except, partial-failure logging
- Search across title/summary/participants/topics/keywords/linked companies/contacts/action items
- Full HRMS modules: employees, attendance, leaves, recruitment, onboarding, payroll, performance, org-structure, user-management

## 10. Roadmap
**P0** — Verify Stat Cards UI fix on `/meetings`
**P1** — JWT → httpOnly cookies; Standalone Action Items Tracker page; Employee Meeting Profile in Employee Portal
**P2** — Split `MeetingDetailDrawer.js`; refactor `sync_meetings()`; `/healthz` + admin status badge; Cmd+K global search; semantic search (embeddings); pre-commit hooks (ruff + eslint)
**P3** — Real audio/video URLs (requires Fireflies Pro); Real Attio call-recordings (data dependent); React Native mobile app

## 11. Known Limitations
- Fireflies free tier returns 403 paid_required for audio/video/host_email/analytics — we compensate with `https://app.fireflies.ai/view/<id>` deep-links.
- Attio account currently has 0 `call_recordings` linked — `has_recording=false` for all 200 Attio meetings.

# PeopleHub HRMS — Product Requirements Document

_Last updated: Feb 2026_

## 1. Product Overview
**PeopleHub HRMS** is a modern, full-stack Human Resource Management System for mid-size organizations. It unifies the entire employee lifecycle (hire-to-retire) with a Meetings & Recordings Intelligence layer that aggregates conversations from **Attio CRM** and **Fireflies AI** — giving HR/managers a single pane to view people, performance, and the meetings that drive both.

**Vision:** *"One HRMS that doesn't just store employees — it understands what they're working on."*

---

## 2. Personas

| Persona | Access | Primary Use |
|---|---|---|
| **Super Admin / HR** | Full org-wide | Hire, payroll, compliance, sync meeting data, monitor performance |
| **Manager** *(role-flagged Admin)* | Team-scoped | Approve leaves, review performance, see team meetings |
| **Employee** | Self-service only | Attendance, leaves, payslips, documents, own meetings & action items |

---

## 3. Third-Party Integrations

| Service | Purpose | Auth | Key Constraints |
|---|---|---|---|
| **Attio CRM** | Pull all meetings, linked companies/contacts, transcripts | User API Key (`ATTIO_API_KEY`) | Cursor pagination; supports 2,800+ records |
| **Fireflies AI** | Pull recorded meetings, transcripts, action items | User API Key (`FIREFLIES_API_KEY`) | **Free tier**: NO `audio_url`, `video_url`, `host_email`, `analytics`. Deep-link only. |
| **OpenAI GPT-5.2** | AI Chat over meeting transcripts | Emergent Universal LLM Key | Used via `emergentintegrations` |
| **MongoDB** | Primary datastore | `MONGO_URL` env | Cached meetings, transcripts, chats |

---

## 4. Page Map (28 routes)

### Public
- `/` — **Landing Page** (marketing splash)
- `/login` — **Admin Login**
- `/admin/signup` — Admin Signup (gated)
- `/employee/login` — **Employee Login**
- `/employee/signup` — Employee Self-Signup

### Admin / HR Workspace
- `/dashboard` — KPI overview + trend charts
- `/employees` — Employee directory (CRUD, bulk import, reset password)
- `/employees/:id` — **Employee Detail** (profile + meeting history + email aliases)
- `/attendance` — Org-wide attendance log
- `/leaves` — Leave request approvals
- `/recruitment` — Job postings + candidate pipeline (Kanban)
- `/onboarding` — Onboarding tasks & templates
- `/payroll` — Salary structures, runs, reimbursements, loans
- `/performance` — Reviews, probation, training modules
- `/org-structure` — Departments, locations, designations, org chart
- `/user-management` — Admin user roles & access
- `/meetings` — **🌟 Meetings & Recordings Hub** (flagship feature)

### Employee Self-Service Portal
- `/employee/portal` — Home shell
- `/employee/dashboard` — Personal stats
- `/employee/profile` — Edit personal info
- `/employee/attendance` — Punch in/out + history
- `/employee/leaves` — Apply & track leave
- `/employee/payslips` — Download monthly payslips
- `/employee/documents` — Upload/view personal docs
- `/employee/meetings` — Personal meeting feed + action items

---

## 5. Meetings & Recordings Hub (Flagship)

**4 Tabs:** All Meetings · Attio · Fireflies · **Timeline (Month/Week/Day)**

**Capabilities:**
- Deduplication by `(source, source_id)` + smart merge on participant overlap
- Cursor-based background sync (handles 2,800+ records)
- Lazy-loaded recordings (on-demand `/api/meetings/{id}/recordings`)
- Full-text search across title, summary, participants, action items, linked companies
- Date-grouped feed (Today / Yesterday / This Week / Earlier / Older)
- Meeting Detail Drawer: **Summary · Transcript · Action Items · AI Chat**
- AI Chat over transcript (GPT-5.2, persisted per meeting)
- Shareable deep-links (`/meetings?id=...`)
- Employee email alias mapping (link external participants → internal employees)
- Unmapped Participants panel (admin action queue)

---

## 6. Security & Auth (End-to-End)

| Layer | Implementation |
|---|---|
| **Password storage** | bcrypt (12 rounds) — never plaintext |
| **Tokens** | JWT (HS256), 24h expiry, `JWT_SECRET` from env |
| **Session storage** | Currently `localStorage` → **P1 migration to httpOnly cookies** |
| **Role enforcement** | `get_current_admin` / `get_current_employee` FastAPI deps on every protected route |
| **CORS** | Whitelisted origins via `CORS_ORIGINS` env |
| **Password reset** | Admin-triggered (`PATCH /employees/{id}/reset-password`) + self-service (`POST /auth/reset-password`) |
| **Secrets** | All API keys (Attio, Fireflies, LLM, JWT) in `.env` only — never hardcoded |
| **MongoDB** | Connection via `MONGO_URL`, isolated DB per env |
| **Brute-force** | P2 — currently relies on rate-limited ingress |
| **Audit logs** | Admin signups + employee creations tracked in `audit_logs` collection |

**Test Credentials** (see `/app/memory/test_credentials.md`):
- Admin: `admin@peoplehub.com` / `admin123`
- Employee: `harper.martin@peoplehub.com` / `employee123`

---

## 7. Design System

**Stack:** React 19 + TailwindCSS + shadcn/ui + Lucide icons + Sonner (toasts)

**Visual Language:**
- **Palette:** Slate-900 primary, blue-600 accent, emerald for success, rose for danger, gray-50 surfaces
- **Typography:** System sans-serif; H1 `text-4xl→6xl`, H2 `text-lg`, body `text-sm/base`
- **Spacing:** Generous (Tailwind 6/8/12 scale)
- **Layout:** Left-aligned sidebar nav, card-based content zones, sticky action bars
- **Components:** Card, Badge, Button, Drawer, Dialog, Tabs, Table, Calendar, Avatar, Tooltip (all from `/components/ui/`)
- **Motion:** Subtle 150ms transitions on hover/focus; staggered list reveals
- **Data-testid:** On every interactive element for QA automation
- **Empty States:** Illustrated + actionable CTA (never plain "No data")

---

## 8. Architecture

```
React 19 SPA (port 3000) ──https/REACT_APP_BACKEND_URL──▶ FastAPI (port 8001)
                                                              │
                                              ┌───────────────┼───────────────┐
                                              ▼               ▼               ▼
                                          MongoDB        Attio API      Fireflies API
                                       (motor async)    (REST + cursor)  (GraphQL)
                                                              │
                                                              ▼
                                                    Emergent LLM (GPT-5.2)
```

**Backend:** FastAPI · Motor async MongoDB · APScheduler for background sync · `emergentintegrations` for LLM
**Frontend:** React 19 · React Router v7 · Axios · shadcn/ui
**Infra:** Kubernetes (Emergent platform) · Supervisor process manager · Hot reload in dev

---

## 9. Key Collections

| Collection | Purpose |
|---|---|
| `users` | Admin accounts (email, bcrypt hash, role) |
| `employees` | Employee master (with `email_aliases[]` for meeting mapping) |
| `attendance`, `leave_requests`, `payroll`, `performance_reviews` | HR core |
| `job_postings`, `candidates`, `onboarding_tasks` | Hiring & onboarding |
| `documents` | File metadata (GridFS for binaries) |
| `meetings_cache` | Deduped meetings from Attio + Fireflies |
| `meeting_transcripts` | Lazy-fetched transcripts |
| `meeting_action_items` | Aggregated action items + status |
| `meeting_chat_messages` | Per-meeting AI chat history |

---

## 10. Roadmap

| Priority | Item |
|---|---|
| 🔴 P0 | Verify Stat Cards UI fix on `/meetings` (pending screenshot) |
| 🟡 P1 | Move JWT → httpOnly cookies (security) |
| 🟡 P1 | Standalone Action Items Tracker page (cross-meeting) |
| 🟢 P2 | Split `MeetingDetailDrawer.js` (650+ lines) into sub-components |
| 🟢 P2 | Refactor monolithic `sync_meetings()` |
| 🟢 P2 | `/healthz` endpoint + admin status badge |
| 🟢 P2 | Global Cmd+K search |
| 🟢 P2 | Semantic search (embeddings) |
| 🔵 P3 | Real audio/video URLs (requires Fireflies Pro upgrade) |
| 🔵 P3 | Mobile app (React Native) |

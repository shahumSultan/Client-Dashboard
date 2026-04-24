# Enigma-Cube Client Portal

A premium, multi-tenant client portal for the Enigma-Cube AI agency. Clients log in to track project progress, view milestones, submit requests, download deliverables, and see real-time analytics — all in one place.

---

## Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 16 (App Router) | Vercel |
| Backend | FastAPI + SQLAlchemy | Railway |
| Database | PostgreSQL 16 | Railway / Docker |
| Auth | Clerk | Clerk Cloud |
| Storage | Cloudflare R2 / S3 | Cloudflare |
| AI | Claude (Anthropic) | Anthropic API |
| Email | Resend | Resend |

---

## Features

- **Project Dashboard** — status, progress bar, timeline, live update feed
- **Milestone Tracking** — vertical timeline with status indicators
- **Request System** — ticketing for feature requests, bugs, change requests
- **File Hub** — deliverables with versioning and download links
- **Analytics** — leads, conversions, revenue, AI-generated summaries, trend charts
- **Multi-tenant** — each organization sees only their own data
- **RBAC** — admin (Enigma-Cube), client owner, client member roles
- **Onboarding flow** — step-by-step client setup
- **Notifications** — in-app bell with unread count, mark-all-read
- **AI Assistant** — Claude-powered project Q&A inside the portal

---

## Project Structure

```
Client-Dashboard/
├── backend/              FastAPI app (→ Railway)
│   ├── app/
│   │   ├── api/v1/       API route handlers
│   │   ├── core/         Auth (Clerk JWT) + RBAC
│   │   ├── models/       SQLAlchemy ORM models
│   │   ├── schemas/      Pydantic request/response schemas
│   │   └── services/     AI, storage, notifications
│   ├── alembic/          Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             Next.js app (→ Vercel)
│   ├── app/
│   │   ├── (dashboard)/  Protected client portal pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── components/
│   │   ├── dashboard/    StatsCard, ProjectCard
│   │   ├── projects/     MilestoneTimeline, NewRequestDialog
│   │   ├── shared/       Sidebar, Topbar, NotificationBell
│   │   └── ui/           Button, Card, Badge, Progress, Tabs, Dialog…
│   ├── hooks/            useProjects, useNotifications, useAuth
│   ├── lib/              api.ts, types.ts, utils.ts
│   ├── Dockerfile
│   └── proxy.ts          Clerk auth middleware (Next.js 16)
├── docker-compose.yml    Full local stack
└── .env.example          Root environment variable template
```

---

## Quick Start with Docker

The fastest way to run the full stack locally.

### 1. Clone and configure

```bash
git clone <repo-url>
cd Client-Dashboard
cp .env.example .env
```

Open `.env` and fill in your Clerk keys and Anthropic API key (the only required secrets for local dev):

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_ISSUER=https://your-app.clerk.accounts.dev
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start everything

```bash
docker compose up --build
```

This starts:
- PostgreSQL on `localhost:5432`
- FastAPI backend on `localhost:8000`
- Next.js frontend on `localhost:3000`

Alembic migrations run automatically on backend startup.

### 3. Open the app

```
http://localhost:3000
```

Sign up with any email. Your first user will be `client_member` role.

**To make yourself admin**, run:

```bash
docker compose exec postgres psql -U enigma -d client_portal \
  -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL and Clerk keys
alembic upgrade head
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (API explorer, only in DEBUG=true mode)
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.local.example .env.local   # fill in Clerk keys
npm run dev
# → http://localhost:3000
```

---

## Deployment

### Backend → Railway

1. Create a Railway project and add a **PostgreSQL** plugin
2. Add the `backend/` folder as the service root (Railway auto-detects `railway.toml`)
3. Set all environment variables from `.env.example` in the Railway dashboard
4. Set `DATABASE_URL` to the Railway PostgreSQL connection string
5. Deploy — Alembic runs on startup via `CMD` in `railway.toml`

### Frontend → Vercel

1. Import the repo into Vercel, set **Root Directory** to `frontend/`
2. Add these environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `CLERK_SECRET_KEY` | Your Clerk secret key |
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL (e.g. `https://your-app.up.railway.app`) |

3. Deploy

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Same key, exposed to browser |
| `CLERK_JWT_ISSUER` | Yes | Your Clerk JWT issuer URL |
| `ANTHROPIC_API_KEY` | No | Enables AI assistant + summaries |
| `STORAGE_BUCKET` | No | R2/S3 bucket for file uploads |
| `STORAGE_ENDPOINT` | No | R2/S3 endpoint URL |
| `STORAGE_ACCESS_KEY` | No | R2/S3 access key |
| `STORAGE_SECRET_KEY` | No | R2/S3 secret key |
| `STORAGE_PUBLIC_URL` | No | Public CDN URL for uploaded files |
| `RESEND_API_KEY` | No | Email notifications via Resend |
| `FROM_EMAIL` | No | Sender address for emails |

---

## Roles

| Role | Who | Permissions |
|---|---|---|
| `admin` | Enigma-Cube team | Full access — create/edit all orgs, projects, milestones, analytics |
| `client_owner` | Primary client contact | View + edit own org, submit requests |
| `client_member` | Additional client users | View own org, submit requests |

Assign roles via the `PATCH /api/v1/users/{id}/role` endpoint (admin only).

---

## API Overview

All routes are under `/api/v1/`. Full interactive docs at `/docs` when `DEBUG=true`.

```
GET/POST   /organizations
GET/PATCH  /organizations/{id}
GET/PATCH  /users/me
GET        /projects
POST       /projects                  (admin)
GET/PATCH  /projects/{id}
GET/POST   /projects/{id}/updates
GET/POST   /milestones/project/{id}
PATCH      /milestones/{id}           (admin)
GET/POST   /requests/project/{id}
PATCH      /requests/{id}             (admin)
GET/POST   /files/project/{id}/…
GET/POST   /analytics/project/{id}
GET        /notifications
POST       /notifications/read-all
GET/PUT    /onboarding/{org_id}
POST       /ai/ask
```

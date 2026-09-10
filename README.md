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
| AI | Groq (Llama 3.3 70B) | Groq API |
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
- **Comments & remarks** — clients comment on any milestone, update, file, or the project itself; admins reply in-thread and mark threads resolved
- **Admin comment inbox** — every client remark across all projects in one reply queue (`/admin/comments`)
- **Invite-only access** — you create the client, then invite an email; they join that workspace automatically on sign-up
- **Notifications** — in-app bell with unread count, mark-all-read
- **AI Assistant** — Groq-powered project Q&A inside the portal

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

Open `.env` and fill in your Clerk keys and Groq API key (the only required secrets for local dev):

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_ISSUER=https://your-app.clerk.accounts.dev
GROQ_API_KEY=gsk_...
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

Both app services run in **dev mode against your working tree** — the source is
bind-mounted, so backend edits hot-reload via uvicorn and frontend edits via
Next. No rebuild needed while developing. Generated migrations land on the host:

```bash
docker compose exec backend alembic revision --autogenerate -m "your change"
```

### 3. Open the app

```
http://localhost:3000
```

Sign up with any email. Your first user will be `client_member` role.

### 4. Become an admin

There is no seeded admin account, and the `users` table starts empty — a row is
created lazily on a user's first authenticated API call, not at Clerk sign-up.
So the order matters:

1. Sign up at `/sign-up`.
2. **Complete the `/welcome` form** — this is what creates your organization and
   your `users` row.
3. Promote yourself:

```bash
./scripts/make-admin.sh your@email.com
```

Hard-refresh, and **Admin panel** appears in the sidebar.

Run the script with no arguments to list the users it can see.

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

Two hosts, two subdomains of `enigma-cube.com`:

| | Host | Domain |
|---|---|---|
| Frontend | Vercel | `portal.enigma-cube.com` |
| Backend | Railway | `api.enigma-cube.com` |
| Database | Railway Postgres | internal |

### 1. Cloudflare DNS

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | `portal` | `cname.vercel-dns.com` | **DNS only** |
| CNAME | `api` | your Railway-provided domain | **DNS only** |

Leave the orange cloud **off**. Proxying breaks certificate issuance on both
platforms; you can turn it on afterwards with SSL/TLS set to Full (strict).

### 2. Clerk production instance

Development keys (`pk_test_`) only work on localhost. In the Clerk dashboard,
switch to the **Production** environment and set its domain to
`portal.enigma-cube.com`. Clerk then gives you five CNAMEs to add in
Cloudflare, all **DNS only**:

```
clerk, accounts, clkmail, clk._domainkey, clk2._domainkey
```

Copy the production keys once those verify. The issuer becomes
`https://clerk.enigma-cube.com` — that is the value for `CLERK_JWT_ISSUER`.

### 3. Backend → Railway

**Already provisioned.** Project `Client-Dashboard`
(`874c1bf0-35cf-4e5a-8a31-ffc6056fedc0`) has a Postgres service and a `backend`
service connected to this repo on `main`:

- `rootDirectory` is `/backend`, so Railway builds the API and not the
  monorepo root.
- `watchPatterns` is `/backend/**`, so a frontend-only push does not trigger a
  pointless API rebuild.
- **Pushing to `main` deploys automatically.**

Railway reads `railway.toml`, which runs `alembic upgrade head` before starting
uvicorn, so the schema is applied on every deploy.

To rebuild this from scratch: add a PostgreSQL service, then connect a service
to the repo with root directory `backend`.

```env
DATABASE_URL=<Railway Postgres connection string>
CLERK_SECRET_KEY=sk_live_...
CLERK_JWT_ISSUER=https://clerk.enigma-cube.com
FRONTEND_URL=https://portal.enigma-cube.com
DEBUG=false
```

`FRONTEND_URL` is load-bearing twice over: it is the CORS allow-list, and it is
checked against Clerk's `azp` claim. Get it wrong and every request 401s.

Set `EXTRA_ALLOWED_ORIGINS` (comma-separated) if you want Vercel preview
deployments to reach the API.

Add storage and email only when you need them: `STORAGE_*` for R2/S3 file
uploads, `RESEND_API_KEY` and `FROM_EMAIL` for outbound mail.

### 4. Frontend → Vercel

Import the repo with **Root Directory** set to `frontend/`, then add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `CLERK_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_API_URL` | `https://api.enigma-cube.com` |

`NEXT_PUBLIC_*` values are inlined at build time, so changing one needs a
redeploy, not just a restart.

Set these in the Vercel dashboard. `vercel.json` deliberately does not declare
them: the legacy `"env": { "KEY": "@secret" }` syntax fails the build unless a
matching Vercel secret already exists.

Add `portal.enigma-cube.com` under the project's **Domains**.

### 5. First admin

The `users` table starts empty and rows are created lazily on first
authenticated request, so sign in once at `portal.enigma-cube.com`, then
promote yourself against the production database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@enigma-cube.com';
```

From then on it is invite-only: create a client, invite their email, done.

---

## Environment Variables Reference

**Backend** (Railway)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret. Also used to read a user's profile, since the session token carries no email |
| `CLERK_JWT_ISSUER` | Yes | Clerk Frontend API URL — tokens are verified against its JWKS |
| `FRONTEND_URL` | Yes in prod | CORS allow-list **and** the expected Clerk `azp`. Wrong value = every request 401s |
| `DEBUG` | No | `true` exposes `/docs`. Leave `false` in production |
| `EXTRA_ALLOWED_ORIGINS` | No | Extra CORS origins, comma-separated (e.g. Vercel previews) |
| `GROQ_API_KEY` | No | Enables AI assistant + summaries |
| `GROQ_MODEL` | No | Chat model (default `llama-3.3-70b-versatile`) |
| `GROQ_FAST_MODEL` | No | Summary model (default `llama-3.1-8b-instant`) |
| `STORAGE_BUCKET` | No | R2/S3 bucket. Unset means no object storage — uploads return 503 |
| `STORAGE_ENDPOINT` | No | R2/S3 endpoint URL |
| `STORAGE_REGION` | No | Signing region (default `auto`, which suits R2) |
| `STORAGE_ACCESS_KEY` | No | R2/S3 access key |
| `STORAGE_SECRET_KEY` | No | R2/S3 secret key |
| `STORAGE_PUBLIC_URL` | No | Public CDN URL for uploaded files |
| `RESEND_API_KEY` | No | Configured but not yet sent from — invitations are shared by copying the link |
| `FROM_EMAIL` | No | Sender address for emails |

**Frontend** (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | The name Clerk's dashboard gives you. Inlined at build time, so changing it needs a redeploy |
| `CLERK_SECRET_KEY` | Yes | Read server-side by Clerk's Next.js SDK |
| `NEXT_PUBLIC_API_URL` | Yes | Backend origin, e.g. `https://api.enigma-cube.com` |

`CLERK_PUBLISHABLE_KEY` (without the `NEXT_PUBLIC_` prefix) is not used by
either service — Clerk's server code reads only the prefixed name.

---

## Tests

```bash
docker compose exec backend python -m pytest tests -q
```

48 tests, run against a throwaway `client_portal_test` database built from the
models. They cover the things that matter with real clients: tenant isolation
across every project-scoped collection, clients being read-and-comment only,
the comment permission rules, and self-serve signup.

Auth is stubbed at `get_current_user`, so routes still execute their real
`require_admin` and `assert_project_access` logic against the chosen identity.

---

## Starting fresh

Wipes every row and keeps only the admin accounts:

```bash
./scripts/reset-db.sh
```

Admins are preserved by `clerk_id`, so you stay admin on the next request.
Without that, the lazy provisioning in `get_current_user` would recreate you as
a `client_member` with no organization and push you through the client signup
flow, creating a stray workspace.

A timestamped `pg_dump` is written before anything is deleted. Admins are left
with no organization — that is correct: only clients get one, and an admin
without one is sent to `/admin` rather than the client portal.

---

## Demo data

Seeds a realistic client — a project mid-flight with milestones, updates, a
request, four weeks of analytics, and a comment thread with a reply:

```bash
docker compose exec backend python scripts/seed_demo.py
docker compose exec backend python scripts/seed_demo.py --remove
```

Idempotent, and scoped to its own organization — it never touches your data.

---

## Design system

Dark-only, glassmorphic, locked to the enigma-cube.com palette. Tokens live in
`frontend/app/globals.css`; components consume them by role, never as raw hex.

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#0D0D0D` | Page background |
| `--bg-elevated` | `#1C1C1C` | Modals, popovers |
| `--glass` / `--glass-border` | `rgba(255,255,255,.05)` / `.12` | Glass fill + hairline |
| `--brand` | `#A92E2E` | Fills and primary actions (white on it = 5.9:1) |
| `--brand-soft` | `#FFB3B3` | Accent **text** on dark (`--brand` alone only reaches 3:1) |
| `--fg-muted` / `--fg-subtle` | `rgba(255,255,255,.72)` / `.48` | Body / secondary text |

Type is **Figtree** (UI) + **Fragment Mono** (data, labels, timestamps), both
loaded via `next/font`. Motion uses one easing curve (`cubic-bezier(.16,1,.3,1)`)
and is disabled wholesale under `prefers-reduced-motion`.

Glass needs colour behind it to refract, so `.ambient` paints two slow
brand-tinted pools plus a grain overlay behind every page.

Chart colours (`#e66767` / `#3987e5`) are validated for the dark surface:
adjacent CVD ΔE 19.2, normal-vision ΔE 29.0, both ≥3:1 against the card.

---

## Access model

Access is **invite-only**. There is no self-serve signup — a client cannot
create a workspace, only join one you made for them.

1. **Create the client** — `/admin/clients` → New client. The slug is derived
   from the name.
2. **Invite an email** — on the client's page, enter the address they will sign
   up with and pick Owner or Member.
3. **They sign up** at `/sign-up` with that address. The invitation is redeemed
   on their first authenticated request, so they land straight in the right
   workspace — no link to click.

The invite link (`/join/<token>`) is a convenience for anyone who wants one; it
is idempotent, so opening it after already being placed still works.

Invitations are **bound to the email address**, so a forwarded or leaked link
cannot admit a stranger — the recipient must be signed in as the invitee. They
are single-use, expire after 14 days, can be revoked, and can never grant
`admin`.

A signed-in user with no workspace lands on `/welcome`, which explains that
they need an invitation rather than asking them to create anything.

| Endpoint | |
|---|---|
| `POST /invitations` | admin — create (re-inviting returns the live one) |
| `GET /invitations` | admin — pending by default, `?include_spent=true` for all |
| `DELETE /invitations/{id}` | admin — revoke |
| `GET /invitations/preview?token=` | what the join page shows |
| `POST /invitations/accept` | redeem a token |

---

## Roles

| Role | Who | Permissions |
|---|---|---|
| `admin` | Enigma-Cube team | Full access — create/edit all orgs, projects, milestones, analytics |
| `client_owner` | Primary client contact | View own org, edit org profile, submit requests, comment |
| `client_member` | Additional client users | View own org, submit requests, comment |

Admins have **no organization** — that is correct, and an admin without one is
sent to `/admin` rather than the client portal.

Clients are **read-and-comment only** on the work itself — creating or editing
projects, milestones, analytics and file uploads are all admin-only.

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

POST       /invitations                    (admin) invite an email to a client
GET        /invitations                    (admin) pending invitations
DELETE     /invitations/{id}               (admin) revoke
GET        /invitations/preview?token=
POST       /invitations/accept
GET        /comments/inbox                 (admin) every thread, newest first
GET/POST   /comments/project/{id}
POST       /comments/{id}/replies
PATCH      /comments/{id}                  edit your own
PATCH      /comments/{id}/resolve          (admin)
DELETE     /comments/{id}
```

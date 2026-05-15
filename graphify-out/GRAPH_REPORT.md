# Graph Report - .  (2026-05-15)

## Corpus Check
- Corpus is ~22,421 words - fits in a single context window. You may not need a graph.

## Summary
- 503 nodes · 796 edges · 52 communities (33 shown, 19 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 134 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend API & Data Layer|Backend API & Data Layer]]
- [[_COMMUNITY_Client Dashboard UI|Client Dashboard UI]]
- [[_COMMUNITY_Admin Portal Pages|Admin Portal Pages]]
- [[_COMMUNITY_shadcnui Component Library|shadcn/ui Component Library]]
- [[_COMMUNITY_Project Resource APIs|Project Resource APIs]]
- [[_COMMUNITY_Admin Navigation & Layout|Admin Navigation & Layout]]
- [[_COMMUNITY_Clerk Auth Core|Clerk Auth Core]]
- [[_COMMUNITY_Frontend TypeScript Config|Frontend TypeScript Config]]
- [[_COMMUNITY_Frontend Package Dependencies|Frontend Package Dependencies]]
- [[_COMMUNITY_shadcnui Path Aliases|shadcn/ui Path Aliases]]
- [[_COMMUNITY_Org Management & Permissions|Org Management & Permissions]]
- [[_COMMUNITY_Placeholder Dashboard Routes|Placeholder Dashboard Routes]]
- [[_COMMUNITY_Auth RBAC Dependency Chain|Auth RBAC Dependency Chain]]
- [[_COMMUNITY_App Root & React Query|App Root & React Query]]
- [[_COMMUNITY_Vercel Deployment Config|Vercel Deployment Config]]
- [[_COMMUNITY_Backend Bootstrap & Migrations|Backend Bootstrap & Migrations]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_AI Service (Groq)|AI Service (Groq)]]
- [[_COMMUNITY_Module Group 20|Module Group 20]]
- [[_COMMUNITY_Module Group 22|Module Group 22]]
- [[_COMMUNITY_Module Group 27|Module Group 27]]
- [[_COMMUNITY_Module Group 28|Module Group 28]]
- [[_COMMUNITY_Module Group 29|Module Group 29]]
- [[_COMMUNITY_Module Group 30|Module Group 30]]
- [[_COMMUNITY_Module Group 32|Module Group 32]]
- [[_COMMUNITY_Module Group 40|Module Group 40]]
- [[_COMMUNITY_Module Group 41|Module Group 41]]
- [[_COMMUNITY_Module Group 42|Module Group 42]]
- [[_COMMUNITY_Module Group 43|Module Group 43]]
- [[_COMMUNITY_Module Group 44|Module Group 44]]
- [[_COMMUNITY_Module Group 45|Module Group 45]]
- [[_COMMUNITY_Module Group 46|Module Group 46]]
- [[_COMMUNITY_Module Group 47|Module Group 47]]
- [[_COMMUNITY_Module Group 48|Module Group 48]]
- [[_COMMUNITY_Module Group 49|Module Group 49]]
- [[_COMMUNITY_Module Group 50|Module Group 50]]
- [[_COMMUNITY_Module Group 51|Module Group 51]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 45 edges
2. `Base` - 19 edges
3. `dependencies` - 18 edges
4. `assert_project_access()` - 18 edges
5. `compilerOptions` - 16 edges
6. `Project` - 12 edges
7. `useCurrentUser()` - 11 edges
8. `Project` - 11 edges
9. `devDependencies` - 9 edges
10. `Organization` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ProjectOut` --semantically_similar_to--> `Project`  [INFERRED] [semantically similar]
  backend/app/schemas/project.py → frontend/lib/types.ts
- `MilestoneOut` --semantically_similar_to--> `Milestone`  [INFERRED] [semantically similar]
  backend/app/schemas/milestone.py → frontend/lib/types.ts
- `RootLayout()` --implements--> `Clerk Authentication`  [INFERRED]
  frontend/app/layout.tsx → frontend/README.md
- `AdminUsersPage()` --conceptually_related_to--> `Role-Based Access Control (admin/client_owner/client_member)`  [INFERRED]
  frontend/app/(admin)/admin/users/page.tsx → frontend/README.md
- `cn()` --calls--> `clsx`  [INFERRED]
  frontend/lib/utils.ts → frontend/package.json

## Hyperedges (group relationships)
- **Clerk Authentication Flow** — concept_clerk_auth, frontend_proxy_clerkauthmiddleware, hooks_useauth_useauthtoken, hooks_useauth_usecurrentuser [EXTRACTED 0.95]
- **Admin Portal Page Group** — admin_layout_adminlayout, admin_page_admindashboard, clients_page_adminclientspage, users_page_adminuserspage [INFERRED 0.95]
- **Project as Central Data Hub** — lib_types_project, lib_types_milestone, lib_types_clientrequest, lib_types_analyticsentry [EXTRACTED 0.95]
- **Dashboard Shell (Layout + Sidebar + Topbar)** — dashboard_layout_dashboardlayout, shared_sidebar_sidebar, shared_topbar_topbar [EXTRACTED 0.95]
- **Placeholder Dashboard Pages (redirect to project)** — files_page_filespage, requests_page_clientrequestspage, milestones_page_milestonespage, analytics_page_analyticspage [INFERRED 0.95]
- **shadcn/ui Component Library** — ui_button_button, ui_card_card, ui_dialog_dialog, ui_badge_badge, ui_progress_progress [INFERRED 0.95]
- **FastAPI Bootstrap (App + Config + Database)** — app_main_fastapiapp, app_config_settings, app_database_asyncengine [EXTRACTED 0.95]
- **Backend Project Data Model (ORM + Schema)** — models_project_project, models_milestone_milestone, models_request_request, models_file_file [INFERRED 0.95]
- **Groq AI Service Layer** — services_ai_askprojectassistant, services_ai_generateanalyticssummary, concept_groq_ai [EXTRACTED 0.95]
- **RBAC Auth Dependency Chain** — core_auth_verifyclerktoken, core_auth_getcurrentuser, core_auth_requireadmin, core_auth_requireclientowner [EXTRACTED 0.95]
- **Admin-Only API Endpoints** — v1_admin_getstats, v1_admin_listallrequests, v1_admin_listallusers, v1_admin_updateuserrole [EXTRACTED 0.95]
- **Next.js Default Public Static Icons** — public_window_icon, public_globe_icon, public_vercel_icon, public_file_icon [INFERRED 0.95]

## Communities (52 total, 19 thin omitted)

### Community 0 - "Backend API & Data Layer"
Cohesion: 0.06
Nodes (54): Base, Base, BaseModel, assert_org_access Function, assert_project_access Function, DeclarativeBase, Analytics ORM Model, AnalyticsEntry (+46 more)

### Community 1 - "Client Dashboard UI"
Cohesion: 0.08
Nodes (45): DashboardPage(), ProjectCard(), ProjectCardProps, STATUS_ICON, StatsCard(), StatsCardProps, useAnalytics(), useCreateRequest Hook (+37 more)

### Community 2 - "Admin Portal Pages"
Cohesion: 0.06
Nodes (27): MILESTONE_STATUSES, MS_ICON, STATUS_COLOR, STATUSES, api, Axios API Client, setAuthToken(), File (+19 more)

### Community 3 - "shadcn/ui Component Library"
Cohesion: 0.08
Nodes (34): shadcn/ui Component Pattern, useCreateRequest(), cn(), CATEGORIES, NewRequestDialog(), NewRequestDialogProps, PRIORITIES, Button (+26 more)

### Community 4 - "Project Resource APIs"
Cohesion: 0.07
Nodes (28): assert_project_access(), Ensure the user can access the given project., FileOut, PresignedUploadOut, ask_project_assistant(), generate_analytics_summary(), _get_client(), create_notification() (+20 more)

### Community 5 - "Admin Navigation & Layout"
Cohesion: 0.11
Nodes (27): AdminSidebar(), AdminSidebarProps, NAV, AdminLayout(), getTitle(), PAGE_TITLES, Admin Dashboard Page, Admin Clients List Page (+19 more)

### Community 6 - "Clerk Auth Core"
Cohesion: 0.09
Nodes (21): _get_clerk_jwks(), get_current_user(), verify_clerk_token(), dependencies, axios, @clerk/nextjs, @clerk/themes, clsx (+13 more)

### Community 7 - "Frontend TypeScript Config"
Cohesion: 0.1
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Frontend Package Dependencies"
Cohesion: 0.11
Nodes (17): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+9 more)

### Community 9 - "shadcn/ui Path Aliases"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, rsc, $schema (+7 more)

### Community 10 - "Org Management & Permissions"
Cohesion: 0.19
Nodes (8): assert_org_access(), Ensure the user can access the given organization., OnboardingData, get_onboarding(), upsert_onboarding(), create_organization(), get_organization(), update_organization()

### Community 11 - "Placeholder Dashboard Routes"
Cohesion: 0.22
Nodes (6): AnalyticsPage(), Placeholder Pages Pattern (redirect to project detail), FilesPage(), MilestonesPage(), AdminRequestsPage(), Client Requests Page (Placeholder)

### Community 12 - "Auth RBAC Dependency Chain"
Cohesion: 0.25
Nodes (9): Auto-Provision User on First Login, get_current_user Dependency, require_admin Dependency, require_client_owner Dependency, verify_clerk_token Function, Admin Stats Endpoint, Admin List All Requests Endpoint, Admin List All Users Endpoint (+1 more)

### Community 13 - "App Root & React Query"
Cohesion: 0.28
Nodes (6): inter, metadata, RootLayout(), QueryProvider(), Toaster(), ToasterProps

### Community 14 - "Vercel Deployment Config"
Cohesion: 0.22
Nodes (8): buildCommand, devCommand, env, CLERK_SECRET_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, framework, installCommand

### Community 15 - "Backend Bootstrap & Migrations"
Cohesion: 0.29
Nodes (7): Alembic Migration Environment, Config, Settings, SQLAlchemy Async Database Engine, FastAPI Application Entry Point, BaseSettings, Initial Database Schema Migration

### Community 19 - "AI Service (Groq)"
Cohesion: 0.5
Nodes (5): Groq AI Backend (LLM provider), ask_project_assistant (Groq AI), generate_analytics_summary (Groq AI), AI Ask Endpoint Router, Analytics API Router

### Community 22 - "Module Group 22"
Cohesion: 0.83
Nodes (4): File / Document Icon, Globe / Internet Icon, Vercel Logo Icon, Window / Browser Chrome Icon

## Knowledge Gaps
- **162 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `shadcn/ui Component Library` to `Client Dashboard UI`, `Admin Navigation & Layout`, `Clerk Auth Core`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Why does `Project` connect `Client Dashboard UI` to `Backend API & Data Layer`, `Admin Portal Pages`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `ProjectOut` connect `Backend API & Data Layer` to `Client Dashboard UI`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `Base` (e.g. with `MilestoneStatus` and `Milestone`) actually correct?**
  _`Base` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `assert_project_access()` (e.g. with `list_requests()` and `create_request()`) actually correct?**
  _`assert_project_access()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API & Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
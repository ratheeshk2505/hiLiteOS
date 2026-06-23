# HiLITE Sales OS

A multi-tenant Sales ERP built for the technical assessment. All five
modules are implemented:

- **Module 1 — Platform Administration**: HiLITE OS super-admins onboard and
  manage organizations (tenants), toggle feature modules per org.
- **Module 2 — Organization Administration**: organization admins manage
  their own teams, roles, and users — fully isolated from every other tenant.
- **Module 3 — Sales Management**: leads, activity logging, and a status
  pipeline, with role-based visibility (own / team / organization-wide).
- **Module 4 — Dashboard & Analytics**: role-aware metrics over Module 3's
  data — personal stats for everyone, a team leaderboard for Team Leads,
  org-wide totals and top performers for Directors/admins.
- **Module 5 — Notifications**: an event-driven subscriber that turns
  Module 3's domain events into in-app notifications, with zero coupling
  between the two modules at the code level.
- **Security & scalability hardening** that cuts across every module above:
  short-lived access tokens with revocable refresh sessions, rate limiting,
  audit logging, pagination, forced password changes for temp passwords,
  and connection/query safeguards for load.

Stack: **React (Vite) + Express + PostgreSQL (Neon)**, with Redis as an
optional shared store for rate limiting once you run more than one API
instance.

```
hilite-sales-os/
├── package.json    Root: npm workspaces tying backend + frontend together
├── backend/        Express API
└── frontend/       React app — two consoles, two logins
```

This is an **npm workspaces monorepo**: one `npm install` at the root
resolves dependencies for both `backend` and `frontend`, and a handful of
root-level scripts proxy into each workspace so you don't need two terminals
open just to start the project.

## What's implemented

**Module 1 (Platform Administration)**
- Platform admin login, create organization (+ its first admin user, in one
  DB transaction), organization list with search/status filter/pagination,
  suspend/reactivate, per-module enable/disable with zero code changes.
- Module catalog management: platform admins can add new modules to the
  master catalog and edit their name/description (the `key` is immutable
  once set — it's the stable identifier every org's enablement rows and
  the seed data reference). A brand-new module shows up as "not enabled"
  for every existing organization automatically — no backfill step
  required, since every per-org read already defaults a missing
  enablement row to `false`.
- Admin-initiated password reset for an organization's admin account — the
  recovery path when they're locked out and can't reach self-service
  change-password (which itself requires the password they no longer have).

**Module 2 (Organization Administration)**
- Org user login resolved by organization code + email + password (no
  subdomain routing in this MVP).
- Team management — create, rename, delete; members become unassigned
  (not deleted) if their team is removed.
- Role management — roles are a per-organization table, not a fixed list.
  Every org gets four seeded defaults (Executive, Team Lead, Sales Manager,
  Director), each carrying an explicit **data_scope** (`own` / `team` /
  `organization`) that Modules 3 and 4 use for permissions — admins can
  rename defaults, change their scope, or add entirely custom roles.
- User management — create users (auto-generated temp password, shown
  once), assign/reassign team and role inline, activate/deactivate,
  admin-initiated password reset. The org's own admin account can't be
  deactivated through this flow.
- Module visibility — org admins can see which modules are enabled for
  their own organization. **Read-only by design**: enablement is a
  platform-level decision (typically tied to plan/billing tier), so there
  is deliberately no endpoint anywhere that lets an org admin turn one on
  for themselves — that would make the platform's gate meaningless.

**Module 3 (Sales Management)**
- Lead management: create, list (search/status/project filters, paginated),
  detail view, and editing the lead's core details (name, mobile number,
  email, source, project) after the fact — fixing a typo or updating which
  project a lead is interested in doesn't require touching status or
  assignment, which stay on their own dedicated endpoints since they carry
  side effects (status history, domain events) a plain field edit shouldn't.
- Status pipeline: New → Contacted → Visit Scheduled → Site Visit Completed
  → Negotiation → Won/Lost, with every transition recorded in a
  `lead_status_history` table rather than overwritten in place.
- Assignment: manual, or bonus "least-loaded" auto-assignment (picks
  whichever eligible active user currently has the fewest open leads).
- Activity logging: phone calls, meetings, site visits, virtual meetings,
  each with notes and a timestamp.
- **Role-based visibility, enforced server-side, not just hidden in the UI**:
  an Executive (`own` scope) sees only leads assigned to them; a Team Lead
  or Sales Manager (`team` scope) sees their whole team's leads; a Director
  or org admin (`organization` scope) sees everything. This is driven by
  each role's `data_scope`, not by matching on a role's *name* — renaming
  "Director" to something else, or inventing a new role that should behave
  like one of these tiers, doesn't break anything.
- Domain events (`lead.created`, `lead.assigned`, `lead.won`) are published
  to an internal event bus — Module 5 is the actual consumer, but Module 3
  has no idea it exists.

**Module 4 (Dashboard & Analytics)**
- One endpoint, `GET /api/dashboard/summary`, whose response shape depends
  on the caller's `data_scope` rather than the route being gated differently
  per role.
- Every caller gets their own numbers: lead counts by status, conversion
  rate, activity counts (30-day and all-time), and recent leads/activity.
- `team` scope additionally gets a leaderboard of their whole team, ranked
  by leads won.
- `organization` scope additionally gets org-wide totals plus top-10 tables
  for both teams and individual performers.
- Every figure is a SQL aggregate (`COUNT`, `COUNT ... FILTER`, with
  `DISTINCT` where a join could otherwise double-count) — never "load every
  lead into JS and count them," since this is exactly the endpoint someone
  hits constantly.

**Module 5 (Notifications)**
- Two event subscribers (`lead.assigned`, `lead.won`) are the *only* way
  this module learns anything happened — there is no direct call from
  Module 3 into Module 5 anywhere in the codebase. Sales publishes; this
  module listens. That's the actual mechanism behind the "Sales module
  should not directly create notifications" requirement, not just a comment
  saying so.
- `lead.assigned` notifies the new assignee, unless they assigned the lead
  to themselves (no point notifying yourself of your own action).
- `lead.won` notifies every org admin, mirroring Module 4's org-wide scope
  for "who should know about this" rather than inventing a separate notion
  of visibility.
- REST list (paginated, `?unreadOnly=true` filter), unread count, mark one
  as read, mark all as read — each notification's read state checked
  against its owning user, not just its id, so one user can't mark another's
  notification as read by guessing it.
- A bell icon in the org console's topbar polls the unread count and shows
  a dropdown of recent notifications; clicking one marks it read and
  navigates to the lead it's about.

## Security

- **Short-lived access tokens (15m) + revocable refresh tokens (30d).** A
  stolen access token is only useful for a few minutes; sessions are
  carried by a refresh token that's hashed before storage and can be
  revoked server-side — logging out, deactivating a user, or suspending an
  organization all take effect immediately instead of waiting out a token's
  remaining lifetime. Refresh tokens rotate on every use (old one revoked,
  new one issued), so reuse of an already-rotated token is detectable.
- **Forced password change on first login.** Every temp password this app
  hands out (org admin at org creation, org users at creation, either kind
  at an admin-initiated reset) is flagged `must_change_password`; the org
  console redirects to a mandatory change-password screen until that's
  cleared. This is a client-side gate, not a server-side block on other
  endpoints — worth knowing if you're evaluating how far the enforcement
  actually reaches.
- **Rate limiting**, tighter on login endpoints than the general API, to
  slow down credential-stuffing attempts. Backed by Redis when `REDIS_URL`
  is set so the limit is enforced across every API instance behind a load
  balancer, not just per-process — verified directly against a real Redis
  instance, not just assumed.
- **Audit log** (`audit_logs`) recording security- and business-relevant
  actions (org created/suspended, user deactivated, role deleted, password
  changed, login) with actor, target, and metadata — a forensic trail, and
  the basis for the "Audit Timeline" bonus feature.
- **helmet** for standard security headers, **bcryptjs** for password
  hashing, parameterized queries everywhere (no string-built SQL), and
  tenant/team/role ids are always re-verified server-side against the
  caller's own organization before being trusted — never taken on faith
  from the client.
- Self-service password change for both platform admins and org users, plus
  an admin-initiated reset path for when someone's locked out and can't
  reach self-service: a platform admin can reset an organization admin's
  password, and an org admin can reset any of their users' — both generate
  a fresh temp password, invalidate the old one, re-flag
  `must_change_password`, and kill that person's active sessions immediately.

## Built for load

- **Pagination** on every list endpoint that can grow without bound
  (organizations, users, leads, notifications), with a server-enforced max
  page size so a client can't request an unbounded result set.
- **Indexes matched to actual query patterns** — composite indexes on
  `(organization_id, assigned_user_id)`, `(organization_id, status)`,
  `(user_id, is_read, created_at)`, etc. rather than indexing columns in
  isolation, since real queries filter on combinations of these.
- **Connection pool tuning**: configurable pool size per process
  (`DB_POOL_MAX`) and a query-level `statement_timeout` so one slow query
  can't pin a connection indefinitely and starve the rest of the pool under
  load. Pool-pressure is logged so "requests are slow" can be diagnosed as
  either a saturated pool or Postgres itself.
- **Stateless horizontal scaling**: JWT access tokens carry everything a
  request needs (organization id, admin flag, role scope), so any API
  instance can serve any request — the only shared state across instances
  is the rate limiter and refresh-token table, both already designed for
  that (Redis-backed limiter, DB-backed tokens).
- **compression** on responses, and N+1 queries avoided throughout via
  joins/aggregates rather than per-row follow-up queries — including
  Module 4's leaderboards, where leads and activities are joined in a
  single query per leaderboard rather than queried per user, with
  `COUNT(DISTINCT ...)` keeping totals correct despite the join's
  cartesian-product shape.
- **In-process event bus** (Module 5's only dependency on Module 3) is
  appropriately scoped to a single instance — see "what to know before
  scaling further" below.

## Architecture notes

**Backend** is a modular monolith organized by domain (`src/modules/<domain>`),
each with its own `routes → controller → service` layers. Module 1 mounts
under `/api/platform`, Module 2 under `/api/org`, Module 3 under
`/api/sales`, Module 4 under `/api/dashboard`, Module 5 under
`/api/notifications` — each one mounted independently, none of them aware
of each other's internals.

**Migrations**: versioned SQL files in `backend/src/db/migrations/`, tracked
in a `schema_migrations` table so re-running `npm run migrate` is always
safe. Each migration only ever adds to what came before — `002` evolves
`001`'s schema (replacing a fixed role enum with a real per-organization
`roles` table), `003` adds security infrastructure, `004` adds Sales
Management's tables and extends `roles` with `data_scope`, `005` adds
Notifications' table, `006` adds the forced-password-change flag. This was
verified by applying migrations against a database seeded under an older
schema and confirming the backfills ran correctly, not just tested against
a fresh database.

**Multi-tenancy strategy**: shared database, shared schema, every
tenant-owned table carries an `organization_id` foreign key. Every Module
2–5 query is scoped by the `organization_id` (and, for leads and
dashboards, the caller's `data_scope`) taken from the authenticated user's
JWT — never from a client-supplied parameter. This was verified directly: a
second organization sees zero of the first organization's teams, leads, or
notifications, and attempting to assign a lead using another org's
team/user id is rejected.

**Auth**: platform admins and org users are different principals with
different JWT `type` claims and separate frontend token storage, so a token
issued for one can never be replayed against the other's routes. Within
Modules 2–5, `requireOrgUser` (any logged-in tenant user) and
`requireOrgAdmin` (admin-only, stacked on top) are separate middleware —
Modules 3/4/5's regular sales users need the former without inheriting
admin-only access to Module 2's team/role/user management.

**Frontend** mirrors the backend's separation: `features/platform` and
`features/org` are self-contained (own auth context, own API clients with
their own token storage keys, own layout shell, own pages), sharing only the
generic UI primitives in `components/ui/`. The org console's navigation and
routes are role-aware — Dashboard and Leads are open to every org user,
Teams/Roles/Users stays admin-only, matching the backend's actual access
control rather than just hiding buttons. Module 4 and Module 5's API
clients point at their own base URLs but deliberately share Module 2's
token storage and refresh endpoint, since they're all the same logged-in
session.

## What to know before scaling further

Being upfront about where the documented "swap path" hasn't been taken yet:

- **The event bus is in-process** (`backend/src/events/eventBus.js`). It
  works correctly as built and is covered by integration tests, but a
  `lead.won` event published on one API instance is invisible to a
  Notifications subscriber running on a different instance. Fine for a
  single instance; the comment in that file documents the swap to a real
  broker (BullMQ+Redis, RabbitMQ) for anything beyond that, and the
  publish/subscribe call sites wouldn't need to change.
- **Notifications are delivered by polling** (the topbar bell checks every
  30s), not push. Real-time delivery (Socket.io/SSE) is the natural next
  layer once polling's latency actually matters.
- **The forced-password-change flow is a client-side redirect gate**, not a
  server-side block on other endpoints — a still-valid access token issued
  before the flag was set keeps working until it expires (≤15 minutes)
  even if the holder hasn't changed their password yet.

## API documentation

Every endpoint, request/response shape, auth flow, and error format is
documented in three forms, all kept in sync with each other and with the
actual route/controller/service code:

| File | Format | Use it for |
|---|---|---|
| **`API.md`** | Narrative Markdown | Reading start-to-end: auth lifecycle, multi-tenancy model, every endpoint with examples |
| **`openapi.yaml`** | OpenAPI 3.0.3 | Importing into Swagger UI / Redoc for interactive docs, or generating a client SDK |
| **`postman_collection.json`** | Postman Collection v2.1 | Importing into Postman and actually calling the API — login requests auto-save tokens into collection variables, so most of the collection runs end-to-end after just running "Platform Login" → "Create Organization" → "Org Login" |

Both `openapi.yaml` and `postman_collection.json` were validated against
real tooling (`@apidevtools/swagger-parser` for the OpenAPI spec — full
`$ref` dereference, not just a syntax check; the official `postman-collection`
SDK for the Postman file — actually instantiated as a `Collection` and
walked, not just `JSON.parse`'d) rather than hand-written and assumed
correct. `backend/README.md` below still has a lighter quick-reference
table per module for a faster skim.

## Architecture documentation

**`ARCHITECTURE.md`** is the system-design layer above `API.md` and
`DATABASE.md` — not what each endpoint or table looks like, but *why*
the system is shaped the way it is: the component diagram, which modules
have a code dependency on which others (and which deliberately don't —
diagrammed explicitly, not just asserted), the authentication and
authorization mechanics end-to-end (with a sequence diagram for the
access/refresh token lifecycle and a combined flowchart for how
authorization and tenant isolation resolve in one pass over a request),
the event-driven notification design, and a scaling section that
separates what's actually built and verified from what's deliberately
deferred with a stated trigger for each. Five Mermaid diagrams, each
saved standalone too (`diagram-system-architecture.mermaid`,
`diagram-module-boundaries.mermaid`, `diagram-auth-sequence.mermaid`,
`diagram-authz-tenant-scoping.mermaid`, `diagram-notification-flow.mermaid`)
and each validated the same way as `DATABASE.md`'s — parsed with the real
`mermaid` library, not just visually checked.

## Database documentation

**`DATABASE.md`** is the full schema reference: every table and column
(pulled from a freshly-migrated database's own `\d+` output, not just read
off the migration files), every foreign key with its `CASCADE`/`SET NULL`
reasoning, every index with what query pattern it exists for, and four
entity-relationship diagrams (Mermaid — render natively on GitHub, or open
`full-er-diagram.mermaid` / `diagram-platform-tenancy.mermaid` /
`diagram-org-admin.mermaid` / `diagram-sales-management.mermaid` directly
in any Mermaid-aware viewer). Every diagram was parsed with the real
`mermaid` library to confirm it's valid syntax, not just eyeballed.

## Setup

See `backend/README.md` and `frontend/README.md` for what each half does in
detail. Quick path, run from the **repo root**:

1. Create a free Neon project and grab its connection string.
2. `cd backend && cp .env.example .env` and fill in `DATABASE_URL` and a
   `JWT_SECRET`. `cd ../frontend && cp .env.example .env` (defaults are fine
   for local dev). `cd ..` back to the root.
3. `npm install` — installs dependencies for both `backend` and `frontend`
   in one pass via npm workspaces.
4. `npm run migrate:seed` — applies every migration and seeds the module
   catalog + a default platform admin.
5. `npm run dev` — starts **both** the API (`:4000`) and the React app
   (`:5173`) together, with color-coded, prefixed logs for each.
6. Open the printed Vite URL. You'll land on a chooser between the two
   consoles:
   - **Platform Console**: sign in with `admin@hilite.os` / `ChangeMe123!`
     (change this before using anywhere but local dev), then create an
     organization — the response shows that org's admin temporary password.
   - **Organization Console**: sign in with the organization code, the
     admin email you entered, and that temporary password — you'll be asked
     to set a real password immediately. From there, create teams/roles
     (with a data-access level) and users, then sign in as any of them to
     see the Dashboard and Leads scoped to their role.

### Other root-level scripts

| Command | Does |
|---|---|
| `npm run dev` | Runs backend + frontend together |
| `npm run dev:backend` | Runs only the API |
| `npm run dev:frontend` | Runs only the React app |
| `npm run migrate` | Applies pending migrations only |
| `npm run migrate:seed` | Applies migrations + seed data |
| `npm run build:frontend` | Production build of the React app |
| `npm run lint:frontend` | Lints the React app |
| `npm run start:backend` | Runs the API without nodemon (production-style) |

Each workspace also keeps its own scripts (`npm run dev -w @hilite/backend`,
etc.) if you'd rather work inside one package at a time.

# HiLITE Sales OS — Backend

Express API for all five modules — Platform Administration, Organization
Administration, Sales Management, Dashboard & Analytics, and Notifications —
plus security and scalability infrastructure shared across all of them.

> This package is part of an npm workspaces monorepo. You can run every
> command below from inside `backend/` as shown, or equivalently from the
> repo root with `npm run <script> -w @hilite/backend` — see the root
> `README.md` for the unified `npm run dev` that starts both apps together.

## 1. Create a Neon database

1. Go to [neon.tech](https://neon.tech) and sign up (free tier is enough).
2. Create a new project — any name and region.
3. On the project dashboard, open **Connection Details** and copy the
   **pooled** connection string. It looks like:
   ```
   postgresql://neondb_owner:abc123@ep-something-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | The Neon connection string from step 1 |
| `JWT_SECRET` | Yes | Any long random string — see command below |
| `ACCESS_TOKEN_EXPIRES_IN` | No | Default `15m` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No | Default `30` |
| `REDIS_URL` | No | Set this once you run more than one API instance — backs rate limiting with a shared store instead of per-process memory |
| `DB_POOL_MAX` | No | Default `10` per process |
| `DB_STATEMENT_TIMEOUT_MS` | No | Default `10000` |
| `CORS_ORIGIN` | No | Must match your frontend's URL, default `http://localhost:5173` |

Generate a `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Install dependencies

```bash
npm install
```

## 4. Run migrations and seed data

```bash
npm run migrate:seed
```

Applies every file in `src/db/migrations/` in order (tracked in a
`schema_migrations` table, so it's safe to run again later), then seeds two
default modules (Sales ERP, Notifications) and one platform admin:
`admin@hilite.os` / `ChangeMe123!`.

## 5. Start the API

```bash
npm run dev      # auto-restarts on file changes (nodemon)
# or
npm start        # plain node
```

```bash
curl http://localhost:4000/health
```

## API reference — Module 1 (Platform Administration)

Prefixed with `/api/platform`. Everything but `/auth/login` and
`/auth/refresh` requires `Authorization: Bearer <accessToken>`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, refreshToken, admin }` |
| POST | `/auth/refresh` | `{ refreshToken }` → new `{ accessToken, refreshToken }` (rotated) |
| POST | `/auth/logout` | `{ refreshToken }` → revokes it |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` |
| GET | `/auth/me` | Current platform admin profile |
| GET | `/modules` | Master module catalog |
| POST | `/modules` | `{ key, name, description? }` — `key` is lowercase/numbers/underscores only, immutable once set |
| PATCH | `/modules/:id` | `{ name?, description? }` — `key` cannot be changed |
| GET | `/organizations` | `?search=&status=active\|suspended&page=&pageSize=` (paginated) |
| POST | `/organizations` | Create organization + its first admin user |
| GET | `/organizations/:id` | Organization detail, including per-module flags |
| POST | `/organizations/:id/reset-admin-password` | Generates a fresh temp password for the org's admin user, kills their active sessions — the recovery path when an org admin is locked out and can't use self-service change-password |
| PATCH | `/organizations/:id/status` | `{ "status": "active" \| "suspended" }` — suspending revokes every session in that org |
| PATCH | `/organizations/:id/modules` | `{ "modules": [{ "moduleId": 1, "enabled": false }] }` |

## API reference — Module 2 (Organization Administration)

Prefixed with `/api/org`. `/auth/login` is open; everything else requires
an org user's access token, and everything except `/auth/me` and
`/auth/change-password` additionally requires `isOrgAdmin: true`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | `{ organizationCode, email, password }` → `{ accessToken, refreshToken, user, organization }` |
| POST | `/auth/refresh` | Same shape as platform's |
| POST | `/auth/logout` | Same shape as platform's |
| POST | `/auth/change-password` | Same shape as platform's |
| GET | `/auth/me` | Current org user profile |
| GET / POST / PATCH / DELETE | `/teams`, `/teams/:id` | Team CRUD |
| GET / POST / PATCH / DELETE | `/roles`, `/roles/:id` | Role CRUD — `{ name, dataScope }` where `dataScope` is `own`/`team`/`organization`; default roles can be renamed/rescoped but not deleted; in-use roles can't be deleted until reassigned |
| GET | `/users` | `?search=&teamId=&roleId=&status=active\|inactive&page=&pageSize=` (paginated) |
| POST | `/users` | `{ name, email, teamId?, roleId? }` → includes a generated `tempPassword` |
| PATCH | `/users/:id/assignment` | `{ teamId, roleId }` |
| POST | `/users/:id/reset-password` | Generates a fresh temp password for that user, kills their active sessions — same recovery pattern as the platform-level org admin reset, one level down |
| PATCH | `/users/:id/status` | `{ isActive }` — deactivating revokes that user's session immediately; the org admin account can't be deactivated |
| GET | `/modules` | This org's modules with their enabled state. **Read-only** — there is no write route here; enabling a module for an org is exclusively a platform-admin action (see Module 1's `PATCH /organizations/:id/modules`) |

## API reference — Module 3 (Sales Management)

Prefixed with `/api/sales`. Open to **any** logged-in org user (not
admin-only) — visibility is enforced per-request based on the caller's
role's `data_scope`, not by route-level gating.

| Method | Path | Description |
|---|---|---|
| GET | `/leads` | `?search=&status=&project=&assignedUserId=&page=&pageSize=` — results are pre-filtered to what the caller's scope allows |
| POST | `/leads` | `{ name, mobileNumber, email?, source?, project?, assignedUserId? }` — defaults to assigning the lead to the caller |
| GET | `/leads/:id` | 403 if the caller's scope doesn't cover this lead |
| PATCH | `/leads/:id` | `{ name?, mobileNumber?, email?, source?, project? }` — edits the lead's core details. Same access check as viewing it (not the same as assignment); deliberately excludes `status`/`assignedUserId`, which have their own endpoints because they carry side effects (status history, domain events) a plain field edit shouldn't trigger |
| GET | `/leads/assignable-users` | Minimal `{ id, name, teamId }` list scoped to who the caller is allowed to assign leads to — deliberately not the same as Module 2's admin-only `/users` |
| PATCH | `/leads/:id/status` | `{ status }` — one of the seven pipeline stages; every transition is recorded in `lead_status_history` |
| PATCH | `/leads/:id/assign` | `{ assignedUserId }` (manual) or `{ strategy: "least_loaded" }` (bonus auto-assignment) |
| POST | `/leads/:id/activities` | `{ type, notes?, occurredAt? }` — `type` is one of `phone_call`/`meeting`/`site_visit`/`virtual_meeting` |
| GET | `/leads/:id/activities` | Paginated |

```bash
# Org user login, then create + view a scoped lead list
curl -X POST http://localhost:4000/api/org/auth/login \
  -H "Content-Type: application/json" \
  -d '{"organizationCode":"hilite-builders","email":"asha@hilitebuilders.com","password":"<temp_password>"}'

curl -X POST http://localhost:4000/api/sales/leads \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"John Buyer","mobileNumber":"9876543210","project":"Skyline Towers"}'
```

## API reference — Module 4 (Dashboard & Analytics)

Prefixed with `/api/dashboard`. Open to any logged-in org user — the
response shape (not the route) changes based on the caller's `data_scope`.

| Method | Path | Description |
|---|---|---|
| GET | `/summary` | Always includes `personal` (your lead counts by status, conversion rate, activity counts, recent leads/activity). `team`-scope callers additionally get `team.leaderboard`; `organization`-scope callers additionally get `organization` (org-wide totals, `topTeams`, `topExecutives`). |

```json
// organization-scope response shape
{
  "scope": "organization",
  "personal": { "total_leads": 2, "won_leads": 1, "conversion_rate": 50, "leadsByStatus": [...], "activities": {...}, "recentLeads": [...], "recentActivities": [...] },
  "organization": { "total_leads": 14, "won_leads": 5, "conversion_rate": 35.7, "totalActivities": 22, "topTeams": [...], "topExecutives": [...] }
}
```

## API reference — Module 5 (Notifications)

Prefixed with `/api/notifications`. Open to any logged-in org user, scoped
to their own notifications only — a notification id belonging to a
different user 404s rather than ever being readable.

| Method | Path | Description |
|---|---|---|
| GET | `/` | `?unreadOnly=true&page=&pageSize=` (paginated) |
| GET | `/unread-count` | `{ count }` |
| PATCH | `/:id/read` | Marks one as read; 404 if it doesn't belong to the caller |
| POST | `/mark-all-read` | Marks every unread notification for the caller as read |

Nothing in Module 3 calls into this module directly. `lead.assigned` and
`lead.won` events published on the shared event bus (see
`src/events/eventBus.js`) are the entire interface — `notification.events.js`
subscribes to both and is the only file that imports both a Sales concept
(a lead) and a Notifications concept (a notification row) in the same place.

## Security model

- **Access + refresh tokens**: access tokens are short-lived JWTs (15m,
  configurable) carrying `organizationId`/`isOrgAdmin`/`roleId`/`teamId`/
  `dataScope` so every request is self-contained — no DB round-trip needed
  just to know who's asking. Refresh tokens are opaque random values, only
  ever stored as a sha256 hash (`refresh_tokens` table), rotated on every
  use, and revocable — `POST /auth/logout`, deactivating a user, or
  suspending an organization all revoke sessions immediately rather than
  waiting for a token to expire on its own.
- **Rate limiting** (`src/middleware/rateLimit.js`): a generous global
  ceiling plus a much tighter limiter on login endpoints specifically.
  Backed by Redis when `REDIS_URL` is set (verified against a real Redis
  instance, including the per-limiter key-prefix requirement that surfaced
  during testing), falling back to in-memory for single-instance/local dev.
- **Audit log** (`src/utils/auditLog.js`, `audit_logs` table): fire-and-forget
  inserts on actions like `organization.suspended`, `user.deactivated`,
  `role.deleted`, `org_user.login` — never blocks or fails the request it's
  attached to.
- **Tenant isolation**: every Module 2/3 query filters by
  `req.orgUser.organizationId` from the verified JWT, and any client-supplied
  team/role/user id is independently re-checked as belonging to that same
  organization before it's trusted (`assertBelongsToOrg` / `assertCanAssignTo`).
- **Forced password change**: `users.must_change_password` is set `true`
  whenever a temp password is issued (org creation, user creation, either
  kind of admin-initiated reset) and cleared on a successful self-service
  change. Login and refresh both surface it on the `user` object; the
  frontend gates on it client-side. It is not currently enforced as a
  server-side block on other endpoints — a still-valid access token issued
  before the flag was set keeps working until it expires.

## Built for load

- `src/utils/pagination.js`: every list endpoint caps page size
  (`MAX_PAGE_SIZE`, default 100) so a client can't pull an unbounded result
  set.
- `src/config/db.js`: connection pool size (`DB_POOL_MAX`) and a
  `statement_timeout` are both configurable per-environment; pool-pressure
  (requests waiting for a connection) is logged in development so it's
  diagnosable before it becomes a production incident.
- Composite indexes in the Module 3 migration match the service layer's
  actual `WHERE` clauses (`(organization_id, assigned_user_id)`,
  `(organization_id, status)`) rather than indexing columns in isolation.
  Module 5's `(user_id, is_read, created_at)` index follows the same rule.
- Module 4's leaderboards join leads and activities in one query per
  leaderboard rather than querying per user — `COUNT(DISTINCT ...)` keeps
  totals correct despite the join producing a row per (lead × activity)
  combination for users with both.
- `helmet` + `compression` are applied globally in `app.js`.

## Project structure

```
backend/
├── server.js                    Entry point — also registers Module 5's event subscribers
├── scripts/migrate.js           Migration runner (tracked in schema_migrations)
└── src/
    ├── app.js                   Express app: security middleware, routing, error handling
    ├── routes.js                 Mounts Module 1 routes under /api/platform
    ├── orgRoutes.js               Mounts Module 2 routes under /api/org
    ├── salesRoutes.js             Mounts Module 3 routes under /api/sales
    ├── dashboardRoutes.js         Mounts Module 4 routes under /api/dashboard
    ├── notificationRoutes.js      Mounts Module 5 routes under /api/notifications
    ├── events/eventBus.js         Publish/subscribe domain events — Module 5's only link to Module 3
    ├── config/
    │   ├── env.js                 Validated env var access
    │   └── db.js                  pg Pool (Neon) + transaction helper + pool-pressure logging
    ├── constants/roles.js          Default role names, shared by org-seeding + migration
    ├── middleware/
    │   ├── auth.js                 JWT verification for platform admin routes
    │   ├── orgAuth.js              requireOrgUser / requireOrgAdmin for tenant routes
    │   ├── rateLimit.js            Login + global rate limiters, Redis-ready
    │   └── error.js                Central error handler + 404 handler
    ├── utils/                      ApiError, asyncHandler, jwt, password, apiResponse,
    │                                 pagination, refreshToken, auditLog
    ├── db/
    │   ├── migrations/
    │   │   ├── 001_init.sql         Module 1: organizations, modules, users
    │   │   ├── 002_organization_admin.sql  Module 2: teams, roles, users changes
    │   │   ├── 003_security_hardening.sql  refresh_tokens, audit_logs
    │   │   ├── 004_sales_management.sql    Module 3: leads, history, activities, roles.data_scope
    │   │   ├── 005_notifications.sql       Module 5: notifications table
    │   │   └── 006_must_change_password.sql  users.must_change_password flag
    │   └── seed.sql                 Default modules + platform admin
    └── modules/
        ├── platformAdmin/           Module 1: login/refresh/logout/change-password, profile
        ├── organizations/           Module 1: create/list/detail/status/modules/admin-password-reset
        ├── modulesCatalog/          Module 1: master module catalog — list/create/edit (admin-only)
        ├── orgAuth/                 Module 2: tenant user login/refresh/logout/change-password
        ├── teams/                   Module 2: team CRUD
        ├── roles/                   Module 2: role CRUD with data_scope + default/in-use protections
        ├── orgUsers/                Module 2: user creation, assignment, activation, password-reset
        ├── orgModules/              Module 2: read-only view of this org's enabled modules (no write route)
        ├── leads/                   Module 3: lead CRUD, status pipeline, assignment, activities
        ├── dashboard/               Module 4: role-aware aggregate metrics
        └── notifications/           Module 5: notification CRUD + the event-bus subscribers
```

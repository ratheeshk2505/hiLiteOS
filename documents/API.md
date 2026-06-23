# HiLite Sales OS — API Documentation

A multi-tenant Sales ERP API: Express + PostgreSQL, five modules, two
authentication principals. This document is the complete endpoint
reference. For setup/installation instead, see the root `README.md` and
`backend/README.md`.

**Base URL (local dev):** `http://localhost:4000`

| Prefix | Module | Who can call it |
|---|---|---|
| `/api/platform` | 1 — Platform Administration | Platform admins only |
| `/api/org` | 2 — Organization Administration | Org users (mostly admin-only — noted per route) |
| `/api/sales` | 3 — Sales Management | Any org user — visibility scoped by role |
| `/api/dashboard` | 4 — Dashboard & Analytics | Any org user — response shaped by role |
| `/api/notifications` | 5 — Notifications | Any org user — scoped to their own notifications |

`GET /health` is unauthenticated and outside all five prefixes — use it for
uptime checks.

---

## 1. Authentication

There are **two separate principal types**, each with their own JWT `type`
claim, their own token, and their own login endpoint. A token issued for
one is rejected (`403`) if used against the other's routes — they are
never interchangeable.

| | Platform admin | Org user |
|---|---|---|
| Logs in at | `POST /api/platform/auth/login` | `POST /api/org/auth/login` |
| Identified by | email + password | organization code + email + password |
| JWT `type` claim | `platform_admin` | `org_user` |
| Manages | Organizations (tenants) | Their own organization's data |

Org users need the **organization code** because email is only unique
*within* one organization, not globally — there's no subdomain routing in
this version, so the tenant has to be named explicitly at login.

### 1.1 Sending a request

Every protected route expects:

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### 1.2 Access tokens vs. refresh tokens

Two tokens come back from every login:

| | Access token | Refresh token |
|---|---|---|
| Format | JWT | Opaque random string |
| Lifetime | 15 minutes (`ACCESS_TOKEN_EXPIRES_IN`) | 30 days (`REFRESH_TOKEN_EXPIRES_IN_DAYS`) |
| Sent on | Every API request, as the Bearer token | Only to the `/refresh` endpoint |
| Revocable? | No — stateless JWT, valid until it expires | Yes — looked up server-side on every use |
| Stored server-side? | No | Yes, as a sha256 hash (the raw value is never stored) |

This split exists so a session can be ended immediately (logout, account
deactivation, an organization being suspended) without waiting out a
token's remaining lifetime — the access token will still *decode*
successfully for up to 15 minutes after revocation, but the matching
refresh token is dead, so no new access token can be minted once the old
one expires.

Refresh tokens **rotate** on every use: each `/refresh` call revokes the
token it was given and returns a brand new one. Reusing an
already-rotated token is rejected.

**Refresh request** (same shape for both principals, different endpoint):

```http
POST /api/platform/auth/refresh      (or /api/org/auth/refresh)
Content-Type: application/json

{ "refreshToken": "<the refresh token from login>" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "<new access token>",
    "refreshToken": "<new refresh token — the old one is now dead>",
    "admin": { "id": "...", "name": "...", "email": "..." }
  }
}
```
(Org users get `user` and no `organization` field on refresh — same `accessToken`/`refreshToken` pair either way.)

### 1.3 Logout

```http
POST /api/platform/auth/logout      (or /api/org/auth/logout)
Content-Type: application/json

{ "refreshToken": "<refresh token to revoke>" }
```
Revokes that one refresh token server-side. Always returns
`{ "success": true, "data": { "loggedOut": true } }` — even if the token
was already invalid, so logout never fails visibly client-side.

### 1.4 What's inside an org user's access token

Decoding an org user's JWT (you never need to do this manually — the
backend does it on every request) reveals:

```json
{
  "sub": "user-uuid",
  "organizationId": "org-uuid",
  "isOrgAdmin": false,
  "roleId": "role-uuid",
  "teamId": "team-uuid",
  "dataScope": "team",
  "type": "org_user",
  "iat": 1750000000,
  "exp": 1750000900
}
```

`dataScope` (`own` / `team` / `organization`) is what Modules 3 and 4 use
to decide how much of an organization's data a given request can see —
see §4 for exactly how. Because the access token is short-lived and gets
re-minted fresh from the database on every refresh, a role or team
reassignment takes effect within one access-token lifetime (≤15 minutes)
at most, not instantly — there's no server-side push to already-issued
tokens.

### 1.5 Forced password change

`user.mustChangePassword` (returned on login and on refresh) is `true`
whenever the password currently in use is a system-generated temp
password — issued at org/user creation, or by an admin-initiated reset
(§3.2, §4.4). It's cleared the moment `change-password` succeeds. This is
surfaced for the frontend to gate on; the API itself does **not** block
other endpoints while the flag is set — a still-valid access token keeps
working regardless.

### 1.6 Self-service password change

Identical shape for both principals:

```http
POST /api/platform/auth/change-password      (or /api/org/auth/change-password)
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "currentPassword": "...", "newPassword": "..." }
```
Requires the *current* password — if someone doesn't have it (a forgotten
temp password), see the admin-initiated reset endpoints instead (§3.2 platform-side, §4.4 org-side). New password must be ≥8 characters.

---

## 2. Conventions

### 2.1 Response envelope

Every response is JSON with a `success` boolean.

**Success:**
```json
{ "success": true, "data": { /* ... */ } }
```
List endpoints that paginate add a `meta` sibling:
```json
{ "success": true, "data": [ /* rows */ ], "meta": { "page": 1, "pageSize": 25, "total": 142, "totalPages": 6 } }
```

**Failure:**
```json
{ "success": false, "error": { "message": "Human-readable explanation", "details": null } }
```
`details` is an array of strings for multi-field validation failures
(e.g. creating a lead with both a missing name and an invalid email),
otherwise `null`.

### 2.2 Pagination

Any endpoint whose data can grow without bound takes `page` and
`pageSize` query params:

| Param | Default | Notes |
|---|---|---|
| `page` | `1` | 1-indexed |
| `pageSize` | `25` (`DEFAULT_PAGE_SIZE`) | Capped at `100` (`MAX_PAGE_SIZE`) — a client can't request an unbounded result set even by asking |

### 2.3 HTTP status codes

| Code | Meaning here |
|---|---|
| `200` | Success (read or update) |
| `201` | Resource created |
| `400` | Validation failed — check `error.details` |
| `401` | Missing/malformed `Authorization` header, or the token is invalid/expired |
| `403` | The token is valid but the wrong *type* for this route, or the caller lacks permission (not an org admin, lead outside their scope, etc.) |
| `404` | Resource doesn't exist *for this caller* — also returned for another tenant's data, deliberately indistinguishable from "doesn't exist at all" |
| `409` | Conflict — duplicate organization code, email, team/role name, or module key |
| `429` | Rate limited (§2.5) |
| `500` | Unexpected server error |

### 2.4 Multi-tenancy — what "404" actually means

Every Module 2–5 query filters by `organization_id` taken from the
caller's verified JWT, never from anything in the URL or body. If you
guess or scrape an id belonging to a different organization, you get a
plain `404` — not a `403` — because as far as that query is concerned,
the row doesn't exist for you. The API never confirms an id is valid in
*some* organization, just not yours.

### 2.5 Rate limiting

| Limiter | Window | Limit | Applies to |
|---|---|---|---|
| Global | 15 min | 600 requests / IP | Every route (abuse backstop, not a throttle on normal use) |
| Login | 15 min | 10 requests / IP | `POST /api/platform/auth/login`, `POST /api/org/auth/login` only |

Exceeding either returns `429` with `{ "success": false, "error": { "message": "Too many login attempts. Please try again in a few minutes." } }` for the login limiter, or the default `express-rate-limit` body for the global one. In production with more than one API instance, set `REDIS_URL` so the count is shared across instances instead of enforced per-process.

### 2.6 CORS

Configured for one origin (`CORS_ORIGIN`, your frontend's URL) with
credentials enabled. Requests from other origins are rejected by the
browser before they reach the API.

---

## 3. Module 1 — Platform Administration

`/api/platform` · platform-admin-only except where noted.

### 3.1 Auth — `/api/platform/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/login` | — | `{ email, password }` | Rate-limited (10/15min). Returns `{ accessToken, refreshToken, admin: { id, name, email } }` |
| POST | `/refresh` | — | `{ refreshToken }` | See §1.2 |
| POST | `/logout` | — | `{ refreshToken }` | See §1.3 |
| GET | `/me` | Bearer | — | Returns `{ id, name, email, created_at }` |
| POST | `/change-password` | Bearer | `{ currentPassword, newPassword }` | See §1.6 |

```bash
curl -X POST http://localhost:4000/api/platform/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hilite.os","password":"ChangeMe123!"}'
```

### 3.2 Organizations — `/api/platform/organizations`

All routes require a platform admin Bearer token.

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | `{ name, code, logoUrl?, description?, adminName, adminEmail, enabledModuleKeys? }` | Creates the org + its first admin user in one transaction. `code`: lowercase letters/numbers/hyphens only. `enabledModuleKeys` defaults to *all* current modules if omitted. Returns `201` |
| GET | `/` | — | Query: `search`, `status` (`active`\|`suspended`), `page`, `pageSize`. Paginated |
| GET | `/:id` | — | Detail, including every module's enabled flag for this org and its `primaryAdmin` |
| POST | `/:id/reset-admin-password` | — | Generates a new temp password for the org's admin, revokes their sessions, sets `must_change_password`. See §1.5 |
| PATCH | `/:id/status` | `{ "status": "active" \| "suspended" }` | Suspending revokes **every** session for every user in that org, immediately |
| PATCH | `/:id/modules` | `{ "modules": [{ "moduleId": 1, "enabled": true }, ...] }` | Upsert — works even for a module created after this org |

**Create organization — response:**
```json
{
  "success": true,
  "data": {
    "organization": { "id": "...", "name": "...", "code": "...", "logo_url": null, "description": null, "status": "active", "created_at": "..." },
    "adminUser": { "id": "...", "name": "...", "email": "...", "is_org_admin": true, "is_active": true, "created_at": "..." },
    "tempPassword": "Atlas-889-1bib"
  }
}
```
There's no email service wired up — `tempPassword` is shown exactly once,
right here, and is how you actually get into the org you just created.

```bash
curl -X POST http://localhost:4000/api/platform/organizations \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"HiLite Builders","code":"hilite-builders","adminName":"Asha Menon","adminEmail":"asha@hilitebuilders.com"}'
```

### 3.3 Module catalog — `/api/platform/modules`

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/` | — | Full catalog: `[{ id, key, name, description, created_at }, ...]` |
| POST | `/` | `{ key, name, description? }` | `key`: lowercase/numbers/underscores, immutable once set. `409` on a duplicate key. A new module needs no backfill — every per-org read already defaults a missing enablement row to `false` |
| PATCH | `/:id` | `{ name?, description? }` | `key` cannot be changed here |

---

## 4. Module 2 — Organization Administration

`/api/org` · tenant-scoped via the caller's JWT. `/auth/*` is the only
subset open to non-admins (and `/auth/login` to no one yet).

### 4.1 Auth — `/api/org/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/login` | — | `{ organizationCode, email, password }` | Rate-limited. Returns `{ accessToken, refreshToken, user: { id, name, email, isOrgAdmin, mustChangePassword }, organization: { id, name } }`. `403` if the org is suspended |
| POST | `/refresh` | — | `{ refreshToken }` | Re-reads the user fresh from the DB — see §1.4 |
| POST | `/logout` | — | `{ refreshToken }` | |
| GET | `/me` | Bearer (any org user) | — | `{ id, name, email, is_org_admin, is_active, created_at }` |
| POST | `/change-password` | Bearer (any org user) | `{ currentPassword, newPassword }` | Clears `must_change_password` |

```bash
curl -X POST http://localhost:4000/api/org/auth/login \
  -H "Content-Type: application/json" \
  -d '{"organizationCode":"hilite-builders","email":"asha@hilitebuilders.com","password":"<temp_password>"}'
```

### 4.2 Teams — `/api/org/teams` (admin-only)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | `{ name, description? }` | `409` on a duplicate name within the org |
| GET | `/` | — | `[{ id, name, description, member_count, created_at, updated_at }, ...]` — not paginated (orgs don't have enough teams to need it) |
| PATCH | `/:id` | `{ name, description? }` | |
| DELETE | `/:id` | — | Members become unassigned (`team_id = NULL`), not deleted |

### 4.3 Roles — `/api/org/roles` (admin-only)

Every org is seeded with four default roles (Executive → `own`, Team Lead
→ `team`, Sales Manager → `team`, Director → `organization`). `data_scope`
is what Modules 3/4 actually key permissions off — not the role's name.

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | `{ name, dataScope? }` | `dataScope` one of `own`/`team`/`organization`, defaults to `own` if omitted |
| GET | `/` | — | `[{ id, name, is_default, data_scope, user_count, created_at, updated_at }, ...]` |
| PATCH | `/:id` | `{ name, dataScope? }` | Works on default roles too — rename and/or rescope freely |
| DELETE | `/:id` | — | `400` if it's a default role; `409` if any user still holds it |

### 4.4 Users — `/api/org/users` (admin-only)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | `{ name, email, teamId?, roleId? }` | `teamId`/`roleId` independently re-verified as belonging to this org. Returns the user **plus** a one-time `tempPassword`, `must_change_password: true` |
| GET | `/` | — | Query: `search`, `teamId`, `roleId`, `status` (`active`\|`inactive`), `page`, `pageSize`. Each row includes `team_name`, `role_name` |
| GET | `/:id` | — | Single user detail |
| PATCH | `/:id/assignment` | `{ teamId, roleId }` | Reassign team/role — same org-ownership re-check as creation |
| POST | `/:id/reset-password` | — | New temp password, kills their sessions, re-flags `must_change_password`. Same recovery pattern as §3.2's org-admin reset, one level down |
| PATCH | `/:id/status` | `{ "isActive": boolean }` | Deactivating revokes that user's sessions immediately. The org's own admin account can't be deactivated through this route |

```bash
curl -X POST http://localhost:4000/api/org/users \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Ravi Kumar","email":"ravi@hilitebuilders.com","teamId":"<team-uuid>","roleId":"<role-uuid>"}'
```

### 4.5 Modules — `/api/org/modules` (admin-only, **read-only**)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | `[{ module_id, key, name, description, enabled }, ...]` for this org only |

No write route exists here at all — enabling/disabling a module for an
organization is exclusively a platform-admin action (§3.2). This isn't a
hidden permission check, there's simply no endpoint to enable one from
this side.

---

## 5. Module 3 — Sales Management

`/api/sales/leads` · **open to any org user**, not admin-gated. What a
given request can see or do is enforced inside the service layer by the
caller's `dataScope`:

| `dataScope` | Sees / can act on |
|---|---|
| `own` (default) | Only leads assigned to themselves |
| `team` | Every lead assigned to anyone on their team |
| `organization` (or `isOrgAdmin`) | Every lead in the organization |

This applies uniformly to listing, viewing, editing, and assigning leads
— a `team`-scoped Team Lead can reassign within their team but not to
someone outside it; an `own`-scoped Executive can only ever assign to
themselves.

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/` | `{ name, mobileNumber, email?, source?, project?, assignedUserId? }` | Defaults to self-assigning if `assignedUserId` omitted. Publishes `lead.created` and `lead.assigned` events. `201` |
| GET | `/` | — | Query: `search`, `status`, `project`, `assignedUserId`, `page`, `pageSize`. Pre-filtered by scope before any of those filters apply |
| GET | `/assignable-users` | — | `[{ id, name, team_id }, ...]` — candidates the caller could assign a lead to, scoped the same way. Deliberately narrower than Module 2's admin-only `/users` |
| GET | `/:id` | — | `403` if outside the caller's scope |
| PATCH | `/:id` | `{ name?, mobileNumber?, email?, source?, project? }` | Edits core details only. Same access check as viewing — **not** the assignment check. Status/assignment excluded on purpose (see next two rows) |
| PATCH | `/:id/status` | `{ "status": "..." }` | One of the 7 pipeline stages (§8.1). Every transition recorded in `lead_status_history`. Publishes `lead.won` when set to `won` |
| PATCH | `/:id/assign` | `{ assignedUserId }` **or** `{ "strategy": "least_loaded" }` | Manual or bonus auto-assignment (picks whichever eligible active user has the fewest open leads, within the caller's scope). Publishes `lead.assigned` |
| POST | `/:id/activities` | `{ type, notes?, occurredAt? }` | `type` is one of 4 values (§8.1). `201` |
| GET | `/:id/activities` | — | Paginated, newest first |

**Lead object shape** (returned by create/get/update/status/assign):
```json
{
  "id": "...", "name": "John Buyer", "mobile_number": "9876543210", "email": null,
  "source": "Website", "project": "Skyline Towers", "status": "contacted",
  "created_at": "...", "updated_at": "...",
  "assigned_user_id": "...", "assigned_user_name": "Exec One", "assigned_user_team_id": "...",
  "created_by_id": "...", "created_by_name": "Exec One"
}
```

```bash
curl -X POST http://localhost:4000/api/sales/leads \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"John Buyer","mobileNumber":"9876543210","project":"Skyline Towers"}'

curl -X PATCH http://localhost:4000/api/sales/leads/<id>/status \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"status":"won"}'
```

---

## 6. Module 4 — Dashboard & Analytics

`/api/dashboard` · open to any org user. One endpoint; the response
*shape* — not the route — changes with the caller's `dataScope`.

| Method | Path | Notes |
|---|---|---|
| GET | `/summary` | Always includes `personal`. Additionally includes `team` or `organization` depending on scope (table below) |

| `dataScope` | `scope` in response | Extra field |
|---|---|---|
| `own` | `"own"` | — |
| `team` | `"team"` | `team.leaderboard` — every teammate, ranked by leads won |
| `organization` / admin | `"organization"` | `organization` — org-wide totals + `topTeams` + `topExecutives` |

**`personal` shape** (always present):
```json
{
  "total_leads": 12, "won_leads": 4, "conversion_rate": 33.3,
  "leadsByStatus": [{ "status": "new", "count": 3 }, ...],
  "activities": { "total": 28, "last_30_days": 9 },
  "recentLeads": [{ "id": "...", "name": "...", "status": "...", "created_at": "..." }, ...],
  "recentActivities": [{ "id": "...", "type": "...", "notes": "...", "occurred_at": "...", "lead_name": "...", "lead_id": "..." }, ...]
}
```

**`organization` shape** (org-scope/admin only):
```json
{
  "total_leads": 140, "won_leads": 38, "conversion_rate": 27.1, "totalActivities": 410,
  "leadsByStatus": [...],
  "topTeams": [{ "id": "...", "name": "...", "total_leads": 50, "won_leads": 18, "conversion_rate": 36 }, ...],
  "topExecutives": [{ "id": "...", "name": "...", "team_name": "...", "total_leads": 22, "won_leads": 9, "conversion_rate": 40.9 }, ...]
}
```
`team.leaderboard` rows have the same shape as `topExecutives` rows
(`id, name, total_leads, won_leads, conversion_rate, activity_count`).

Every number here is computed with SQL aggregates (`COUNT`, `COUNT ...
FILTER`, `COUNT(DISTINCT ...)` where a join could otherwise double-count)
— never by loading every lead into the app and counting in JS.

```bash
curl http://localhost:4000/api/dashboard/summary -H "Authorization: Bearer <accessToken>"
```

---

## 7. Module 5 — Notifications

`/api/notifications` · open to any org user, strictly scoped to their own
notifications — a notification id belonging to someone else 404s.

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/` | — | Query: `unreadOnly` (`true`/omit), `page`, `pageSize`. Paginated, newest first |
| GET | `/unread-count` | — | `{ "count": 3 }` |
| PATCH | `/:id/read` | — | Marks one as read. `404` if it doesn't belong to the caller |
| POST | `/mark-all-read` | — | Marks every unread notification for the caller as read |

**Notification object:**
```json
{ "id": "...", "type": "lead_assigned", "title": "New lead assigned to you", "body": "John Buyer was assigned to you by Asha Menon.", "lead_id": "...", "is_read": false, "created_at": "..." }
```

Notifications are created entirely by two event-bus subscribers reacting
to events Module 3 publishes — there is no direct call from Sales into
Notifications anywhere in the codebase:

| Event published by Module 3 | Notifies | Skips when |
|---|---|---|
| `lead.assigned` | The newly assigned user | They assigned the lead to themselves |
| `lead.won` | Every org admin | The admin being notified is the one who closed it |

There's no real-time push yet — the frontend polls `/unread-count` every
30 seconds. The event bus itself is in-process (one Node instance); see
`backend/src/events/eventBus.js` for the documented swap path to a real
broker if this ever runs as more than one instance.

---

## 8. Appendix

### 8.1 Enums

| Lead `status` (7) | Activity `type` (4) | Role `dataScope` (3) | Notification `type` (2) | Org/User `status` |
|---|---|---|---|---|
| `new` | `phone_call` | `own` | `lead_assigned` | `active` |
| `contacted` | `meeting` | `team` | `lead_won` | `suspended` (orgs) |
| `visit_scheduled` | `site_visit` | `organization` | | `isActive: true/false` (users) |
| `site_visit_completed` | `virtual_meeting` | | | |
| `negotiation` | | | | |
| `won` | | | | |
| `lost` | | | | |

### 8.2 Health check

```bash
curl http://localhost:4000/health
# {"success":true,"data":{"status":"ok","time":"2026-06-22T10:00:00.000Z"}}
```
Unauthenticated, not rate-limited beyond the global backstop, outside all
five module prefixes.

### 8.3 End-to-end example: from nothing to a logged-in sales rep

```bash
# 1. Platform admin logs in
curl -X POST http://localhost:4000/api/platform/auth/login \
  -H "Content-Type: application/json" -d '{"email":"admin@hilite.os","password":"ChangeMe123!"}'
# -> save .data.accessToken as PLATFORM_TOKEN

# 2. Create an organization
curl -X POST http://localhost:4000/api/platform/organizations \
  -H "Authorization: Bearer $PLATFORM_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Acme Realty","code":"acme-realty","adminName":"Priya Shah","adminEmail":"priya@acme.com"}'
# -> save .data.tempPassword as ADMIN_TEMP_PW

# 3. Org admin logs in, must change password first
curl -X POST http://localhost:4000/api/org/auth/login \
  -H "Content-Type: application/json" \
  -d '{"organizationCode":"acme-realty","email":"priya@acme.com","password":"'"$ADMIN_TEMP_PW"'"}'
# -> .data.user.mustChangePassword is true; save .data.accessToken as ADMIN_TOKEN

curl -X POST http://localhost:4000/api/org/auth/change-password \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"currentPassword":"'"$ADMIN_TEMP_PW"'","newPassword":"a-real-password-123"}'

# 4. Admin creates a team and looks up the default Executive role
curl -X POST http://localhost:4000/api/org/teams \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"name":"North Zone"}'
curl http://localhost:4000/api/org/roles -H "Authorization: Bearer $ADMIN_TOKEN"
# -> save the team id and the "Executive" role's id

# 5. Admin creates a sales rep
curl -X POST http://localhost:4000/api/org/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Ravi Kumar","email":"ravi@acme.com","teamId":"<team-id>","roleId":"<role-id>"}'
# -> save .data.tempPassword as REP_TEMP_PW

# 6. The rep logs in, changes their password, and creates a lead
curl -X POST http://localhost:4000/api/org/auth/login \
  -H "Content-Type: application/json" \
  -d '{"organizationCode":"acme-realty","email":"ravi@acme.com","password":"'"$REP_TEMP_PW"'"}'
# -> save .data.accessToken as REP_TOKEN, then change-password as in step 3

curl -X POST http://localhost:4000/api/sales/leads \
  -H "Authorization: Bearer $REP_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"John Buyer","mobileNumber":"9876543210","project":"Lakeview Apartments"}'

# 7. The rep checks their own dashboard
curl http://localhost:4000/api/dashboard/summary -H "Authorization: Bearer $REP_TOKEN"
```

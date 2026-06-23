# HiLITE Sales OS — Frontend

React (Vite) app hosting two consoles: the Platform Console (Module 1) and
the Organization Console (Modules 2–5), each with its own login.

> This package is part of an npm workspaces monorepo. You can run every
> command below from inside `frontend/` as shown, or equivalently from the
> repo root with `npm run <script> -w @hilite/frontend` — see the root
> `README.md` for the unified `npm run dev` that starts both apps together.

## Setup

```bash
cp .env.example .env
```

Defaults point at the backend's five route prefixes on `:4000`. Change them
if your API runs elsewhere.

```bash
npm install
npm run dev
```

Open the printed URL (typically `http://localhost:5173`) — you'll land on a
chooser between the two consoles.

- **Platform Console**: `admin@hilite.os` / `ChangeMe123!`.
- **Organization Console**: the organization code, admin email, and
  temporary password from when that organization was created in the
  Platform Console — you'll be asked to set a real password immediately.
  Once in, create a team and a role (pick a data-access level —
  own/team/organization), create a user under that role, and sign in as
  them to see the Dashboard and Leads scoped to their role in practice.

## Routes

| Route | Page | Access |
|---|---|---|
| `/` | `Landing.jsx` | chooser between consoles |
| `/platform/login` | Platform `Login.jsx` | — |
| `/platform/organizations`, `/new`, `/:id` | Platform Module 1 pages | Platform admin |
| `/platform/modules` | Platform `Modules.jsx` | Platform admin — create/edit the master module catalog |
| `/org/login` | Org `Login.jsx` | — |
| `/org/change-password` | `ChangePasswordForced.jsx` | Any org user with a temp password — see below |
| `/org/dashboard` | Module 4 `Dashboard.jsx` | **Any org user** — shape scoped server-side by role |
| `/org/teams`, `/org/roles`, `/org/users` | Module 2 pages | **Org admin only** — non-admins are redirected to `/org/dashboard` |
| `/org/modules` | Org `Modules.jsx` | **Org admin only**, read-only — view-only by design, no edit controls anywhere on this page |
| `/org/leads`, `/org/leads/:id` | Module 3 pages | **Any org user** — visibility scoped server-side by role |

Module 5 (Notifications) has no dedicated route — it's the bell icon in
every org console page's topbar.

## Structure

```
src/
├── api/
│   └── createApiClient.js     Factory: axios instance + token header + silent
│                                refresh-on-401 (shared in-flight refresh promise),
│                                parameterized per console (base URL, token keys, login path)
├── components/ui/             Shared primitives: Button, Toggle, StatusBadge, Pill,
│                                ConfirmDialog, Modal, Spinner, Pagination
├── features/
│   ├── platform/                Module 1 — self-contained
│   │   ├── api/                  apiClient instance + platformApi.js
│   │   ├── context/              PlatformAuthContext (usePlatformAuth)
│   │   ├── components/           Sidebar, Topbar, AppShell, ProtectedRoute
│   │   └── pages/                 Login, OrganizationsList, CreateOrganization, OrganizationDetail,
│   │                                Modules (create/edit the master module catalog)
│   └── org/                     Modules 2–5 — self-contained
│       ├── api/                   apiClient + orgApi.js (Module 2, includes read-only modules),
│       │                           salesApiClient + salesApi.js (Module 3), dashboardApiClient +
│       │                           dashboardApi.js (Module 4), notificationApiClient +
│       │                           notificationApi.js (Module 5) — each a separate base URL,
│       │                           all sharing one session (see Auth model below)
│       ├── context/               OrgAuthContext (useOrgAuth)
│       ├── constants/             leadStatus.js — pipeline stages, activity types
│       ├── components/            Sidebar (role-aware nav), Topbar (+ NotificationBell),
│       │                           AppShell, ProtectedRoute (also gates forced password
│       │                           change), AdminProtectedRoute
│       └── pages/                  Login, ChangePasswordForced, Teams, Roles, Users, Modules
│                                     (read-only) (Module 2), Leads, LeadDetail (Module 3),
│                                     Dashboard (Module 4)
├── pages/                      Shared, console-agnostic: Landing, NotFound
├── App.jsx                     Route definitions for both consoles
└── index.css                   Design tokens (Tailwind v4 @theme) + global styles
```

Platform and org features never import from each other — they only share
`components/ui/` and the `createApiClient` factory. Within the org console,
Modules 3/4/5's API clients each point at a different base URL
(`/api/sales`, `/api/dashboard`, `/api/notifications`) but deliberately
share Module 2's token storage keys and refresh endpoint, since they're all
the same logged-in session.

## Auth model

Both consoles store a short-lived access token plus a refresh token.
`createApiClient`'s response interceptor catches a 401, transparently
exchanges the refresh token for a new access token (sharing one in-flight
refresh promise if several requests 401 at once), retries the original
request, and only redirects to that console's login page if the refresh
itself fails. Logging out calls the backend to revoke the refresh token
server-side before clearing local state.

**Forced password change**: the login response includes
`user.mustChangePassword`. `Login.jsx` checks it directly to route either to
`/org/dashboard` or `/org/change-password` right after login, and
`ProtectedRoute` re-checks it on every other org route (redirecting back to
`/org/change-password` if still set) so it can't be bypassed by navigating
directly to a URL mid-session. `ChangePasswordForced.jsx` just calls the
same `change-password` endpoint self-service uses — the only difference is
that the gate gets removed afterward via `updateUser()` on the auth context.

## Role-aware UI

The org console's sidebar and routing reflect the backend's actual access
control: `Sidebar.jsx` only renders Teams/Roles/Users for `isOrgAdmin`
users, and `AdminProtectedRoute` redirects a non-admin away from those URLs
even if typed directly — both are a UX courtesy, since the real enforcement
is `requireOrgAdmin` on the API itself. Dashboard and Leads are shown to
everyone; what each person sees inside either one is filtered server-side
by their role's `data_scope`, not by anything the frontend decides.

## Notifications

`NotificationBell.jsx` (in every org console page's `Topbar`) polls
`/api/notifications/unread-count` every 30 seconds and shows a badge.
Clicking it fetches the 10 most recent notifications into a dropdown;
clicking one marks it read and navigates to the lead it's about. This is
polling, not push — a documented future upgrade (Socket.io/SSE) once
real-time delivery is worth the added infrastructure; see the root
`README.md`'s "what to know before scaling further" section.

## Design system

Defined as CSS variables in `src/index.css` via Tailwind v4's `@theme`:
ink (near-black navy) and paper (warm neutral) as the base surfaces, with a
single gold accent reserved for the "highlight" motif (active nav state, the
wordmark, key callouts) — used sparingly rather than as a base color.
Typography pairs a Fraunces display face for headings with Inter for body
and UI text, and IBM Plex Mono for codes/identifiers. Both consoles share
this system so they read as one product, not two bolted-together apps.

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

# 📚 Poth Gulla — Smart Library Management System

A complete React front-end for **Poth Gulla**, a smart campus library management system. It manages **books, devices, and study rooms** through a single transparent, points-based fairness system, and ships with four role-specific experiences plus a student mobile app.

> **Status:** This is a fully working front-end built against in-memory **mock data**. No backend is wired up yet — every list, stat and action reads from `src/data/mockData.js`. The [Connecting a Backend](#-connecting-a-backend) section below is a complete guide for replacing the mock layer with a real API.

---

## ✨ Features

- **4 roles**, each with its own sidebar, dashboard and screens:
  - **Student** — browse catalogue, book resources, join waitlists, track points & tier, study-room booking, recommendations, profile.
  - **Lecturer** — same as student with faculty privileges (higher tiers, no room booking flow).
  - **Library Staff** — checkout/return scanning, waitlist review, device approvals, overdue management, resource management.
  - **Admin** — system dashboard, user management, audit log, configuration (tiers/penalties/toggles), copy-level resource management.
- **Student mobile app** — a phone-framed, student-only experience with splash → onboarding → login, home, catalogue, QR scan (checkout/return), bookings and profile.
- **Booking engine** — auto-routes to *instant booking*, *approval request* (Tier 4+), or *waitlist* (unavailable) based on resource state.
- **QR check-in/out** — deterministic QR rendering for the scan flows.
- **Points & tiers** — 5-tier fairness ladder with point events and history.
- Pixel-matched to the original design: green theme (`#16a34a`), Public Sans / Spectral / IBM Plex Mono fonts, custom animations.

---

## 🚀 Getting Started

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# production build
npm run build

# preview the production build
npm run preview
```

### Trying the roles

On the login screen you can pick a **role** (Student / Lecturer / Staff / Admin) and a **view** (Desktop / Mobile). The mobile view is student-only. No real credentials are required — login is simulated.

---

## 🗂️ Project Structure

```
poth-gulla/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                 # React entry point
    ├── index.css                # Global styles, fonts, keyframe animations
    ├── App.jsx                  # Root component + AppContext (all global state)
    │
    ├── data/
    │   └── mockData.js          # ⭐ ALL mock data + generateQRCells() — the swap point for a backend
    │
    ├── components/              # Shared shell
    │   ├── Login.jsx            # Desktop login + role/view picker
    │   ├── DesktopApp.jsx       # Sidebar + Header + MainContent layout
    │   ├── Sidebar.jsx          # Role-aware navigation
    │   ├── Header.jsx           # Top bar, search, notifications
    │   ├── MainContent.jsx      # Page router (maps `page` → screen)
    │   ├── QRCode.jsx           # QR grid renderer
    │   └── Toast.jsx            # Transient toast notifications
    │
    ├── screens/
    │   ├── student/             # Dashboard, Catalogue, ResourceDetail, Rooms,
    │   │                        # MyBookings, Waitlist, Recommendations, Points, Profile
    │   ├── staff/               # Dashboard, Checkout, WaitlistReview, Approvals,
    │   │                        # Overdue, ManageResources
    │   └── admin/               # Dashboard, Users, AuditLog, Config, Resources
    │
    ├── modals/
    │   ├── BookingModal.jsx     # Booking / approval / waitlist flow
    │   ├── StaffModal.jsx       # Add resource
    │   └── AdminModal.jsx       # Add / edit user
    │
    └── mobile/
        ├── MobileAuth.jsx       # Splash / onboarding / login (phone frame)
        └── MobileApp.jsx        # Student mobile experience + bottom nav
```

### State management

The app uses **React Context** (no Redux). All global state lives in `src/App.jsx` and is exposed through `AppContext`:

```jsx
import { useApp } from '../App';

function MyScreen() {
  const { currentRole, page, setPage, showToast, openBooking } = useApp();
  // ...
}
```

Routing is **state-based**: `page` is a string, and `MainContent.jsx` maps it to the right screen. There is no React Router — navigation is `setPage('catalogue')`, etc.

---

## 🔌 Connecting a Backend

The entire app reads from one file: **`src/data/mockData.js`**. To go live, you replace those static exports with data fetched from your API. Below is a complete, framework-agnostic integration guide.

### 1. Recommended architecture

```
React app  ──HTTP/JSON──>  API server  ──>  Database
                                   └──>  Auth (JWT/session)
```

Introduce an **API client layer** and a set of **hooks** that components call instead of importing `mockData.js` directly. This keeps the UI untouched and isolates all networking.

```
src/
├── api/
│   ├── client.js        # fetch wrapper (base URL, auth header, error handling)
│   ├── auth.js          # login / logout / current user
│   ├── resources.js     # catalogue, detail, availability
│   ├── bookings.js      # create booking / approval / waitlist
│   ├── users.js         # admin user management
│   ├── points.js        # points & tier
│   └── config.js        # admin tiers / penalties / toggles
└── hooks/
    ├── useResources.js
    ├── useBookings.js
    └── ...
```

### 2. The API client

Create `src/api/client.js`:

```js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get:  (p, token)        => request(p, { token }),
  post: (p, body, token)  => request(p, { method: 'POST',  body, token }),
  put:  (p, body, token)  => request(p, { method: 'PUT',   body, token }),
  del:  (p, token)        => request(p, { method: 'DELETE', token }),
};
```

Add a `.env` file at the project root (Vite only exposes vars prefixed with `VITE_`):

```
VITE_API_URL=http://localhost:4000/api
```

### 3. Swapping mock data for live data

**Before** (current — static import):

```jsx
import { resources } from '../../data/mockData';

export default function Catalogue() {
  const list = resources;          // static
  // ...
}
```

**After** (live — fetched in a hook):

```jsx
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function Catalogue() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/resources')
       .then(setList)
       .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading…</div>;
  // ...rest of the UI is unchanged
}
```

> 💡 **Keep the same field names.** If your API returns the same shapes documented below, the screens render with zero changes. The fastest migration path is to make your backend serialize to these shapes, or add a small mapper in each `api/*.js` module.

### 4. Authentication

`App.jsx` currently fakes login with `loggedIn` / `mobileLoggedIn` booleans and a `currentRole` string. To make it real:

1. On login submit, call `POST /auth/login` and store the returned `{ token, user }`.
2. Persist the token (e.g. `localStorage`) and pass it to `api.*` calls.
3. Derive `currentRole` from `user.role` instead of the role picker.
4. Add a guard that redirects to login on `401` responses.

```js
// src/api/auth.js
import { api } from './client';

export async function login(email, password) {
  const { token, user } = await api.post('/auth/login', { email, password });
  localStorage.setItem('pg_token', token);
  return user;
}

export function logout() {
  localStorage.removeItem('pg_token');
}

export function getToken() {
  return localStorage.getItem('pg_token');
}
```

Then in `App.jsx`, replace the simulated login handlers with calls to `login()` and set `currentRole` from the returned `user.role`.

### 5. Suggested REST API contract

These endpoints map directly to the screens. Adjust to your stack (REST shown; GraphQL works equally well).

| Area | Method & Path | Used by | Notes |
|------|---------------|---------|-------|
| **Auth** | `POST /auth/login` | Login, MobileAuth | `{ email, password }` → `{ token, user }` |
| | `POST /auth/logout` | Sidebar logout | invalidate session |
| | `GET /auth/me` | App bootstrap | current user from token |
| **Resources** | `GET /resources` | Catalogue, Recommendations | supports `?type=book\|device\|room&q=&cat=` |
| | `GET /resources/:id` | ResourceDetail | includes availability & copies |
| | `POST /resources` | Staff ManageResources / Modal | add a resource |
| | `PUT /resources/:id` | Staff ManageResources | edit |
| | `DELETE /resources/:id` | Staff ManageResources | remove |
| | `GET /resources/:id/copies` | Admin Resources | copy-level status |
| **Bookings** | `GET /bookings?userId=` | MyBookings, Mobile | current + history |
| | `POST /bookings` | BookingModal | instant booking |
| | `POST /bookings/:id/approval` | BookingModal | Tier 4+ approval request |
| | `DELETE /bookings/:id` | MyBookings | cancel |
| **Waitlist** | `GET /waitlist?userId=` | Waitlist | user's queue positions |
| | `POST /waitlist` | BookingModal | join queue (+ justification msg) |
| | `GET /waitlist/review` | Staff WaitlistReview | pending promotions |
| | `POST /waitlist/:id/promote` | Staff WaitlistReview | promote / decline |
| **Approvals** | `GET /approvals` | Staff Approvals | pending device approvals |
| | `POST /approvals/:id` | Staff Approvals | `{ action: 'approve'\|'decline' }` |
| **Checkout** | `POST /checkout` | Staff Checkout, Mobile scan | `{ qr, action: 'checkout'\|'return' }` |
| **Overdue** | `GET /overdue` | Staff Overdue | overdue loans + escalation stage |
| | `POST /overdue/:id/notify` | Staff Overdue | send recall notice |
| **Points** | `GET /users/:id/points` | Points, Profile | balance, tier, history |
| **Users** (admin) | `GET /users` | Admin Users | supports `?role=&tier=&sort=` |
| | `POST /users` | AdminModal | create user |
| | `PUT /users/:id` | AdminModal | edit user/role/tier/status |
| | `DELETE /users/:id` | Admin Users | remove |
| **Audit** | `GET /audit` | Admin AuditLog | supports `?kind=` |
| **Config** | `GET /config` | Admin Config | tiers, penalties, toggles |
| | `PUT /config` | Admin Config | save configuration |
| **Stats** | `GET /stats/admin` | Admin Dashboard | KPI cards, charts, health |
| | `GET /stats/staff` | Staff Dashboard | desk feed + counters |

### 6. Data shapes (from `mockData.js`)

Return these shapes and the UI works unchanged. Key examples:

```jsonc
// Resource
{
  "id": 1,
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "cat": "Programming",
  "type": "book",            // "book" | "device" | "room"
  "copies": 4,
  "available": 2,            // 0 ⇒ booking flow routes to waitlist
  "color": "#15803d",        // accent for the cover tile
  "tags": ["Software", "Best Practices"],
  "blurb": "A handbook of agile software craftsmanship…",
  "tier": null               // device tier 1–5; ≥4 ⇒ requires approval
}

// User
{
  "id": 1,
  "name": "Sahan Wickrama",
  "email": "sahan@meridian.edu",
  "role": "Student",         // "Student" | "Lecturer" | "Staff" | "Admin"
  "tier": "Tier 3",
  "pts": 720,
  "status": "Active",        // "Active" | "Suspended" | "Restricted"
  "group": "CS · Batch 23",
  "phone": "+94 77 123 4567"
}

// Config tier
{ "tier": "Tier 3", "label": "Regular", "threshold": 600, "books": 5, "devices": 3, "rooms": 3 }

// Audit entry
{ "actor": "admin@meridian.edu", "action": "User suspended", "target": "Thilini Fernando", "kind": "Admin", "time": "2026-06-22 14:32", "ip": "10.0.1.12" }
```

> The `color` / `col` / `bg` fields are presentation hints used by the mock data. A real backend can omit them and let the front-end derive colors, or keep returning them for an exact match.

### 7. Booking flow logic

`openBooking(resource)` in `App.jsx` decides the modal stage — replicate this rule on the server when validating a `POST /bookings`:

- `available === 0` → **waitlist** (`POST /waitlist`)
- `tier >= 4` → **approval required** (`POST /bookings/:id/approval`)
- otherwise → **instant booking** (`POST /bookings`)

### 8. Real-time (optional)

Staff/admin screens (overdue, approvals, waitlist, desk feed) benefit from live updates. Add a WebSocket or SSE channel and push events such as `booking.created`, `loan.returned`, `waitlist.promoted` so dashboards refresh without polling.

### 9. Suggested backend stack

Any stack that speaks JSON works. A pragmatic choice:

- **Node + Express/Fastify** or **NestJS** for the API
- **PostgreSQL** (relational fits resources/loans/waitlists/points well) with **Prisma**
- **JWT** auth with role claims
- A **nightly job** (cron) for the penalty/escalation logic described in the Config screen

---

## 🎨 Design Tokens

| Token | Value |
|-------|-------|
| Primary green | `#16a34a` |
| Bright green | `#22c55e` |
| Deep green | `#166534` / `#0c2a1a` |
| Points amber | `#f59e0b` |
| Success emerald | `#059669` |
| Danger rose | `#ef4444` |
| Waitlist pink | `#db2777` |
| App background | `#eeeef4` |
| Fonts | Public Sans (UI), Spectral (headings), IBM Plex Mono (labels/codes) |

---

## 📦 Tech Stack

- **React 18** + **Vite**
- **React Context** for state (no external state library)
- **Inline styles** matching the original design prototype
- **Google Fonts** (Public Sans, Spectral, IBM Plex Mono)

---

## 📄 License

Internal project — adapt as needed for your institution.

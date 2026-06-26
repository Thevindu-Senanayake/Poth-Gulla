# Poth Gulla - Web Client

React 19 + Vite admin/student web interface for the Poth Gulla smart library system. Fully wired to the NestJS backend - no mock data.

---

## Roles & screens

| Role                   | Key screens                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Student / Lecturer** | Dashboard, Catalogue, My Bookings (pending pickup + active loans), Study Rooms, Waitlist, Self-Checkout, Room Check-in, Points & Tier, Recommendations, Profile |
| **Library Staff**      | Operations Dashboard, Checkout/Return Desk, Waitlist Review, Device Approvals, Overdue Management, Manage Resources, Room Check-in                              |
| **Admin**              | System Overview, User Management, Audit Log, System Config (tiers/penalties/toggles), Resource Management                                                       |

---

## Getting started

Requires the backend API running at `http://localhost:3000`.

```bash
# from repo root
yarn install

# start just the web client
cd web-client && yarn dev

# or start everything together
yarn dev   # from repo root via Turborepo
```

Create `web-client/.env`:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

---

## Key features

- **Booking flow** - `openBooking(resource)` routes to instant booking, staff-approval request (Tier 4+ devices), or waitlist based on the backend response
- **QR display** - `RealQRCode` renders scannable QR codes; for APPROVED book/device bookings the QR encodes the physical asset tag, not a UUID
- **Notification bell** - SSE push via `EventSource`; badge increments on new events; panel auto-marks as read after 1.5 s
- **Audit log** - server-side filtering by category (dropdown), date range (preset or custom), log ID search, and sort direction toggle on the Timestamp column
- **Points & Tier** - tier ladder and penalty table fetched live from `/api/config`; shows current values set by admin

---

## Architecture

```text
src/
├── api/              # Axios wrappers (auth, bookings, catalogue, scan, waitlist, misc, config)
│   └── adapters.js   # Normalises backend shapes → stable UI field names
├── components/       # Sidebar, Header (notification bell), Layout, QRCode, Modal, Toast
├── hooks/            # useFetch, useBadgeCounts, usePaginated
├── modals/           # BookingModal, StaffModal, AdminModal
└── screens/
    ├── student/      # Dashboard, Catalogue, Rooms, MyBookings, Points, ...
    ├── staff/        # Dashboard, Checkout, Approvals, WaitlistReview, ...
    └── admin/        # Dashboard, Users, AuditLog, Config, Resources
```

All global state lives in `App.jsx` via React Context. There is no external state library.

---

## Tech

- React 19, Vite, react-router-dom v6
- Axios for API calls; JWT stored in `localStorage`
- Inline styles matching the design system (Public Sans / Spectral / IBM Plex Mono fonts)
- `EventSource` for SSE notification push
- `qrcode` library (CDN) for real scannable QR rendering

---

## Build

```bash
yarn build          # production bundle → dist/
yarn preview        # preview the production build locally
```

The Docker production image (`Dockerfile`) serves the built assets with nginx, proxying `/api` to the backend.

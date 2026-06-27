# Poth Gulla

**Smart Library Resource Management System**

> Team **SegFault** · CIPHER 2.0 Hackathon · Scenario 04
>
> A campus-library platform with an ELO-style member-tier ladder, fair waitlist scoring, asset-tag QR workflow, real-time push notifications, and live availability across books, devices, and study rooms.

<p align="center">
  <img src="./web-client/src/assets/login.png" width="780" alt="Poth Gulla Login" />
  <img src="./web-client/src/assets/dashboard.png" width="780" alt="Poth Gulla Admin dashboard" />
</p>

---

## Table of contents

- [Poth Gulla](#poth-gulla)
  - [Table of contents](#table-of-contents)
  - [Why it exists](#why-it-exists)
  - [Highlights](#highlights)
  - [Architecture](#architecture)
  - [Tech stack](#tech-stack)
  - [Repository layout](#repository-layout)
  - [Quick start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [1. Clone \& install](#1-clone--install)
    - [2. Environment files](#2-environment-files)
    - [3. Start everything (Turborepo)](#3-start-everything-turborepo)
    - [4. First-time seed](#4-first-time-seed)
  - [Demo accounts](#demo-accounts)
  - [API surface](#api-surface)
    - [Auth](#auth)
    - [Bookings](#bookings)
    - [Scan (QR workflow)](#scan-qr-workflow)
    - [Catalogue](#catalogue)
    - [Waitlist](#waitlist)
    - [Notifications (SSE push)](#notifications-sse-push)
    - [Points \& system config](#points--system-config)
  - [Domain primitives](#domain-primitives)
    - [Member tiers](#member-tiers)
    - [Waitlist scoring](#waitlist-scoring)
    - [QR flow](#qr-flow)
    - [Book copy lifecycle](#book-copy-lifecycle)
  - [Testing](#testing)
  - [Code style \& pre-commit](#code-style--pre-commit)
  - [CI / CD](#ci--cd)
  - [Deployment](#deployment)
  - [Troubleshooting](#troubleshooting)
  - [Team \& credits](#team--credits)
  - [License](#license)

---

## Why it exists

Campus libraries juggle three resource types (**books, devices, study rooms**) across four user roles (**Admin, Library Staff, Lecturer, Student**) with overlapping access rules, fair-share constraints, and a paper-heavy desk workflow. Poth Gulla collapses all of that into a single web + mobile system where:

- Members get a **single QR** that encodes the physical asset tag — no separate "booking token" to manage.
- Staff scan one tag at the desk; the system identifies the member, validates the booking window, and flips the loan state.
- Waitlist ordering uses an explainable score `priority = tier × 0.6 + role × 0.4`, with message-flagged entries kicked out to a staff review queue so power-users can't game the auto-promoter.
- Every state change emits a notification to the affected member's bell **and** an audit log entry the admin can search by id, date, category, or actor.

---

## Highlights

| Area                       | What ships                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Member tiers**           | 5-tier ladder (Restricted → Elite), admin-editable thresholds, auto-recomputed on threshold change                                                        |
| **Fair waitlist**          | Score-based ordering; auto-promotion on freed slots; review queue for message-flagged entries; holds promotion while staff is reviewing                   |
| **QR workflow**            | Booking QR encodes the physical `assetTag` for books/devices and `roomQr` for rooms — one scan covers checkout, return, and walk-up room access           |
| **Book copy lifecycle**    | `AVAILABLE → RESERVED → BORROWED → AVAILABLE`; copy is reserved the moment a booking is approved so the QR is meaningful before pickup                    |
| **Notifications**          | In-app bell with SSE push (no polling); fires for booking approval/rejection, waitlist promotion/dismissal, checkout, return, overdue tiers, room no-show |
| **Audit log**              | Append-only event trail; admin can filter by category chip, date preset / custom range, copy log id to clipboard                                          |
| **System config**          | Admin-editable tier thresholds + penalty values + feature flags; tier-threshold edits recompute every user's tier                                         |
| **Resource management**    | Books (per-copy tracking, archive / retire), devices (tier-gated staff approval), study rooms (time-overlap detection, walk-up check-in)                  |
| **Self-checkout**          | Students scan a book QR sticker themselves; devices and rooms still require staff to inspect/witness handover                                             |
| **Role-based visibility**  | Students/Lecturers only see active books; Admin/Staff see archived and retired catalogue too                                                              |
| **Staff-on-behalf**        | Staff Room Check-in auto-finds the booking holder so the room is logged under the right student (not under staff)                                         |
| **Real device + web apps** | React + Vite admin/staff/student web app; React Native (Expo) student mobile app                                                                          |

---

## Architecture

```
                       ┌───────────────────────────────┐
                       │  React Native (Expo) - mobile │
                       └───────────────┬───────────────┘
                                       │
                       ┌───────────────▼───────────────┐
                       │  React + Vite - web client    │
                       └───────────────┬───────────────┘
                                       │  JWT (Bearer)
                                       │  Axios + SSE for /notifications/stream
                       ┌───────────────▼───────────────┐
                       │  NestJS 11 API                │
                       │  RBAC · Validation · Swagger  │
                       └───┬───────────────────────┬───┘
                           │                       │
        ┌──────────────────┼────────┐        ┌─────▼──────┐
        │                  │        │        │            │
   ┌────▼────┐      ┌──────▼─────┐ ┌▼──────┐ │  Prometheus│
   │Postgres │      │Redis 7     │ │Cron   │ │  + Grafana │
   │  15     │      │(cache +    │ │(overdue│ │            │
   │ Prisma  │      │ SSE bus)   │ │ sweep)│ │            │
   └─────────┘      └────────────┘ └───────┘ └────────────┘
```

- **Single Postgres database** owned by Prisma 7; every state change goes through a service method, never a direct query.
- **Redis** caches catalogue lists (invalidated on mutation) and brokers SSE notifications between Nest workers.
- **SSE** instead of WebSockets keeps the notification stream simple: one `GET /notifications/stream` per session, JWT in the query string, auto-reconnect on the browser.
- **Cron-driven overdue sweep** marks `Borrowing.status = OVERDUE`, applies penalties, escalates to admin, and fires `ROOM_NO_SHOW` for no-shows.

---

## Tech stack

| Package       | Stack                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| `server`      | NestJS 11 · Prisma 7 (Postgres 15) · Redis 7 (ioredis) · JWT · bcrypt · Swagger · prom-client |
| `web-client`  | React 19 · Vite · react-router-dom · axios · lucide-react · `qrcode` (CDN-loaded)             |
| `client`      | Expo SDK 54 · expo-router · expo-secure-store · axios                                         |
| Observability | Prometheus + Grafana (Docker)                                                                 |
| Testing       | Jest 30 (ESM) · Supertest — **125 unit tests + 12 e2e smoke tests**                           |
| CI / CD       | GitHub Actions — lint gate · test gate · change-detection · signed releases (cosign)          |
| Code quality  | Prettier (4-space, single quotes) · ESLint · lint-staged · Husky pre-commit                   |

---

## Repository layout

```
Poth Gulla/
├── server/                  NestJS API
│   ├── src/
│   │   ├── auth/           JWT, RBAC, login/register/logout — logs USER_LOGGED_IN
│   │   ├── booking/        Routing, copy auto-assignment, duplicate-booking guard
│   │   ├── waitlist/       Priority scoring, auto-promote with copy reservation, review hold
│   │   ├── points/         Config-driven point mutations, tier derivation
│   │   ├── scan/           QR checkout/self-checkout/return, staff room check-in (auto-find student)
│   │   ├── catalogue/      Books (archive/retire), devices, rooms, categories
│   │   ├── notification/   SSE push stream + CRUD inbox
│   │   ├── users/          CRUD, tier ↔ points coupling
│   │   ├── config/         Admin-editable system config; recomputes tiers on threshold change
│   │   ├── audit/          Server-side filterable, sortable event log
│   │   ├── overdue/        Daily cron — recall, escalation, room no-show
│   │   ├── review/         Book reviews, one-per-book guard
│   │   └── recommendation/ Personalised book recommendations
│   ├── prisma/
│   │   ├── schema.prisma   12 models · ItemStatus includes RESERVED
│   │   ├── migrations/     Tracked migration files (prisma migrate deploy)
│   │   └── seed.ts         Demo accounts + sample data
│   └── Dockerfile, docker-entrypoint.sh
│
├── web-client/              React + Vite (admin / staff / student web)
│   ├── src/
│   │   ├── screens/        Per-role dashboards, catalogue, bookings, config, audit
│   │   ├── components/     Sidebar, Header, NotificationPanel, RealQRCode, QRScanner, Modal portal
│   │   ├── hooks/          useFetch · useBadgeCounts · usePaginated
│   │   ├── modals/         BookingModal · StaffModal · AdminModal
│   │   └── api/            Axios client + adapter layer
│   └── Dockerfile
│
├── client/                  React Native (Expo SDK 54) student mobile app
│   └── app/                 expo-router screens (login, catalogue, bookings)
│
├── infra/                   Prometheus + Grafana provisioning
├── .github/workflows/       CI: lint, test, signed release, change detection
├── .husky/                  pre-commit: lint-staged → unit tests → e2e tests
├── docker-compose.yml       Postgres 15, Redis 7, Prometheus, Grafana
└── .env                     Compose secrets (not committed)
```

---

## Quick start

### Prerequisites

- Node.js **v22+**
- Docker Desktop (WSL2 on Windows)
- Yarn **v1.22+**

### 1. Clone & install

```bash
git clone https://github.com/Thevindu-Senanayake/Poth-Gulla.git
cd Poth-Gulla
yarn install
```

### 2. Environment files

**Root `.env`** (used by `docker-compose.yml`):

```dotenv
POSTGRES_USER=admin
POSTGRES_PASSWORD=password123
POSTGRES_DB=poth_gulla
DOCKER_DATABASE_URL=postgresql://admin:password123@postgres:5432/poth_gulla?schema=public
DOCKER_REDIS_URL=redis://redis:6379
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
GRAFANA_ADMIN_PASSWORD=admin
```

**`server/.env`** (used by Nest in dev):

```dotenv
DATABASE_URL="postgresql://admin:password123@127.0.0.1:5433/poth_gulla?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
```

**`web-client/.env`**:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

### 3. Start everything (Turborepo)

```bash
yarn dev        # Docker infra + API + web client + mobile via Turborepo
```

### 4. First-time seed

```bash
cd server
yarn prisma migrate deploy   # apply tracked migrations
yarn tsx prisma/seed.ts      # seed demo accounts + sample data
```

Open:

- Web: `http://localhost:5173`
- API & Swagger: `http://localhost:3000/api` and `http://localhost:3000/api/docs`
- Grafana: `http://localhost:3001` (login `admin` / `admin`)
- Prometheus: `http://localhost:9090`

---

## Demo accounts

All accounts use password `Password123`.

| Role          | Email                |
| ------------- | -------------------- |
| Admin         | `admin@iit.ac.lk`    |
| Library Staff | `staff@iit.ac.lk`    |
| Lecturer      | `lecturer@iit.ac.lk` |
| Student       | `student@iit.ac.lk`  |

---

## API surface

Base URL: `http://localhost:3000/api`

### Auth

| Method | Path             | Notes                                              |
| ------ | ---------------- | -------------------------------------------------- |
| POST   | `/auth/login`    | returns `{ accessToken, user }`                    |
| POST   | `/auth/register` | Admin only; new accounts start at 500 pts (Tier 3) |
| GET    | `/auth/me`       | validates token + returns the sanitised user       |
| POST   | `/auth/logout`   | revokes server-side session state                  |

### Bookings

| Method | Path                       | Notes                                                           |
| ------ | -------------------------- | --------------------------------------------------------------- |
| POST   | `/bookings`                | routes to APPROVED / PENDING / WAITLIST                         |
| GET    | `/bookings/me`             | own bookings (`qrToken` = asset tag for APPROVED books/devices) |
| GET    | `/bookings`                | all bookings (Admin / Staff)                                    |
| PATCH  | `/bookings/:id/approve`    | approve a PENDING (high-tier device) booking                    |
| POST   | `/bookings/:id/cancel`     | cancel own booking — releases reserved copy                     |
| POST   | `/bookings/:id/cancel-any` | admin / staff override                                          |

### Scan (QR workflow)

| Method | Path                  | Notes                                                                  |
| ------ | --------------------- | ---------------------------------------------------------------------- |
| POST   | `/scan/checkout`      | staff: `{ bookingQr, assetTag }`; auto-detects student from asset tag  |
| POST   | `/scan/self-checkout` | student / lecturer: `{ assetTag }`; no staff needed                    |
| POST   | `/scan/room-checkin`  | `{ roomQr }`; students self-scan; Admin/Staff auto-find booking holder |
| POST   | `/scan/return`        | staff: `{ assetTag, condition }`                                       |

### Catalogue

```
GET   /catalogue/books              students: active only · Admin/Staff: all (incl. archived/retired)
GET   /catalogue/books/:id
POST  /catalogue/books               · PATCH /catalogue/books/:id  · DELETE /catalogue/books/:id
PATCH /catalogue/books/:id/archive   · PATCH /catalogue/books/:id/unarchive
POST  /catalogue/books/:id/copies    add a physical copy
DELETE /catalogue/copies/:id         retire a copy (blocked if RESERVED or BORROWED)
PATCH /catalogue/copies/:id/restore
GET   /catalogue/devices             · POST · PATCH · DELETE · PATCH …/maintenance
GET   /catalogue/rooms               · POST · PATCH · DELETE · PATCH …/maintenance
```

### Waitlist

| Method | Path                                   | Notes                                           |
| ------ | -------------------------------------- | ----------------------------------------------- |
| GET    | `/waitlist/me`                         | own entries                                     |
| GET    | `/waitlist/:resourceType/:resourceKey` | ordered queue with user details (Admin / Staff) |
| POST   | `/waitlist/:id/promote`                | manual promote                                  |
| POST   | `/waitlist/:id/dismiss`                | dismiss; also cancels the underlying booking    |

### Notifications (SSE push)

| Method | Path                      | Notes                        |
| ------ | ------------------------- | ---------------------------- |
| GET    | `/notifications/stream`   | SSE; auth via `?token=<jwt>` |
| GET    | `/notifications/me`       | paginated inbox              |
| POST   | `/notifications/read-all` |                              |
| PATCH  | `/notifications/:id/read` |                              |

### Points & system config

| Method | Path              | Notes                                                                |
| ------ | ----------------- | -------------------------------------------------------------------- |
| GET    | `/points/me`      |                                                                      |
| GET    | `/points/:userId` |                                                                      |
| GET    | `/config`         | tier thresholds + penalty values + feature toggles                   |
| PUT    | `/config`         | update config; tier-threshold edits auto-recompute every user's tier |
| GET    | `/audit/logs`     | filterable by category, date range, actor, log id, sort direction    |

Full Swagger spec lives at `/api/docs` once the API is running.

---

## Domain primitives

### Member tiers

| Tier | Floor (points) | Name       |
| ---- | -------------- | ---------- |
| 1    | 0              | Restricted |
| 2    | 200            | Basic      |
| 3    | 500            | Regular    |
| 4    | 1 000          | Advanced   |
| 5    | 2 000          | Elite      |

Thresholds are stored in `SystemConfig` and editable from the admin UI. Changing them re-runs the tier derivation for every user.

### Waitlist scoring

```
priority = tier × 0.6 + role × 0.4
```

Higher score wins. Entries with a member-supplied **message** automatically float to the staff review queue and are excluded from auto-promotion until reviewed.

### QR flow

| Stage            | QR encodes                             | Who scans                | Endpoint                                            |
| ---------------- | -------------------------------------- | ------------------------ | --------------------------------------------------- |
| Book APPROVED    | `copy.assetTag` (`BK-CC-001`)          | Staff at collection desk | `POST /scan/checkout` — auto-finds booking by asset |
| Book CHECKED_OUT | `copy.assetTag`                        | Staff at return desk     | `POST /scan/return`                                 |
| Device APPROVED  | `device.assetTag`                      | Staff at collection desk | same                                                |
| Room APPROVED    | `studyRoom.roomQr` (door sticker)      | Student scans the door   | `POST /scan/room-checkin`                           |
| Self-checkout    | Printed book sticker (`copy.assetTag`) | Student at the shelf     | `POST /scan/self-checkout`                          |

### Book copy lifecycle

```
AVAILABLE → RESERVED (booking APPROVED + copy assigned)
         → BORROWED  (staff or student confirms physical handover)
         → AVAILABLE (book returned)

AVAILABLE → BORROWED  (direct staff checkout, no pre-booking)
         → AVAILABLE (returned)
```

Copies in `RESERVED` or `BORROWED` cannot be retired or archived. The owning booking's `cancel` / `return` paths release the copy explicitly.

---

## Testing

```bash
cd server
yarn test            # 125 unit tests (controllers, services, domain logic)
yarn test:e2e        # 12 e2e smoke tests (auth, booking, scan surface)
yarn test:cov        # coverage report → server/coverage/
```

The pre-commit hook runs all three suites automatically — broken tests block the commit.

---

## Code style & pre-commit

Pre-commit runs four steps in order: **format** (Prettier) → **lint** (ESLint) → **unit tests** → **e2e tests**.

```bash
yarn format          # rewrite files with the shared Prettier config
yarn format-check    # CI-friendly format check, no writes
yarn lint            # ESLint across every workspace
```

`.prettierrc.json` — **4-space indent · single quotes · `trailingComma: es5` · `printWidth: 100`**.

---

## CI / CD

- **`ci.yml`** — runs on every PR and push to `main`: install → lint → unit tests → e2e tests → web build.
- **`release-deploy.yml`** — triggered on version tags (`v*`): runs tests as a gate, builds/signs changed Docker images (cosign), deploys to DigitalOcean via SSH + `docker compose`.

Change detection skips rebuilding unchanged services; the previous image digest is carried forward.

---

## Deployment

Production uses `docker-compose.deploy.yml` (pulled from the repo by CI). The API container's entrypoint runs `prisma migrate deploy` before starting Nest, so the schema is always current.

See `deploy/DEPLOY.md` for manual deployment steps and the list of required GitHub secrets.

---

## Troubleshooting

| Symptom                                                               | Fix                                                                                                                                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma migrate deploy` fails with "shadow database" error            | Make sure Postgres is fully up first (`docker compose ps`); shadow DB is only needed for `migrate dev`, not `deploy`.                        |
| Web shows the QR but desk scanner says "no booking matches"           | Confirm the booking is `APPROVED` (not just `PENDING`) — `qrToken` is only set to the asset tag once a copy has been reserved at approval.   |
| Bell doesn't update after a state change                              | Notifications are pushed via SSE. Check `GET /notifications/stream` is open in dev tools → Network → EventStream; reconnect on token expiry. |
| Staff Room Check-in attaches the room to staff instead of the student | Resolved in `684141a` — make sure your backend is on `main`. The endpoint now auto-finds the booking holder.                                 |
| `yarn dev` complains about port 5433 in use                           | Stop a stray Postgres on your host, or change `POSTGRES_HOST_PORT` in `.env`.                                                                |
| Notification panel opens behind the page when you scroll              | The panel is anchored to the bell via `position: relative` on its wrapper — pull the latest `Header.jsx`.                                    |

---

## Team & credits

**SegFault** — built for CIPHER 2.0, Scenario 04.

- Backend & infra: NestJS, Prisma, Redis, Docker, GitHub Actions CI / signed-release pipeline
- Web client: React 19 + Vite, role-aware screens, SSE-driven notification bell
- Observability: Prometheus + Grafana dashboards

---

## License

See [`LICENSE`](./LICENSE) at the repo root.

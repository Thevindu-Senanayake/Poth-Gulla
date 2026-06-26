# Poth Gulla - Smart Library Resource Management System

> Team: SegFault | CIPHER 2.0 Hackathon | Scenario 04
>
> A campus library platform with ELO-style User Point tiers, fair waitlist scoring, QR-driven check-in/checkout, real-time push notifications, and live availability across books, devices, and study rooms.

---

## Core Features

| Area                    | What ships                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Points & Tiers**      | 5-tier ladder (Restricted → Elite), dynamic thresholds editable in Admin Config, auto-recomputed on threshold change                         |
| **Fair Waitlist**       | Priority score = (tier × 0.6) + (role × 0.4); auto-promotion on freed slots; staff review queue for message-flagged entries                  |
| **QR Workflow**         | Booking QR encodes the physical asset tag; student shows one QR for collection and return; staff front-desk scan auto-identifies the student |
| **Book Copy Lifecycle** | Copy is RESERVED at booking-APPROVED time; transitions to BORROWED at actual handover; AVAILABLE on return                                   |
| **Notifications**       | In-app bell with SSE push (no polling); events for booking approval/rejection, waitlist promotion/dismissal, overdue reminders               |
| **Audit Log**           | Append-only event trail; server-side filter by category, date range, sort direction, log ID search                                           |
| **System Config**       | Admin-editable tier thresholds + point penalty values (all config-driven, no hardcoded constants); changes take effect immediately           |
| **Resource Management** | Books (per-copy tracking, archive/soft-delete, retire), devices (tier-based staff approval), study rooms (time-overlap detection)            |
| **Self-Checkout**       | Students scan book QR sticker at the shelf - no staff needed                                                                                 |
| **RBAC**                | Admin, Library Staff, Lecturer, Student with granular endpoint permissions                                                                   |

---

## Tech Stack

| Package       | Stack                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `server`      | NestJS 11, Prisma 7 (PostgreSQL 15), Redis (ioredis), JWT, bcrypt, Swagger, prom-client                                  |
| `web-client`  | React 19, Vite, react-router-dom, axios                                                                                  |
| `client`      | Expo SDK 54, expo-router, expo-secure-store, axios                                                                       |
| Observability | Prometheus + Grafana (Docker)                                                                                            |
| Testing       | Jest 30 (ESM), Supertest - 125 unit tests + 12 e2e smoke tests                                                           |
| CI/CD         | GitHub Actions: lint gate, test gate, change-detection, signed releases (cosign)                                         |
| Code quality  | Prettier (4-space indent, single quotes), ESLint, lint-staged, Husky pre-commit (format → lint → unit tests → e2e tests) |

---

## Project Structure

```
Poth Gulla/
├── server/                  # NestJS API (Node 22+, PostgreSQL + Prisma 7)
│   ├── src/
│   │   ├── auth/           # JWT, RBAC, login/register/logout - logs USER_LOGGED_IN
│   │   ├── booking/        # Router, copy auto-assignment, duplicate prevention
│   │   ├── waitlist/       # Priority scoring, auto-promotion with copy reservation
│   │   ├── points/         # Config-driven point mutations, tier derivation
│   │   ├── scan/           # QR checkout/self-checkout/return, staff room check-in
│   │   ├── catalogue/      # Books (archive/retire), devices, rooms, categories
│   │   ├── notification/   # SSE push stream + CRUD inbox
│   │   ├── users/          # CRUD, tier-points coupling
│   │   ├── config/         # Admin-editable system config (tiers/penalties); auto-recomputes tiers
│   │   ├── audit/          # Server-side filterable, sortable event log
│   │   ├── overdue/        # Daily cron - recall flag, escalation, room no-show
│   │   ├── review/         # Book reviews, one-per-book guard
│   │   └── recommendation/ # Personalised book recommendations
│   ├── prisma/
│   │   ├── schema.prisma   # 12 models; ItemStatus includes RESERVED
│   │   ├── migrations/     # Tracked migration files (prisma migrate deploy)
│   │   └── seed.ts         # Demo data (4 users, books, devices, rooms)
│   └── Dockerfile, docker-entrypoint.sh
│
├── web-client/              # React + Vite admin/student web app
│   ├── src/
│   │   ├── screens/        # Per-role dashboards, catalogue, bookings, config, audit
│   │   ├── components/     # Sidebar, Header, notification bell, QR renderer
│   │   ├── hooks/          # useFetch, useBadgeCounts, usePaginated
│   │   └── api/            # Axios client + adapter layer
│   └── Dockerfile
│
├── client/                  # React Native (Expo SDK 54) student mobile app
│   └── app/                 # expo-router screens (login, catalogue, bookings)
│
├── infra/                   # Prometheus + Grafana provisioning
├── .github/workflows/       # CI: lint, test, signed release, change detection
├── .husky/                  # pre-commit: lint-staged → unit tests → e2e tests
├── docker-compose.yml       # Postgres 15, Redis 7, Prometheus, Grafana
└── .env                     # Compose secrets (not committed)
```

---

## Prerequisites

- Node.js v22+
- Docker Desktop (WSL2 on Windows)
- Yarn v1.22+

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Thevindu-Senanayake/Poth-Gulla.git
cd "Poth Gulla"
yarn install
```

### 2. Environment files

**Root `.env`:**

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

**`server/.env`:**

```dotenv
DATABASE_URL="postgresql://admin:password123@127.0.0.1:5433/poth_gulla?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
```

**`web-client/.env`:**

```dotenv
VITE_API_URL=http://localhost:3000/api
```

### 3. Start

```bash
yarn dev        # starts Docker infra + API + web client + mobile via Turborepo
```

### 4. First-time seed

```bash
cd server
yarn prisma migrate deploy   # run all tracked migrations
yarn tsx prisma/seed.ts      # seed demo accounts + sample data
```

---

## Demo Accounts (password: `Password123`)

| Role          | Email                |
| ------------- | -------------------- |
| Admin         | `admin@iit.ac.lk`    |
| Library Staff | `staff@iit.ac.lk`    |
| Lecturer      | `lecturer@iit.ac.lk` |
| Student       | `student@iit.ac.lk`  |

---

## API Quick Reference

Base URL: `http://localhost:3000/api`

### Auth

- `POST /auth/login` - returns `{ accessToken, user }`
- `POST /auth/register` - Admin only; new accounts start at 500 pts (Tier 3)
- `GET /auth/me` - validate token + get user

### Bookings

- `POST /bookings` - route to APPROVED / PENDING / WAITLIST
- `GET /bookings/me` - own bookings (`qrToken` = asset tag for APPROVED books/devices)
- `GET /bookings` - all bookings (Admin/Staff)
- `PATCH /bookings/:id/approve` - approve PENDING device booking
- `POST /bookings/:id/cancel` - cancel own booking

### Scan (QR Workflow)

- `POST /scan/checkout` - staff: `{ bookingQr, assetTag }`; auto-detects student from asset tag
- `POST /scan/self-checkout` - student: `{ assetTag }`; no staff needed
- `POST /scan/room-checkin` - `{ roomQr }`; students self-scan; Admin/Staff auto-find booking holder
- `POST /scan/return` - staff: `{ assetTag, condition }`

### Catalogue

- `GET /catalogue/books` - students: active only; Admin/Staff: all including archived/retired
- `GET /catalogue/books/:id`
- `POST /catalogue/books`, `PATCH /catalogue/books/:id`, `DELETE /catalogue/books/:id`
- `PATCH /catalogue/books/:id/archive` - soft-delete (hidden from students)
- `PATCH /catalogue/books/:id/unarchive`
- `POST /catalogue/books/:id/copies` - add physical copy
- `DELETE /catalogue/copies/:id` - retire copy
- `PATCH /catalogue/copies/:id/restore`
- `GET /catalogue/devices`, `POST`, `PATCH`, `DELETE`
- `GET /catalogue/rooms`, `POST`, `PATCH`, `DELETE`
- `PATCH /catalogue/devices/:id/maintenance`, `PATCH /catalogue/rooms/:id/maintenance`

### Waitlist

- `GET /waitlist/me` - own entries
- `GET /waitlist/:resourceType/:resourceKey` - ordered queue with user details (Admin/Staff)
- `POST /waitlist/:id/promote`, `POST /waitlist/:id/dismiss`

### Notifications (SSE push)

- `GET /notifications/stream` - SSE; auth via `?token=<jwt>`
- `GET /notifications/me` - paginated inbox
- `POST /notifications/read-all`
- `PATCH /notifications/:id/read`

### Points & System Config

- `GET /points/me`, `GET /points/:userId`
- `GET /config` - tier thresholds + penalty values + feature toggles
- `PUT /config` - update config; tier change auto-recomputes all user tiers
- `GET /audit/logs` - filterable by category, date range, actor, sort direction

---

## QR Flow

| Stage            | QR encodes                         | Who uses it              | Endpoint                                                |
| ---------------- | ---------------------------------- | ------------------------ | ------------------------------------------------------- |
| Book APPROVED    | `copy.assetTag` (e.g. `BK-CC-001`) | Staff at collection desk | `POST /scan/checkout` - auto-finds booking by asset tag |
| Book CHECKED_OUT | `copy.assetTag`                    | Staff at return desk     | `POST /scan/return`                                     |
| Device APPROVED  | `device.assetTag`                  | Staff at collection desk | same                                                    |
| Room APPROVED    | `studyRoom.roomQr` (door sticker)  | Student scans door       | `POST /scan/room-checkin`                               |
| Self-checkout    | Physical book sticker (`assetTag`) | Student at shelf         | `POST /scan/self-checkout`                              |

---

## Book Copy Lifecycle

```
AVAILABLE → RESERVED (booking APPROVED + copy assigned)
         → BORROWED  (staff confirms physical handover)
         → AVAILABLE (book returned)

AVAILABLE → BORROWED  (direct staff checkout, no pre-booking)
         → AVAILABLE (returned)
```

Copies marked RESERVED or BORROWED cannot be retired.

---

## Testing

```bash
cd server
yarn test            # 125 unit tests (controller, service, domain logic)
yarn test:e2e        # 12 e2e smoke tests (auth, booking, scan surface)
yarn test:cov        # coverage report → server/coverage/
```

The pre-commit hook runs all three suites automatically.

---

## Code Style & Pre-commit

The pre-commit hook runs four steps in order: **format** (Prettier) → **lint** (ESLint) → **unit tests** → **e2e tests**.

```bash
yarn format          # reformat all files with shared Prettier config
yarn format-check    # CI-friendly format check (no writes)
yarn lint            # ESLint across all workspaces
```

Config (`.prettierrc.json`): 4-space indent, single quotes, `trailingComma: es5`, `printWidth: 100`.

---

## Continuous Integration

- **`ci.yml`** - runs on every PR and push to `main`: install → lint → unit tests → e2e tests → web build.
- **`release-deploy.yml`** - triggered on version tags (`v*`): runs tests as a gate, builds/signs changed Docker images (cosign), deploys to DigitalOcean via SSH + `docker compose`.

Change detection skips rebuilding unchanged services; the previous image digest is carried forward.

---

## Deployment

Production uses `docker-compose.deploy.yml` (pulled from the repo by CI). The API container's entrypoint runs `prisma migrate deploy` before starting, ensuring the schema is always current.

See `deploy/DEPLOY.md` for manual deployment steps and required GitHub secrets.

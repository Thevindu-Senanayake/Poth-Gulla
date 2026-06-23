# Poth Gulla — Smart Library Resource Management System

> Team: SegFault | CIPHER 2.0 | Scenario 04

A decentralized library resource management system featuring ELO-style User Point tiers, fair waitlist scoring, QR-driven check-in/checkout, and real-time availability across book copies, devices, and study rooms.

---

## Project Structure

```text
Poth Gulla/
├── server/              # NestJS API — PostgreSQL + Prisma + JWT + Redis + Prometheus
├── admin-web-client/    # React + Vite + Tailwind — staff/admin dashboard
├── client/              # React Native (Expo SDK 54) — student/lecturer mobile app
├── infra/               # Prometheus scrape config + Grafana provisioning + dashboard
├── scripts/dev.mjs      # Dev runner: auto-starts Docker infra, launches all apps
├── docker-compose.yml   # Postgres + Redis + Prometheus + Grafana containers
└── .env                 # Root compose variables (not committed)
```

Monorepo managed with Yarn Workspaces and Turborepo. All three apps share one `yarn dev` command.

---

## Prerequisites

| Tool           | Version | Notes                                      |
| -------------- | ------- | ------------------------------------------ |
| Docker Desktop | Latest  | WSL2 backend on Windows                    |
| Node.js        | v22+    | Required by Prisma 7                       |
| Yarn           | v1.22+  | `npm install -g yarn`                      |
| Expo Go        | Latest  | Installed on a physical iOS/Android device |

---

## First-Time Setup

### 1. Environment files

**Root `.env`** (create alongside `docker-compose.yml`):

```dotenv
# Postgres container credentials
POSTGRES_USER=admin
POSTGRES_PASSWORD=password123
POSTGRES_DB=poth_gulla

# In-container URLs (used by the backend container)
DOCKER_DATABASE_URL=postgresql://admin:password123@postgres:5432/poth_gulla?schema=public
DOCKER_REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d

# Admin web (baked into browser bundle)
VITE_API_URL=http://localhost:3000/api

# Grafana admin password (defaults to "admin" if omitted)
GRAFANA_ADMIN_PASSWORD=admin
```

**`server/.env`** (for Prisma CLI and native backend runs):

```dotenv
# Use 127.0.0.1, NOT localhost — on Windows, localhost resolves to ::1 (IPv6)
# but Docker only binds on 127.0.0.1 (IPv4).
# Host port is 5433 (→ container 5432), so a native Postgres on 5432 doesn't clash.
DATABASE_URL="postgresql://admin:password123@127.0.0.1:5433/poth_gulla?schema=public"

JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Create the database schema and seed demo data

Start the containers first (`yarn dev` in one terminal), then in a second terminal:

```bash
cd server
yarn prisma db push       # creates tables from schema
yarn prisma generate      # regenerate Prisma client
yarn tsx prisma/seed.ts   # seeds demo accounts + catalogue data
```

The seed inserts:

- 4 demo user accounts (admin, staff, lecturer, student)
- 5 categories (3 book, 2 device)
- 6 book titles with 14 physical copies
- 9 devices across tiers 2–5
- 4 study rooms

---

## Running the Project

```bash
# Starts postgres + redis in Docker, then launches all three apps under the Turbo TUI.
# Ctrl+C stops all processes and tears down the containers automatically.
yarn dev
```

| Service         | URL                                   |
| --------------- | ------------------------------------- |
| API             | `http://localhost:3000/api`           |
| Swagger UI      | `http://localhost:3000/api/docs`      |
| API metrics     | `http://localhost:3000/api/metrics`   |
| Admin Dashboard | `http://localhost:5173`               |
| Prometheus      | `http://localhost:9090`               |
| Grafana         | `http://localhost:3001` (admin/admin) |
| Mobile (Expo)   | Scan QR code in terminal with Expo Go |

`yarn dev` now also starts the Prometheus and Grafana containers alongside Postgres and Redis.

### Mobile app — physical device access

The mobile app needs to reach the API from your phone. Use a tunnel:

```bash
npx localtunnel --port 3000
# Copy the https URL + /api and set it as API_BASE_URL in client/src/api/client.ts
```

---

## API Reference

Base URL: `http://localhost:3000/api`

### Auth

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Health check — returns `{ status, name, version, environment, uptime, timestamp, database }`. Authenticated callers get `auth: { userId, role }`. ADMIN callers also get `system: { pid, nodeVersion, memory }`. Status becomes `"degraded"` if the DB is unreachable. |
| `POST` | `/auth/login` | Public (409 if token present) | Login, returns JWT |
| `POST` | `/auth/register` | ADMIN | Create a new user account |
| `POST` | `/auth/logout` | JWT | Acknowledge logout (client clears token) |
| `GET` | `/auth/me` | JWT | Validate token + get current user |

### Users

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/users` | ADMIN, STAFF | List users — `?page`, `?limit`, `?role`, `?tier`, `?isActive`, `?search` |
| `GET` | `/users/:id` | ADMIN, STAFF | Get user by ID |
| `PATCH` | `/users/:id` | ADMIN | Update name, role, userPoints, or tier (tier↔points are coupled) |
| `PATCH` | `/users/:id/disable` | ADMIN | Disable account (blocks JWT) |
| `PATCH` | `/users/:id/enable` | ADMIN | Re-enable account |

### Bookings

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/bookings` | JWT | Create booking — routes to `APPROVED`, `PENDING`, or `WAITLIST` |
| `GET` | `/bookings/me` | JWT | Own bookings — `?status`, `?resourceType`, `?page`, `?limit` |
| `GET` | `/bookings` | ADMIN, STAFF | All bookings — `?userId`, `?resourceType`, `?status`, `?page`, `?limit` |
| `GET` | `/bookings/:id` | JWT (owner or ADMIN/STAFF) | Get single booking |
| `PATCH` | `/bookings/:id/approve` | ADMIN, STAFF | Approve a `PENDING` device booking |
| `PATCH` | `/bookings/:id/reject` | ADMIN, STAFF | Reject a `PENDING` booking |
| `POST` | `/bookings/:id/cancel` | JWT (owner) | Cancel own booking; frees slot + promotes waitlist |
| `POST` | `/bookings/:id/cancel-any` | ADMIN, STAFF | Cancel any booking |

**Booking body:**

```json
{
  "resourceType": "BOOK | DEVICE | ROOM",
  "resourceId": "<bookTitleId | deviceId | studyRoomId>",
  "startAt": "2026-06-22T09:00:00.000Z",
  "endAt":   "2026-06-29T09:00:00.000Z",
  "message": "(optional) reason, floats entry to top of staff review queue"
}
```

**Routing logic:** BOOK → free copy available? `APPROVED` : `WAITLIST`. DEVICE tier 1–3 → available? `APPROVED` : `WAITLIST`. DEVICE tier 4–5 → available? `PENDING` (staff must approve) : `WAITLIST`. ROOM → no time overlap? `APPROVED` : `WAITLIST`.

### Waitlist

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/waitlist/me` | JWT | Own pending waitlist entries |
| `GET` | `/waitlist/:resourceType/:resourceKey` | ADMIN, STAFF | Full ordered queue for a resource |
| `POST` | `/waitlist/:id/promote` | ADMIN, STAFF | Promote entry → booking becomes `APPROVED` + gets `qrToken` |
| `POST` | `/waitlist/:id/dismiss` | ADMIN, STAFF | Dismiss entry |

**Queue order:** `hasMessage DESC, priorityScore DESC` where `priorityScore = tier × 0.6 + roleWeight × 0.4` (Lecturer weight 5, Student weight 3). Message-free queues auto-promote on a free event; any message pauses auto-promotion for staff review.

### Catalogue

All read endpoints are public (any authenticated user). Write endpoints require `ADMIN` or `LIBRARY_STAFF`.

#### Categories

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/catalogue/categories` | JWT | List categories — `?type=BOOK\|DEVICE` |
| `POST` | `/catalogue/categories` | ADMIN, STAFF | Create category |
| `PATCH` | `/catalogue/categories/:id` | ADMIN, STAFF | Rename category |
| `DELETE` | `/catalogue/categories/:id` | ADMIN, STAFF | Delete category |

#### Books

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/catalogue/books` | JWT | List titles — `?search`, `?categoryId`, `?page`, `?limit`. Response includes `_count.copies` (available) |
| `GET` | `/catalogue/books/:id` | JWT | Title + full `copies[]` array with `assetTag` and `status` |
| `POST` | `/catalogue/books` | ADMIN, STAFF | Create book title |
| `PATCH` | `/catalogue/books/:id` | ADMIN, STAFF | Update title metadata |
| `DELETE` | `/catalogue/books/:id` | ADMIN, STAFF | Delete title |
| `POST` | `/catalogue/books/:id/copies` | ADMIN, STAFF | Add physical copy `{ assetTag }` |
| `DELETE` | `/catalogue/copies/:id` | ADMIN, STAFF | Soft-retire copy (`RETIRED`); blocked if `BORROWED` |

#### Devices

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/catalogue/devices` | JWT | List devices — `?search`, `?tier`, `?categoryId`, `?status`, `?page`, `?limit` |
| `GET` | `/catalogue/devices/:id` | JWT | Single device |
| `POST` | `/catalogue/devices` | ADMIN, STAFF | Create device `{ name, assetTag, deviceTier, categoryId? }` |
| `PATCH` | `/catalogue/devices/:id` | ADMIN, STAFF | Update device |
| `DELETE` | `/catalogue/devices/:id` | ADMIN, STAFF | Delete device (blocked if `BORROWED`) |
| `PATCH` | `/catalogue/devices/:id/maintenance` | ADMIN, STAFF | `{ underMaintenance: true\|false }` |

#### Study Rooms

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/catalogue/rooms` | JWT | List rooms. Pass `?startAt` + `?endAt` (ISO 8601) to add `available` flag per room |
| `GET` | `/catalogue/rooms/:id` | JWT | Single room |
| `POST` | `/catalogue/rooms` | ADMIN, STAFF | Create room `{ name, capacity, features?, roomQr }` |
| `PATCH` | `/catalogue/rooms/:id` | ADMIN, STAFF | Update room |
| `DELETE` | `/catalogue/rooms/:id` | ADMIN, STAFF | Delete room |
| `PATCH` | `/catalogue/rooms/:id/maintenance` | ADMIN, STAFF | `{ underMaintenance: true\|false }` |

### Points

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/points/me` | JWT | Own point-event history — `?page`, `?limit`. Returns `{ data, total, page, limit }` |
| `GET` | `/points/:userId` | ADMIN, STAFF | Any user's point-event history |

Each `PointEvent` record: `{ id, userId, action, delta, balanceAfter, metadata, createdAt }`.

### Scan (QR-driven physical workflow)

All scan endpoints require **JSON body** with an `Authorization` header.

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/scan/checkout` | ADMIN, STAFF | Bind an asset to an approved booking. Body: `{ bookingQr, assetTag }`. Creates `Borrowing`, marks item `BORROWED` and booking `COMPLETED`. Awards `+10` if the booking came from the waitlist. |
| `POST` | `/scan/room-checkin` | JWT | User scans door QR for their own active room booking. Body: `{ roomQr }`. Marks booking `COMPLETED`, awards `+20` pts. |
| `POST` | `/scan/return` | ADMIN, STAFF | Staff scans asset tag on return. Body: `{ assetTag, condition: "GOOD"\|"DAMAGED" }`. Scores return points, frees item, triggers waitlist promotion. Damaged device gets an additional `−300` on top of any timing penalty. |

**Book return scoring:** `> 2 days early → +50`; `≤ 0 days late → +25`; `1 day late → −10`; `2–7 days late → −20 × days`; `> 7 days late → −220`.

**Device return scoring (GOOD condition):** `early → +40`; `on time → +30`; `1–3 days late → −80`; `> 3 days late → −160`. DAMAGED: skip positive reward, add `−300`.

### Overdue & Notifications

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/overdue/run` | ADMIN, STAFF | Manually trigger the overdue sweep. Returns `{ borrowingsProcessed, noShowsProcessed }`. |
| `GET` | `/notifications/me` | JWT | Own notification inbox — `?page`, `?limit`, `?unreadOnly=true`. Returns `{ data, meta }` |
| `POST` | `/notifications/read-all` | JWT | Mark all unread notifications as read |

The overdue sweep handles two cases:

- **Late borrowings** — 1 day late: remind borrower. 2–7 days: set `recallFlag`, notify all LIBRARY_STAFF. > 7 days: set `BorrowingStatus.OVERDUE`, notify all ADMINs.
- **Room no-shows** — any APPROVED room booking with `endAt` in the past is cancelled and the user is charged `−150` pts.

### Reviews

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/reviews/book/:bookTitleId` | JWT | List reviews for a book title — `?page`, `?limit`. Includes `user: { id, name }` |
| `POST` | `/reviews/book/:bookTitleId` | JWT | Write a review. Body: `{ text, rating? (1–5) }`. Requires a `COMPLETED` booking for that book. One review per user per title. Awards `+15` pts. |
| `DELETE` | `/reviews/:id` | JWT (owner or ADMIN/STAFF) | Delete a review |

### Recommendations

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/recommendations/me` | LECTURER, STUDENT | Personalised book recommendations from borrowing-history tags — `?limit` (1–50, default 10). Falls back to newest unread titles for users with no history. **Redis-cached 5 min per user.** |

### Audit Log

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/audit/logs` | ADMIN | System-wide action log — `?page`, `?limit` (max 200), `?actorId`, `?action` (case-insensitive contains), `?targetType`. Returns `{ data, meta }` with `actor: { id, name, role }`. |

### Metrics

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/metrics` | Public | Prometheus exposition format (`text/plain`). Scraped by the Prometheus container. |

---

**Auth flow:**

1. Login as `admin@iit.ac.lk` with password `Password123`
2. Copy the `accessToken` from the response
3. Pass it as `Authorization: Bearer <token>` on protected routes

**Demo accounts** (seeded, password `Password123`):

| Email                | Role          |
| -------------------- | ------------- |
| `admin@iit.ac.lk`    | ADMIN         |
| `staff@iit.ac.lk`    | LIBRARY_STAFF |
| `lecturer@iit.ac.lk` | LECTURER      |
| `student@iit.ac.lk`  | STUDENT       |

### Response conventions

Every response includes an `X-Request-ID` header (UUID) that links to the corresponding line in `server/logs/events.jsonl` for tracing.

Error responses always follow:

```json
{
  "statusCode": 400,
  "timestamp": "2026-06-23T…",
  "path": "/api/…",
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": { "email": ["email must be an email"] }
}
```

`errors` is only present on validation failures and groups messages by field name. In development (`NODE_ENV != production`) a `stack` field is also included on every error.

**Limits:** JSON and URL-encoded request bodies are capped at 5 MB. Requests that do not complete within 30 seconds are aborted.

---

## API Documentation (Swagger)

Interactive OpenAPI docs are served at **`http://localhost:3000/api/docs`** whenever `NODE_ENV` is not `production`.

Every controller is annotated with `@ApiTags`, `@ApiOperation`, and `@ApiBearerAuth`, so the UI groups all routes by feature (Auth, Users, Bookings, Waitlist, Catalogue, Scan, Points, Overdue, Notifications, Reviews, Recommendations, Audit Log).

To call protected routes from the browser:

1. Open `/api/docs`.
2. `POST /auth/login` with a demo account, copy the `accessToken`.
3. Click **Authorize** (top right), paste the token, and execute any endpoint — the bearer token persists across requests.

The raw OpenAPI JSON is available at `http://localhost:3000/api/docs-json`.

---

## Caching (Redis)

Catalogue and recommendation reads are cached in Redis as a read-through layer. Mutations invalidate the relevant key patterns (`SCAN` + `DEL`), and a Redis outage degrades gracefully — the API always falls back to Postgres.

| Endpoint | TTL | Invalidated by |
| --- | --- | --- |
| `GET /catalogue/books` | 30 s | any book / copy mutation |
| `GET /catalogue/books/:id` | 60 s | book update / delete / copy change |
| `GET /catalogue/devices` | 30 s | any device mutation |
| `GET /catalogue/devices/:id` | 60 s | device update / delete |
| `GET /catalogue/rooms` (no slot filter) | 20 s | any room mutation |
| `GET /catalogue/rooms/:id` | 60 s | room update / delete |
| `GET /recommendations/me` | 5 min | natural expiry (per-user key) |

Room availability queries (`?startAt` + `?endAt`) are never cached, since they depend on live booking overlap.

---

## Observability (Prometheus + Grafana)

The API exposes Prometheus metrics at **`GET /api/metrics`** (public, so Prometheus can scrape without auth). A global interceptor records every request.

| Metric | Type | Labels |
| --- | --- | --- |
| `http_requests_total` | Counter | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` |
| `library_bookings_created_total` | Counter | `resource_type`, `status` |
| `library_active_borrowings` | Gauge | — |
| Node.js process/runtime metrics | default | — |

**Prometheus** (`http://localhost:9090`) scrapes the API every 15 s — config in `infra/prometheus.yml`.

**Grafana** (`http://localhost:3001`, login `admin` / `admin`) auto-provisions the Prometheus datasource and a **Poth Gulla — API Overview** dashboard on first start (request rate, P50/P95/P99 latency, total requests, active borrowings, error rate %, bookings by resource type). Provisioning files live in `infra/grafana/provisioning/`.

To change the Grafana password, set `GRAFANA_ADMIN_PASSWORD` in the root `.env`.

---

## Testing

The backend has Jest unit tests for every route handler plus an end-to-end smoke suite. Jest runs in ESM mode (the server is `"type": "module"`), wired up via `cross-env NODE_OPTIONS=--experimental-vm-modules`.

```bash
cd server

yarn test            # unit tests — every controller route (mocked services)
yarn test:watch      # unit tests in watch mode
yarn test:cov        # unit tests with coverage report (→ server/coverage/)
yarn test:e2e        # e2e smoke suite — boots AppModule with Prisma/Redis faked
```

- **Unit tests** (`src/**/*.spec.ts`) cover every controller: delegation, query-param parsing/clamping, ownership/forbidden logic, and not-found paths. No database required.
- **E2E smoke suite** (`test/app.e2e-spec.ts`) boots the real `AppModule` — exercising the global JWT guard (401), role guard (403), `ValidationPipe` (400), and the `/api` prefix — across the critical auth → booking → scan surface, with Prisma and Redis replaced by in-memory fakes.

---

## Tech Stack

| Package            | Stack                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `server`           | NestJS 11, Prisma 7 (`prisma-client` generator), PostgreSQL 15, Redis (ioredis), JWT, bcrypt, Swagger, prom-client |
| `admin-web-client` | React 19, Vite, Tailwind CSS v4, react-router-dom, axios                                                     |
| `client`           | Expo SDK 54, expo-router, expo-secure-store, axios                                                           |
| Observability      | Prometheus + Grafana (Docker)                                                                                |
| Testing            | Jest 30 (ESM) + Supertest                                                                                    |

**Package manager:** Yarn (all packages). Never use `npm`.

---

## Useful Commands

```bash
# Monorepo root
yarn dev                          # start everything

# server/
yarn start:dev                    # backend only (watch mode)
yarn prisma db push               # sync schema to DB
yarn tsx prisma/seed.ts           # reseed demo accounts
yarn prisma studio                # visual DB browser
yarn prisma generate              # regenerate Prisma client after schema changes
yarn build                        # compile to dist/
yarn test                         # unit tests (every route)
yarn test:e2e                     # e2e smoke suite

# admin-web-client/
yarn dev                          # Vite dev server

# client/
npx expo start                    # Expo Metro bundler
```

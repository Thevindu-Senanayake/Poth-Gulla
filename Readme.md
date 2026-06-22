# Poth Gulla — Smart Library Resource Management System

> Team: SegFault | CIPHER 2.0 | Scenario 04

A decentralized library resource management system featuring ELO-style User Point tiers, fair waitlist scoring, QR-driven check-in/checkout, and real-time availability across book copies, devices, and study rooms.

---

## Project Structure

```text
Poth Gulla/
├── server/              # NestJS API — PostgreSQL + Prisma + JWT auth
├── admin-web-client/    # React + Vite + Tailwind — staff/admin dashboard
├── client/              # React Native (Expo SDK 54) — student/lecturer mobile app
├── scripts/dev.mjs      # Dev runner: auto-starts Docker infra, launches all apps
├── docker-compose.yml   # Postgres + Redis containers
└── .env                 # Root compose variables (not committed)
```

Monorepo managed with Yarn Workspaces and Turborepo. All three apps share one `yarn dev` command.

---

## Prerequisites

| Tool           | Version | Notes                                      |
| -------------- | ------- | ------------------------------------------ |
| Docker Desktop | Latest  | WSL2 backend on Windows                    |
| Node.js        | v20+    |                                            |
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
```

**`server/.env`** (for Prisma CLI and native backend runs):

```dotenv
# Use 127.0.0.1, NOT localhost — on Windows, localhost resolves to ::1 (IPv6)
# but Docker only binds on 127.0.0.1 (IPv4).
DATABASE_URL="postgresql://admin:password123@127.0.0.1:5432/poth_gulla?schema=public"

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
| Admin Dashboard | `http://localhost:5173`               |
| Mobile (Expo)   | Scan QR code in terminal with Expo Go |

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

## Tech Stack

| Package            | Stack                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| `server`           | NestJS 11, Prisma 7 (`prisma-client` generator), PostgreSQL 15, JWT, bcrypt |
| `admin-web-client` | React 19, Vite, Tailwind CSS v4, react-router-dom, axios                    |
| `client`           | Expo SDK 54, expo-router, expo-secure-store, axios                          |

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

# admin-web-client/
yarn dev                          # Vite dev server

# client/
npx expo start                    # Expo Metro bundler
```

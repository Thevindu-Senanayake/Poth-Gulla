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

### 3. Create the database schema and seed demo accounts

Start the containers first (`yarn dev` in one terminal), then in a second terminal:

```bash
cd server
yarn prisma db push       # creates tables
yarn tsx prisma/seed.ts   # seeds 4 demo accounts
```

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

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Health check |
| `POST` | `/auth/login` | Public (409 if valid token present) | Login, returns JWT |
| `POST` | `/auth/register` | ADMIN | Create a new user account |
| `GET` | `/auth/me` | JWT | Validate token + get current user |

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

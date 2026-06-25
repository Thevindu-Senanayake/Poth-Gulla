# Poth Gulla - Smart Library Resource Management System

> Team: SegFault | CIPHER 2.0 Hackathon | Scenario 04
>
> A decentralized library resource management system featuring ELO-style User Point tiers, fair waitlist scoring, QR-driven check-in/checkout, and real-time availability across book copies, devices, and study rooms.
>
> Status: v0.4.0 - Core logic complete, React Router DOM navigation migrated, and UI layers ready.

---

## Core Features Implemented

- User Points & Tier System: Dynamic thresholds (Tier 1–5), concurrent booking limits, tier-based role weight in waitlist scoring
- Fair Waitlist: Priority score = (tier × 0.6) + (role × 0.4), auto-promotion on freed slots, staff review queue for justified entries
- QR-Driven Physical Workflow: One-time booking QR, permanent asset tags, checkout/return with condition tracking
- Resource Management: Books (copies), devices (tier-based approval), study rooms (interval-overlap detection)
- Audit Logging: System-wide event log for all bookings, point mutations, and config changes
- RBAC: Admin, Library Staff, Lecturer, Student roles with granular endpoint permissions
- Real-time Notifications: Overdue recall, booking confirmations, waitlist promotions
- System Config: Admin-editable tier thresholds, penalties, toggles; persisted in DB with audit trail

---

## Tech Stack

| Component    | Stack                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Backend API  | NestJS, Prisma 7 (PostgreSQL), JWT, Yarn                                        |
| Admin web    | React 19, Vite, TypeScript, Tailwind CSS, Yarn                                  |
| Mobile app   | React Native (Expo SDK 54), React Native Navigation, Yarn                       |
| Infra        | Docker Compose (Postgres, Redis, Prometheus, Grafana)                           |
| Testing      | Jest, Supertest (39 test files, 123 unit + 11 e2e)                              |
| CI/CD        | GitHub Actions (lint gate, test gate, change detection, signed releases)        |
| Code quality | Prettier (4-space indent, single quotes), ESLint, lint-staged, Husky pre-commit |

---

## Project Structure

```
Poth Gulla/
├── server/                  # NestJS API (v22+, PostgreSQL + Prisma 7)
│   ├── src/
│   │   ├── auth/           # JWT, RBAC, login/register/logout
│   │   ├── booking/        # Router, conflict detection, APPROVED/PENDING/WAITLIST
│   │   ├── waitlist/       # Priority scoring, auto-promotion
│   │   ├── points/         # User Points mutations, tier derivation
│   │   ├── scan/           # QR checkout/return, room check-in
│   │   ├── catalogue/      # Books, copies, devices, rooms, categories
│   │   ├── users/          # CRUD, tier-points coupling
│   │   ├── config/         # Admin-editable system config (tiers/penalties)
│   │   ├── audit/          # System-wide event log
│   │   ├── overdue/        # Daily cron for late borrowing sweep
│   │   ├── review/         # Book reviews, one-per-book guard
│   │   ├── recommendation/ # Personalised book recommendations
│   │   └── ...
│   ├── prisma/
│   │   ├── schema.prisma   # 11 models: User, Role, Booking, WaitlistEntry, etc.
│   │   └── seed.ts         # Demo data (4 users, 6 books/14 copies, 9 devices, 4 rooms)
│   ├── test/               # e2e smoke tests
│   └── Dockerfile, Dockerfile.prod
│
├── web-client/              # React + Vite admin dashboard (Node 22)
│   ├── src/
│   │   ├── screens/        # Dashboard, resource catalogue, booking management
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # useAuth, useBookings, etc.
│   │   └── api/            # Axios client with 401 force-logout
│   └── Dockerfile
│
├── client/                  # React Native (Expo SDK 54) mobile app
│   ├── app/
│   │   ├── (auth)/         # Login screen
│   │   ├── index.tsx       # Booking flow, waitlist view
│   │   └── [QR scanner]    # (in progress)
│   ├── src/
│   │   ├── api/            # Axios client with secure token storage
│   │   └── auth/           # AuthContext
│   └── app.json            # Expo config
│
├── deploy/                  # Deployment scripts (optional, currently unused)
├── infra/                   # Prometheus + Grafana provisioning
├── .github/workflows/       # CI: lint gate, test gate, signed releases, change detection
├── .husky/                  # Git hooks: pre-commit (lint-staged), commit-msg (Conventional Commits)
├── docker-compose.yml       # Postgres 15, Redis 7, Prometheus, Grafana
├── package.json             # Root Yarn workspace
└── .env                     # Compose environment (not committed)
```

---

## Prerequisites

- Node.js v22+ (Prisma 7 requirement)
- Docker Desktop (with WSL2 on Windows)
- Yarn v1.22+

---

## Quick Start

### 1. Clone & install dependencies

```bash
git clone https://github.com/Thevindu-Senanayake/Poth-Gulla.git
cd Poth\ Gulla
yarn install
```

### 2. Create environment files

**Root `.env`:**

```dotenv
POSTGRES_USER=admin
POSTGRES_PASSWORD=password123
POSTGRES_DB=poth_gulla
DOCKER_DATABASE_URL=postgresql://admin:password123@postgres:5432/poth_gulla?schema=public
DOCKER_REDIS_URL=redis://redis:6379
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
VITE_API_URL=http://localhost:3000/api
GRAFANA_ADMIN_PASSWORD=admin
```

**`server/.env`:**

```dotenv
DATABASE_URL="postgresql://admin:password123@127.0.0.1:5433/poth_gulla?schema=public"
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
```

### 3. Start all services

```bash
yarn dev
```

This starts:

- PostgreSQL on 127.0.0.1:5433
- Redis on 6379
- Prometheus on 9090
- Grafana on 3001 (admin/admin)
- API on 3000
- Admin web on 5173
- Metro bundler for mobile (scan QR with Expo Go)

### 4. Seed demo data (in a second terminal)

```bash
cd server
yarn prisma db push
yarn prisma generate
yarn tsx prisma/seed.ts
```

---

## API Quick Reference

Base URL: `http://localhost:3000/api`

### Auth

- `POST /auth/register` - Create account (ADMIN only)
- `POST /auth/login` - Login, returns JWT
- `GET /auth/me` - Validate token + get user
- `POST /auth/logout` - Acknowledge logout

### Bookings

- `POST /bookings` - Create booking (routes to APPROVED/PENDING/WAITLIST)
- `GET /bookings/me` - Own bookings
- `GET /bookings` - All bookings (ADMIN/STAFF)
- `PATCH /bookings/:id/approve` - Approve PENDING device booking
- `POST /bookings/:id/cancel` - Cancel own booking

### Waitlist

- `GET /waitlist/me` - Own waitlist entries
- `GET /waitlist/:resourceType/:resourceKey` - Full ordered queue (ADMIN/STAFF)
- `POST /waitlist/:id/promote` - Promote entry to booking

### Catalogue

- `GET /catalogue/books` - List books with availability
- `GET /catalogue/devices` - List devices
- `GET /catalogue/rooms` - List rooms + availability
- `POST /catalogue/books`, `/devices`, `/rooms` - Create (ADMIN/STAFF)

### Scan (QR Workflow)

- `POST /scan/checkout` - Bind asset to booking, set CHECKED_OUT
- `POST /scan/room-checkin` - User scans door QR, marks COMPLETED, awards +20 pts
- `POST /scan/return` - Staff scans return, applies point scoring

### Other

- `GET /points/me` - Point-event history
- `GET /recommendations/me` - Personalised book recommendations (Lecturer/Student)
- `GET /audit/logs` - System-wide audit log (ADMIN)
- `GET /config` - Runtime tier/penalty config (ADMIN)
- `GET /metrics` - Prometheus metrics

Detailed API docs: [Postman collection](server/postman_collection.json) or visit `http://localhost:3000/api/docs` (Swagger UI).

---

## Development

### Code style

- TypeScript everywhere
- Prettier (4-space indent, single quotes, `trailingComma: es5`, `printWidth: 100`)
- Conventional Commits: `type(scope): subject` (feat, fix, chore, refactor, docs, test, style, perf, ci)

### Commit discipline

Keep commits granular - one logical change per commit. Pre-commit hook enforces:

- Linting (ESLint)
- Formatting (Prettier)
- Conventional Commits format

```bash
git add .
git commit -m "feat(booking): add tier concurrency limits"
```

### Testing

```bash
cd server
yarn test                # 123 unit tests
yarn test:e2e            # 11 e2e smoke tests
yarn build               # TypeScript compilation
```

### CI/CD

Every PR runs:

- `yarn lint:ci` (lint + format-check)
- `yarn test` + `yarn test:e2e`
- `yarn build` (web-client)

Merges to `main` trigger a release workflow:

1. Verify commit is SSH-signed
2. Run all tests
3. Detect which services changed (Postgres, admin web)
4. Build, sign, attest only changed services
5. Deploy to DigitalOcean dev droplet via cosign verification

---

## Demo Accounts

Password: `Password123`

| Email              | Role          |
| ------------------ | ------------- |
| admin@iit.ac.lk    | ADMIN         |
| staff@iit.ac.lk    | LIBRARY_STAFF |
| lecturer@iit.ac.lk | LECTURER      |
| student@iit.ac.lk  | STUDENT       |

---

## Architecture & Algorithms

See [DEVELOPMENT.md](DEVELOPMENT.md) for:

- Project conventions & best practices
- Domain model (tiers, user points, scoring)
- Prisma setup (new prisma-client generator)
- Booking router & conflict detection
- Waitlist priority scoring & auto-promotion
- Point mutations & tier recalculation

See [CORE_LOGIC_IMPLEMENTATION_PLAN.md](docs/CORE_LOGIC_IMPLEMENTATION_PLAN.md) (reference) for the spec.

---

## Troubleshooting

### Prisma client not found

Ensure the new `prisma-client` generator was used:

```bash
cd server
yarn prisma generate
ls generated/prisma/
```

Should list: `client.ts`, `enums.ts`, `models.ts`, etc.

### Node version mismatch

```bash
node --version  # Should be v22+
# If not, install via:
nvm install 22
nvm use 22
```

### Database connection error (P1001)

1. Ensure Docker is running: `docker ps`
2. Check `.env` uses `127.0.0.1` (not `localhost`) for host connections
3. Verify port: `nc -zv 127.0.0.1 5433`

### Expo mobile app can't reach API

Use localtunnel to expose local API:

```bash
npx localtunnel --port 3000
# Copy https URL and set API_BASE_URL in client/src/api/client.ts
```

---

## License

AGPL-3.0 - See [LICENSE](LICENSE)

**Limits:** JSON and URL-encoded request bodies are capped at 5 MB. Requests that do not complete within 30 seconds are aborted.

---

## API Documentation (Swagger)

Interactive OpenAPI docs are served at **`http://localhost:3000/api/docs`** whenever `NODE_ENV` is not `production`.

Every controller is annotated with `@ApiTags`, `@ApiOperation`, and `@ApiBearerAuth`, so the UI groups all routes by feature (Auth, Users, Bookings, Waitlist, Catalogue, Scan, Points, Overdue, Notifications, Reviews, Recommendations, Audit Log).

To call protected routes from the browser:

1. Open `/api/docs`.
2. `POST /auth/login` with a demo account, copy the `accessToken`.
3. Click **Authorize** (top right), paste the token, and execute any endpoint - the bearer token persists across requests.

The raw OpenAPI JSON is available at `http://localhost:3000/api/docs-json`.

---

## Caching (Redis)

Catalogue and recommendation reads are cached in Redis as a read-through layer. Mutations invalidate the relevant key patterns (`SCAN` + `DEL`), and a Redis outage degrades gracefully - the API always falls back to Postgres.

| Endpoint                                | TTL   | Invalidated by                     |
| --------------------------------------- | ----- | ---------------------------------- |
| `GET /catalogue/books`                  | 30 s  | any book / copy mutation           |
| `GET /catalogue/books/:id`              | 60 s  | book update / delete / copy change |
| `GET /catalogue/devices`                | 30 s  | any device mutation                |
| `GET /catalogue/devices/:id`            | 60 s  | device update / delete             |
| `GET /catalogue/rooms` (no slot filter) | 20 s  | any room mutation                  |
| `GET /catalogue/rooms/:id`              | 60 s  | room update / delete               |
| `GET /recommendations/me`               | 5 min | natural expiry (per-user key)      |

Room availability queries (`?startAt` + `?endAt`) are never cached, since they depend on live booking overlap.

---

## Observability (Prometheus + Grafana)

The API exposes Prometheus metrics at **`GET /api/metrics`** (public, so Prometheus can scrape without auth). A global interceptor records every request.

| Metric                           | Type      | Labels                           |
| -------------------------------- | --------- | -------------------------------- |
| `http_requests_total`            | Counter   | `method`, `route`, `status_code` |
| `http_request_duration_seconds`  | Histogram | `method`, `route`, `status_code` |
| `library_bookings_created_total` | Counter   | `resource_type`, `status`        |
| `library_active_borrowings`      | Gauge     | -                                |
| Node.js process/runtime metrics  | default   | -                                |

**Prometheus** (`http://localhost:9090`) scrapes the API every 15 s - config in `infra/prometheus.yml`.

**Grafana** (`http://localhost:3001`, login `admin` / `admin`) auto-provisions the Prometheus datasource and a **Poth Gulla - API Overview** dashboard on first start (request rate, P50/P95/P99 latency, total requests, active borrowings, error rate %, bookings by resource type). Provisioning files live in `infra/grafana/provisioning/`.

To change the Grafana password, set `GRAFANA_ADMIN_PASSWORD` in the root `.env`.

---

## Testing

The backend has Jest unit tests for every route handler plus an end-to-end smoke suite. Jest runs in ESM mode (the server is `"type": "module"`), wired up via `cross-env NODE_OPTIONS=--experimental-vm-modules`.

```bash
cd server

yarn test            # unit tests - every controller route (mocked services)
yarn test:watch      # unit tests in watch mode
yarn test:cov        # unit tests with coverage report (→ server/coverage/)
yarn test:e2e        # e2e smoke suite - boots AppModule with Prisma/Redis faked
```

- **Unit tests** (`src/**/*.spec.ts`) - every controller (delegation, query parsing, ownership/forbidden, not-found) **plus core service logic**: tier utils, points (floor/tier recompute), return scoring, booking routing/limits/caps, and the SystemConfig module. No database required.
- **E2E smoke suite** (`test/app.e2e-spec.ts`) boots the real `AppModule` - JWT guard (401), role guard (403), `ValidationPipe` (400), `/api` prefix - across the auth → booking → scan surface, with Prisma and Redis faked.

### Continuous integration

- **`ci.yml`** runs the backend tests + web build on **every pull request** (and push to `main`). Make `test-and-build` a **required status check** on `main` to block merges on failure - see [`deploy/DEPLOY.md` §8](deploy/DEPLOY.md).
- **`release-deploy.yml`** runs the same tests as a **gate**: a failed test job stops the release before any image is built or deployed. It also **builds only the services that changed** since the previous tag (carrying forward the unchanged service's signed digest).

---

## Code style & pre-commit hooks

Formatting is owned by **Prettier**; lint correctness by **ESLint**. The shared Prettier config lives in [`.prettierrc.json`](.prettierrc.json):

| Option          | Value  |
| --------------- | ------ |
| `tabWidth`      | `4`    |
| `singleQuote`   | `true` |
| `trailingComma` | `es5`  |
| `printWidth`    | `100`  |

A **Husky** `pre-commit` hook runs **`lint-staged`**, which on every staged file does two steps **in order — format first, then lint**:

1. `prettier --write` — normalises formatting to the config above.
2. `eslint --fix` — applies the workspace's ESLint rules to the already-formatted file.

This ordering matters: Prettier rewrites the file, then ESLint runs on the final text, so the two never fight over the same lines (the server's ESLint config also runs Prettier as a rule via `eslint-plugin-prettier`). If ESLint reports an unfixable error the commit is aborted.

```bash
yarn format          # format the whole repo with the shared Prettier config
yarn format-check    # verify formatting without writing (CI-friendly)
yarn lint            # run ESLint across all workspaces
```

The hook is installed automatically by the root `prepare` script (`husky install`) on `yarn install`.

---

## Tech Stack

| Package       | Stack                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `server`      | NestJS 11, Prisma 7 (`prisma-client` generator), PostgreSQL 15, Redis (ioredis), JWT, bcrypt, Swagger, prom-client |
| `web-client`  | React 19, Vite, Tailwind CSS v4, react-router-dom, axios                                                           |
| `client`      | Expo SDK 54, expo-router, expo-secure-store, axios                                                                 |
| Observability | Prometheus + Grafana (Docker)                                                                                      |
| Testing       | Jest 30 (ESM) + Supertest                                                                                          |

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

# web-client/
yarn dev                          # Vite dev server

# client/
npx expo start                    # Expo Metro bundler
```

# Poth Gulla — Smart Library Resource Management System

## CIPHER 2.0 Hackathon · Team SegFault · Scenario 04

Manages shared library resources — book copies, devices, and study rooms — with real-time availability, a priority waitlist, an ELO-style User Point/tier system, QR-driven check-in/checkout, Redis caching, Prometheus metrics, and a Grafana dashboard.

---

## Ports at a glance

| Service | URL | Notes |
|---|---|---|
| NestJS API | `http://localhost:3000` | All routes under `/api` |
| Swagger UI | `http://localhost:3000/api/docs` | Disabled in `NODE_ENV=production` |
| Prometheus metrics | `http://localhost:3000/api/metrics` | Public, text/plain |
| Admin web (Vite) | `http://localhost:5173` | React + Tailwind |
| Prometheus | `http://localhost:9090` | Scrapes API every 15 s |
| Grafana | `http://localhost:3001` | admin / admin · dashboard auto-provisioned |
| PostgreSQL | `localhost:5432` | Dockerized |
| Redis | `localhost:6379` | Dockerized |

---

## Running locally

### Normal dev workflow (all-in-one)

```bash
# From repo root — starts all Docker services, then all three apps via Turbo TUI
yarn dev
```

`Ctrl+C` stops everything including Docker containers.

### First-time setup (run once after cloning or wiping the DB volume)

```bash
# With containers already up (yarn dev started them), open a second terminal:
cd server
yarn prisma db push        # create tables
yarn tsx prisma/seed.ts    # seed 4 demo accounts + sample data
```

### Individual service control

```bash
# Docker services only
docker compose up -d postgres redis prometheus grafana
docker compose stop postgres redis prometheus grafana

# Backend only (native, against Docker Postgres)
cd server && yarn start:dev

# Admin web only
cd admin-web-client && yarn dev

# Mobile
cd client && npx expo start
npx localtunnel --port 3000   # expose API for physical device
```

---

## Demo accounts (password: `Password123`)

| Role | Email |
|---|---|
| Admin | `admin@iit.ac.lk` |
| Library Staff | `staff@iit.ac.lk` |
| Lecturer | `lecturer@iit.ac.lk` |
| Student | `student@iit.ac.lk` |

---

## Auth

- **POST `/api/auth/login`** — returns `{ access_token }`. Send as `Authorization: Bearer <token>`.
- **POST `/api/auth/register`** — Admin only. New accounts start at 500 points → Tier 3.
- **GET `/api/auth/me`** — own profile.
- JWT is stateless, 7-day expiry. Logout is client-side (discard the token).

---

## Swagger / OpenAPI

Interactive API docs at **`http://localhost:3000/api/docs`** (dev only).

Click **Authorize**, paste your JWT, and try every endpoint directly from the browser. All endpoints are grouped by tag:

| Tag | Endpoints |
|---|---|
| Auth | register, login, me |
| Users | list, get, update, disable, enable |
| Bookings | create, list mine, list all, get, approve, reject, cancel |
| Waitlist | my entries, position, queue, promote, dismiss |
| Catalogue — Books | list, get, create, update, delete, add copy, retire copy |
| Catalogue — Devices | list, get, create, update, delete, maintenance toggle |
| Catalogue — Rooms | list (+ availability), get, create, update, delete, maintenance toggle |
| Catalogue — Categories | list, create, update, delete |
| Scan (QR Workflow) | checkout, room-checkin, return |
| Points | own history, user history |
| Overdue | run sweep |
| Notifications | my inbox, mark all read |
| Reviews | list by book, create, delete |
| Recommendations | personalised list |
| Audit Log | query log |

---

## Redis caching

Redis is used as a read-through cache for catalogue and recommendation endpoints.

| Endpoint | TTL | Invalidated by |
|---|---|---|
| `GET /api/catalogue/books` | 30 s | any book / copy mutation |
| `GET /api/catalogue/books/:id` | 60 s | book update / delete / copy change |
| `GET /api/catalogue/devices` | 30 s | any device mutation |
| `GET /api/catalogue/devices/:id` | 60 s | device update / delete |
| `GET /api/catalogue/rooms` (no slot filter) | 20 s | any room mutation |
| `GET /api/catalogue/rooms/:id` | 60 s | room update / delete |
| `GET /api/recommendations/me` | 5 min | natural expiry (per-user key) |

Cache misses (Redis unavailable) degrade gracefully — the API always falls back to Postgres.

---

## Prometheus metrics

Scraped at **`GET /api/metrics`** (public, `text/plain`).

| Metric | Type | Labels |
|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` |
| `library_bookings_created_total` | Counter | `resource_type`, `status` |
| `library_active_borrowings` | Gauge | — |
| Node.js process metrics | default | — |

Prometheus scrapes every **15 seconds** (configured in `infra/prometheus.yml`).

---

## Grafana dashboard

Grafana is at **`http://localhost:3001`** (admin / admin).

The **Poth Gulla — API Overview** dashboard is auto-provisioned on first start. Panels:

- HTTP request rate (req/s) per route
- HTTP P95 latency
- HTTP P50 / P99 latency
- Total requests (stat)
- Active borrowings (stat)
- Error rate % (stat)
- Bookings created by resource type

---

## API endpoint reference

### Booking routing rules

| Resource | Condition | Result |
|---|---|---|
| Book | ≥1 free copy | `APPROVED` |
| Book | all copies out | `WAITLIST` |
| Device tier 1–3 | available | `APPROVED` |
| Device tier 1–3 | unavailable | `WAITLIST` |
| Device tier 4–5 | available | `PENDING` (staff review) |
| Device tier 4–5 | unavailable | `WAITLIST` |
| Room | slot free | `APPROVED` |
| Room | slot taken | `WAITLIST` |
| Any | over tier concurrency limit | rejected |

Duration caps: book 14 days, device 7 days, room 4 hours.

### User Point events (applied at return / action time)

| Event | Δ Points |
|---|---|
| Book returned >2 days early | +50 |
| Book returned on time | +25 |
| Book 1 day late | −10 |
| Book 2–7 days late | −20 × days |
| Book >7 days late | −220 |
| Book review (once per book) | +15 |
| Device returned early, good condition | +40 |
| Device returned on time, good condition | +30 |
| Device 1–3 days late | −80 |
| Device >3 days late | −160 |
| Device returned damaged | −300 |
| Room attended (QR check-in) | +20 |
| Room cancelled <2 h before | −60 |
| Room no-show | −150 |
| Account created | +500 |
| Waitlist fulfilled & resource collected | +10 |
| Approved booking cancelled | −25 |

### Tier thresholds

| Tier | Label | Points | Books | Devices | Rooms |
|---|---|---|---|---|---|
| 1 | Restricted | 0–199 | 1 | 1 | 1 |
| 2 | Basic | 200–499 | 2 | 1 | 1 |
| 3 | Regular | 500–999 | 3 | 2 | 1 |
| 4 | Trusted | 1,000–1,999 | 4 | 3 | 2 |
| 5 | Elite | 2,000+ | 5 | 3 | 2 |

---

## QR workflow

Three QR types in the system:

| QR type | Where | Used for |
|---|---|---|
| Booking QR | Generated on approval, sent to borrower | `POST /api/scan/checkout` — staff scan to bind copy |
| Asset QR | Permanent label on each book copy / device | `POST /api/scan/checkout` + `POST /api/scan/return` |
| Room QR | Fixed on study room door | `POST /api/scan/room-checkin` — user self-scan for attendance |

---

## Environment variables

### `server/.env` (host-side Prisma CLI)

```dotenv
DATABASE_URL="postgresql://admin:password123@127.0.0.1:5432/poth_gulla?schema=public"
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
```

### Root `.env` (Docker Compose)

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

---

## Key commands

```bash
# Repo root
yarn dev                          # start everything

# server/
yarn start:dev                    # backend only (hot reload)
yarn prisma generate              # regenerate Prisma client
yarn prisma db push               # sync schema → DB
yarn tsx prisma/seed.ts           # seed demo data
yarn prisma studio                # DB browser at localhost:5555

# admin-web-client/
yarn dev --host                   # Vite dev server

# client/
npx expo start                    # Metro bundler for mobile
```

# Poth Gulla - Smart Library Resource Management System

**Team: SegFault | CIPHER 2.0 Prototype Submission**

This repository contains the functional prototype for **Poth Gulla**, a decentralized library resource management system. The prototype demonstrates core allocation algorithms, tier-based waitlist sorting logic, and an automated QR-driven physical workflow.

## 🏗️ Project Stack

The project utilizes a hybrid containerized micro-environment:

1. **Infrastructure (Docker):** PostgreSQL 15 (Database) & Redis (Cache).
2. **Backend API (Docker):** NestJS + Prisma ORM. Handles the ELO-style User Point calculations, waitlist priority scoring, and conflict detection.
3. **Admin Web Dashboard (Docker):** React + Vite + Tailwind CSS. High-density interface for staff to manage the waitlist queue and review audit logs.
4. **Student Mobile App (Native WSL):** React Native (Expo SDK 54). Features the unified booking form and physical QR scanning capabilities.

---

## ⚙️ Prerequisites

- **Docker Desktop** (Configured with WSL2 integration)
- **Node.js** (v20+)
- **Expo Go App** (Installed on a physical iOS or Android device)

---

## 🚀 Setup & Execution Guide

### Step 1: Global Environment Variables

In the **root** of the repository (alongside the `docker-compose.yml`), create a `.env` file to manage the Docker network secrets:

```env
# Database Credentials
POSTGRES_USER=admin
POSTGRES_PASSWORD=password123
POSTGRES_DB=poth_gulla

# Docker Internal Network URLs (Used by the containers)
DOCKER_DATABASE_URL="postgresql://admin:password123@postgres:5432/poth_gulla?schema=public"
DOCKER_REDIS_URL="redis://redis:6379"

# Vite Frontend Admin Target
VITE_API_URL="http://localhost:3000/api"
```

In your **`/server`** folder, create a second `.env` file for local Prisma operations:

```env
# Localhost URL (Used for Prisma migrations from your terminal)
DATABASE_URL="postgresql://admin:password123@localhost:5432/poth_gulla?schema=public"
```

---

### Step 2: Spin Up the Docker Ecosystem (DB, Cache, API, Admin)

Open a terminal in the project root and build the containers:

```bash
docker compose up --build
```

- **NestJS Backend** is now live at: `http://localhost:3000`
- **Vite Admin Web** is now live at: `http://localhost:5173`

---

### Step 3: Database Migrations (Prisma)

With the database container running, you need to push the schema tables. Open a new terminal tab, navigate to the backend, and run:

```bash
cd poth-gulla-backend
npx prisma db push
npx prisma generate
npx prisma db seed # (Optional: loads mock hackathon data)
```

---

### Step 4: The Mobile App & Network Bridge

Because the API runs inside a local Docker network, a physical iPhone cannot reach `localhost`. We use a secure tunnel to expose the API.

1. **Open the Bridge:** In a new terminal tab, run:
   ```bash
   npx localtunnel --port 3000
   ```
2. **Update Mobile App:** Copy the generated URL (e.g., `https://random.loca.lt`) and paste it as the `BASE_URL` inside `/poth-gulla-app/services/api.ts`.
3. **Start Mobile App:** In a final terminal tab, navigate to the mobile app and start Expo:
   ```bash
   cd poth-gulla-app
   npm install
   npx expo start --tunnel
   ```
4. **Test:** Open the **Expo Go** app on your phone and scan the QR code in the terminal.

---

## 🧪 Core Hackathon Logic to Test

1. **Concurrency Routing:** Attempt to book overlapping study room slots. Watch the system automatically route the secondary request to the waitlist queue.
2. **Waitlist Priority Math:** Notice how users with higher tiers (calculated via `user_points`) dynamically float to the top of the queue.
3. **QR Mutations:** Use the mobile camera to scan a book QR code. Watch the resource state update instantly on the Admin Dashboard and re-calculate the user's point standing.

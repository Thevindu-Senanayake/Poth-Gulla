#!/bin/sh
# Production entrypoint for the API container.
#   1. run pending migrations (prisma migrate deploy - safe / forward-only)
#   2. run the idempotent seed (all upserts; safe on every deploy)
#   3. start the compiled server
# DATABASE_URL must point at the in-network Postgres (set by the deploy compose).
set -e

echo "[entrypoint] Running database migrations…"
yarn prisma migrate deploy

echo "[entrypoint] Seeding (idempotent upserts)…"
if yarn tsx prisma/seed.ts; then
    echo "[entrypoint] Seed complete."
else
    echo "[entrypoint] WARNING: seed failed; starting API anyway." >&2
fi

echo "[entrypoint] Starting API…"
exec node dist/src/main.js

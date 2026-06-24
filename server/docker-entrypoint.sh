#!/bin/sh
# Production entrypoint for the API container.
#   1. apply the schema (prototype workflow — no migration files yet)
#   2. run the idempotent seed (all upserts; safe on every deploy)
#   3. start the compiled server
# DATABASE_URL must point at the in-network Postgres (set by the deploy compose).
set -e

echo "[entrypoint] Applying schema with 'prisma db push'…"
# Prisma 7's `db push` dropped --skip-generate; it only takes
# --config/--schema/--url/--accept-data-loss/--force-reset.
yarn prisma db push --accept-data-loss

echo "[entrypoint] Seeding (idempotent upserts)…"
if yarn tsx prisma/seed.ts; then
    echo "[entrypoint] Seed complete."
else
    echo "[entrypoint] WARNING: seed failed; starting API anyway." >&2
fi

# nest build emits dist/src/main.js (the project compiles prisma.config.ts too,
# which widens the out tree); the compiled Prisma client lands at dist/generated.
echo "[entrypoint] Starting API…"
exec node dist/src/main.js

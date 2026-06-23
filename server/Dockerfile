# Node 22+ is required: Prisma 7 pulls in deps (e.g. @prisma/streams-local)
# that declare "engines.node": ">=22". node:20 fails `yarn install`.
FROM node:22-alpine

WORKDIR /app

# Yarn is the source of truth. Do not use npm here.
# Note: this is a Yarn-workspaces repo, so the authoritative lockfile lives at
# the monorepo root; the per-package server/yarn.lock drifts from package.json.
# A plain install (not --frozen-lockfile) resolves deps correctly for this dev image.
COPY package.json yarn.lock ./
RUN yarn install

# Source and the generated Prisma client are provided at runtime:
#   - docker-compose bind-mounts ./server into /app for hot reload
#   - the start command regenerates the client into /app/generated,
#     which is protected by an anonymous volume so the bind mount can't shadow it
CMD ["sh", "-c", "yarn prisma generate && yarn start:dev"]

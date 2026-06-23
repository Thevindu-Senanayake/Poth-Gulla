FROM node:22-alpine

WORKDIR /app

# Yarn is the source of truth. Plain install (not --frozen-lockfile): this is a
# Yarn-workspaces repo, so the per-package lockfile drifts from the monorepo root.
COPY package.json ./
RUN yarn install

EXPOSE 5173
# --host (0.0.0.0) is required for Vite to be reachable from outside the container.
CMD ["yarn", "dev", "--host"]

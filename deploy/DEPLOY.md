# Deployment — DigitalOcean dev droplet

CI/CD: **GitHub Actions → GHCR (signed images) → droplet pull**. Pushing a
**SSH-signed** tag `vX.Y.Z` builds production images, signs them with **cosign
(keyless)**, attaches **SLSA provenance + SBOM** attestations, then SSHes to the
droplet, **verifies the signatures (fail-closed)**, and brings up the full stack.

Pipeline: [`.github/workflows/release-deploy.yml`](../.github/workflows/release-deploy.yml)

---

## 1. One-time droplet setup

Fresh Ubuntu 22.04/24.04 droplet (amd64). From your machine:

```bash
ssh root@DROPLET_IP 'bash -s' < deploy/provision.sh
```

This installs Docker + compose, **cosign**, creates a non-root `deploy` user,
enables `ufw` (22/80/3000/3001/9090) and `fail2ban`, and creates `~/poth-gulla`.

Then:

1. Add the CI deploy **public** key to `/home/deploy/.ssh/authorized_keys`.
2. Harden `sshd` — `PermitRootLogin no`, `PasswordAuthentication no`, then
   `systemctl restart ssh`.

---

## 2. SSH key for CI → droplet

Generate a dedicated deploy keypair (no passphrase):

```bash
ssh-keygen -t ed25519 -f do_deploy -C "gha-deploy" -N ""
# public  -> /home/deploy/.ssh/authorized_keys on the droplet
# private -> GitHub secret DROPLET_SSH_KEY
```

---

## 3. Tag signing with an SSH key

Releases must be **SSH-signed** annotated tags. Configure once locally:

```bash
ssh-keygen -t ed25519 -f tag_signing -C "you@example.com" -N ""   # or reuse an existing key
git config gpg.format ssh
git config user.signingkey "$(pwd)/tag_signing.pub"
```

- Put the **public** key (`tag_signing.pub` contents) in secret `TAG_SIGNING_SSH_PUBLIC_KEY`.
- Put the signer identity (the tagger email you'll use) in variable `TAG_SIGNER_IDENTITY`.

CI runs `git verify-tag` against an `allowed_signers` built from those two — an
unsigned or wrong-key tag **fails the pipeline** before anything is built.

---

## 4. GitHub configuration

### Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | What |
|---|---|
| `DROPLET_HOST` | droplet IP |
| `DROPLET_USER` | `deploy` |
| `DROPLET_SSH_KEY` | private deploy key (full PEM) |
| `GHCR_PULL_TOKEN` | PAT with **read:packages** (droplet pulls private images) |
| `TAG_SIGNING_SSH_PUBLIC_KEY` | the SSH **public** key allowed to sign tags |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | DB credentials |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password |

### Variables

| Variable | What |
|---|---|
| `VITE_API_URL` | `http://DROPLET_IP:3000/api` (baked into the web image at build) |
| `TAG_SIGNER_IDENTITY` | tagger email used when signing (must match the tag) |

### Environment

Create an Environment named **`dev`** (the `deploy` job uses it — add required
reviewers here later if you want manual approval before a deploy).

---

## 5. Cut a release

```bash
git tag -s v0.1.0 -m "v0.1.0"     # -s uses the SSH signing key configured above
git push origin v0.1.0
```

Watch **Actions → release-deploy**. On success:

| Service | URL |
|---|---|
| Web client | `http://DROPLET_IP/` |
| API | `http://DROPLET_IP:3000/api` |
| Swagger | `http://DROPLET_IP:3000/api/docs` |
| Grafana | `http://DROPLET_IP:3001` |
| Prometheus | `http://DROPLET_IP:9090` |

The DB schema is applied (`prisma db push`) and the idempotent seed runs on every
deploy (demo accounts, password `Password123`).

---

## 6. Rollback

Deploys are pinned to an immutable image **digest** per tag. To roll back, re-run
the `release-deploy` workflow for an older tag (Actions → select the previous
tag's run → *Re-run all jobs*), or push a new tag built from the older commit.

---

## 7. Security model

- **Signed artifacts** — every image is cosign-signed (keyless, logged to Rekor);
  the droplet runs `cosign verify` and refuses anything not signed by this repo's
  `release-deploy.yml` workflow identity.
- **Signed releases** — the git tag itself must be SSH-signed by an allowed key.
- **Provenance + SBOM** — each image carries a SLSA build-provenance attestation
  and an SPDX SBOM, both verifiable from the registry.
- **Immutable deploys** — images are deployed by `@sha256:` digest, never a
  mutable tag.
- **Least privilege** — `GITHUB_TOKEN` is scoped per job; OIDC (`id-token`) only
  in the build job; the droplet pulls with a read-only PAT.
- **Host** — non-root `deploy` user, key-only SSH, `ufw`, `fail2ban`.

### Hardening TODO (before treating this as production)
- Pin every `uses:` in the workflow to a full commit SHA.
- Add TLS (a Caddy/Traefik reverse proxy + a domain) instead of plain HTTP.
- Don't publish Postgres/Redis/Prometheus to the host; put Grafana behind auth/proxy.
- Set `NODE_ENV=production` on the API (disables Swagger) for a non-dev environment.

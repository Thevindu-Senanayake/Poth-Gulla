# Release Process - Poth Gulla

This document describes how to cut a release and deploy to production.

---

## Versioning Scheme

Follow Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR** - Breaking API changes, major feature additions (e.g. v0 → v1)
- **MINOR** - New features, backward-compatible (e.g. v0.2 → v0.3)
- **PATCH** - Bug fixes, hotfixes, no new features (e.g. v0.2.3 → v0.2.4)

Current version: **v0.2.5** (see `package.json`)

---

## Pre-Release Checklist

1. **All tests pass** - Run locally and verify GitHub Actions CI is green:

   ```bash
   yarn lint:ci
   yarn test
   yarn test:e2e
   cd web-client && yarn build
   ```

2. **Code review complete** - All PRs targeting `main` are merged

3. **Documentation updated** - DEVELOPMENT.md section 2, README.md, any architecture docs

4. **Decide version bump:**
   - Patch fix (v0.2.3 → v0.2.4) - typo, small bug, docs
   - Minor feature (v0.2.3 → v0.3.0) - new feature, backward-compatible
   - Major (v0.2.3 → v1.0.0) - breaking changes

5. **Update `package.json` version** in the root (if not automated)

---

## Cut a Release (3 Steps)

### Step 1: Create and sign the tag

```bash
git tag -s vX.Y.Z -m "Release vX.Y.Z"
```

Example:

```bash
git tag -s v0.2.4 -m "Release v0.2.4: fix tier config loading bug"
```

**Flags explained:**

- `-s` - Sign the tag with your GPG key (required for CI/CD gate; the release workflow verifies the signature)
- `-m` - Tag message (optional; describes what's in the release)

**Verify the tag was created:**

```bash
git tag -v v0.2.4
```

Should show your GPG key signature.

### Step 2: Push the tag to GitHub

```bash
git push origin v0.2.4
```

This triggers the `.github/workflows/release-deploy.yml` workflow automatically.

### Step 3: Monitor the release workflow

Go to: [GitHub Actions - Release & Deploy](../../actions/workflows/release-deploy.yml)

The workflow will:

1. **Verify the tag signature** - Confirms the tag is signed with a trusted key; fails if unsigned or invalid
2. **Run all tests** - `yarn lint:ci`, `yarn test`, `yarn test:e2e`
3. **Build all services** - Compile NestJS, web-client, and Docker images
4. **Detect changes** - Compare this tag against the previous tag; identify which services changed (e.g. only `server` and `web-client`)
5. **Build images** - Create Docker images only for changed services; tag as `vX.Y.Z`
6. **Sign attestations** - Use cosign to sign the images with COSIGN_SIGNING_KEY
7. **Deploy to dev** - Push signed images to the DigitalOcean dev droplet; verify signatures before running

---

## Commit Message Format for Release Commits

When committing changes before a release, use **Conventional Commits**:

```
<type>(scope): <subject>

[optional body]
[optional footer]
```

**Valid types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`, `ci`

**Examples:**

```bash
git commit -m "fix(booking): handle missing tier in concurrency check"
git commit -m "feat(config): add dynamic tier threshold support"
git commit -m "docs(readme): update API reference with new endpoints"
git commit -m "chore(deps): upgrade Prisma to 7.0.1"
```

The pre-commit hook will reject commits that don't match this format.

---

## Release Examples

### Example: Patch Release (v0.2.3 → v0.2.4)

Scenario: A user reports a bug in the tier configuration loader.

1. Create and merge a PR: `fix(config): correct default tier thresholds`
2. Tag the release:
   ```bash
   git tag -s v0.2.4 -m "Release v0.2.4: fix tier config loading bug"
   ```
3. Push:
   ```bash
   git push origin v0.2.4
   ```
4. Monitor the GitHub Actions workflow

### Example: Minor Release (v0.2.3 → v0.3.0)

Scenario: New waitlist auto-promotion feature.

1. Merge feature PRs with commits like:
   - `feat(waitlist): implement auto-promotion on freed slots`
   - `docs(readme): document waitlist auto-promotion behavior`
2. Update `package.json` version to `0.3.0`
3. Update DEVELOPMENT.md and README.md as needed
4. Tag:
   ```bash
   git tag -s v0.3.0 -m "Release v0.3.0: auto-promote waitlist entries"
   ```
5. Push:
   ```bash
   git push origin v0.3.0
   ```

### Example: Major Release (v0.2.3 → v1.0.0)

Scenario: First production release with all features complete.

1. Merge all remaining features
2. Update `package.json` to `1.0.0`
3. Update DEVELOPMENT.md, README.md, docs
4. Create a `RELEASE_NOTES.md` summarizing major features, breaking changes (if any)
5. Tag:
   ```bash
   git tag -s v1.0.0 -m "Release v1.0.0: initial production release"
   ```
6. Push:
   ```bash
   git push origin v1.0.0
   ```

---

## Automated Workflow Behavior

The release workflow (`.github/workflows/release-deploy.yml`) performs these checks:

### 1. Tag Signature Verification

```yaml
- name: Verify tag signature
  run: git verify-tag ${{ github.ref_name }}
```

This ensures the tag is signed with a trusted GPG key. Fails if unsigned.

### 2. Change Detection

Compares the current tag against the previous tag to determine which services changed:

```bash
git diff v0.2.3..v0.2.4 -- server/ web-client/ client/
```

Only services with diffs are built and deployed.

### 3. Docker Image Build & Sign

For each changed service (backend, admin, mobile):

```bash
docker build -t poth-gulla-api:v0.2.4 ./server
cosign sign --key $COSIGN_SIGNING_KEY poth-gulla-api:v0.2.4
```

### 4. Deployment & Signature Verification

On the target (dev droplet or prod), verify the image signature before running:

```bash
cosign verify --key $COSIGN_VERIFICATION_KEY poth-gulla-api:v0.2.4
docker run --rm poth-gulla-api:v0.2.4
```

---

## Troubleshooting Releases

### Release workflow fails on signature verification

**Error:** `error: gpg failed to sign the data`

**Fix:** Ensure your GPG key is set as the default signing key:

```bash
git config --global user.signingkey <YOUR_GPG_KEY_ID>
git config --global commit.gpgsign true
```

Verify the key exists:

```bash
gpg --list-secret-keys --keyid-format long
```

### Tag already exists

**Error:** `fatal: tag 'v0.2.4' already exists`

**Fix:** Delete and recreate the tag:

```bash
git tag -d v0.2.4
git push origin :v0.2.4  # delete remote tag
git tag -s v0.2.4 -m "Release v0.2.4"
git push origin v0.2.4
```

### Workflow does not start

Ensure the tag is on a commit that exists in the GitHub repository. If you created the tag locally but haven't pushed it yet:

```bash
git push origin v0.2.4
```

### Build fails in CI

Check the GitHub Actions logs. Common causes:

- Node version mismatch (should be v22+) - fix in `.github/workflows/release-deploy.yml`
- Missing environment variables (JWT_SECRET, etc.) - ensure secrets are set in GitHub Settings → Secrets and Variables
- Database/tests require a live connection - some e2e tests are skipped in CI; verify they're marked as `skip` or use mock databases

---

## Rollback

If a released version has a critical bug:

1. Create a `hotfix/` branch from the problematic tag:
   ```bash
   git checkout -b hotfix/v0.2.4 v0.2.4
   ```
2. Fix the bug with commits like `fix(scope): issue description`
3. Increment the patch version and tag: `v0.2.5`
4. Push and release as normal

---

## Access & Secrets

To release, you need:

- **Write access** to the repository (push tags to `origin`)
- **GPG key** registered on GitHub (for signing tags)
- **GitHub Actions secrets** configured for deployment (if deploying to cloud):
  - `COSIGN_SIGNING_KEY` - Private key for signing Docker images
  - `COSIGN_VERIFICATION_KEY` - Public key for verifying images
  - Cloud deployment credentials (SSH key, API token, etc.)

Ask a maintainer if you don't have these.

---

## See Also

- [DEVELOPMENT.md](DEVELOPMENT.md) - Project conventions, commit discipline
- [.github/workflows/release-deploy.yml](.github/workflows/release-deploy.yml) - Full release workflow definition
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message format standard

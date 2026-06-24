#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu 22.04/24.04 DigitalOcean droplet.
# Run as root:  ssh root@DROPLET 'bash -s' < deploy/provision.sh
#
# Sets up: a non-root `deploy` user, Docker + compose plugin, cosign (for image
# signature verification), a firewall, fail2ban, and the app directory.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="/home/${DEPLOY_USER}/poth-gulla"

echo "==> Updating apt and installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban

echo "==> Installing Docker Engine + compose plugin"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Installing cosign (image signature verification)"
COSIGN_VERSION="v2.4.1"
curl -fsSL -o /usr/local/bin/cosign \
  "https://github.com/sigstore/cosign/releases/download/${COSIGN_VERSION}/cosign-linux-amd64"
chmod +x /usr/local/bin/cosign

echo "==> Creating ${DEPLOY_USER} user"
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"
mkdir -p "${APP_DIR}" "/home/${DEPLOY_USER}/.ssh"
chmod 700 "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}"

echo "==> Firewall (ufw): allow SSH + app ports"
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # web client
ufw allow 3000/tcp   # API
ufw allow 3001/tcp   # Grafana
ufw allow 9090/tcp   # Prometheus
ufw --force enable

echo "==> Enabling fail2ban"
systemctl enable --now fail2ban

cat <<EOF

==> Done.

Next steps:
  1. Add the CI deploy public key to:
       /home/${DEPLOY_USER}/.ssh/authorized_keys
  2. Harden sshd (recommended): disable root login + password auth in
       /etc/ssh/sshd_config  (PermitRootLogin no, PasswordAuthentication no)
       then: systemctl restart ssh
  3. Set the matching GitHub Secrets/Variables (see deploy/DEPLOY.md) and push a
     signed tag (e.g. git tag -s v0.1.0 && git push origin v0.1.0).

App directory: ${APP_DIR}
EOF

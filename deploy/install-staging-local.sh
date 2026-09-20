#!/usr/bin/env bash
set -euo pipefail

app_root='/opt/spm-frontend-staging'
runner_user="${RUNNER_USER:-$(id -un)}"
staging_hostname="${STAGING_HOSTNAME:-}"

if [[ -z "$staging_hostname" || "$staging_hostname" =~ [/:[:space:]] ]]; then
  echo 'Set STAGING_HOSTNAME to the DNS hostname that points to this staging tunnel.' >&2
  echo 'Example: STAGING_HOSTNAME=staging.example.com bash deploy/install-staging-local.sh' >&2
  exit 64
fi

sudo apt-get update
sudo apt-get install -y nginx rsync curl

if ! getent group spm >/dev/null; then
  sudo groupadd --system spm
fi

if ! id -u spm >/dev/null 2>&1; then
  sudo useradd --system --gid spm --home-dir /opt/spm-frontend --shell /usr/sbin/nologin spm
fi

sudo install -d -o root -g spm -m 0755 \
  "$app_root" \
  "$app_root/releases"
sudo install -d -o spm -g spm -m 0750 \
  "$app_root/shared" \
  "$app_root/shared/data"
sudo install -d -m 0755 /etc/spm-frontend

sudo install -m 0644 deploy/systemd/spm-staging-backend.service \
  /etc/systemd/system/spm-staging-backend.service
sudo install -m 0644 deploy/nginx/spm-staging.conf \
  /etc/nginx/sites-available/spm-staging.conf
sudo install -m 0755 deploy/bin/spm-staging-deploy \
  /usr/local/sbin/spm-staging-deploy
sudo ln -sfn /etc/nginx/sites-available/spm-staging.conf \
  /etc/nginx/sites-enabled/spm-staging.conf

if [[ ! -f /etc/spm-frontend/staging.env ]]; then
  printf 'BACKEND_CORS_ORIGIN=https://%s\n' "$staging_hostname" \
    | sudo tee /etc/spm-frontend/staging.env >/dev/null
  sudo chmod 0640 /etc/spm-frontend/staging.env
  sudo chown root:spm /etc/spm-frontend/staging.env
else
  echo 'Preserving existing /etc/spm-frontend/staging.env'
fi

printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/spm-staging-deploy *\n' "$runner_user" \
  | sudo tee /etc/sudoers.d/spm-staging-deploy >/dev/null
sudo chmod 0440 /etc/sudoers.d/spm-staging-deploy
sudo visudo -cf /etc/sudoers.d/spm-staging-deploy

sudo systemctl daemon-reload
sudo systemctl enable nginx spm-staging-backend
sudo nginx -t
sudo systemctl reload-or-restart nginx

echo "Staging prerequisites installed for runner user: $runner_user"
echo "Staging hostname: https://$staging_hostname"
echo 'The first GitHub Actions push to staging will create the current release and start spm-staging-backend.'

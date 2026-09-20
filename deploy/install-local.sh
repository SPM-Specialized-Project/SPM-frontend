#!/usr/bin/env bash
set -euo pipefail

app_root='/opt/spm-frontend'
runner_user="${RUNNER_USER:-$(id -un)}"

sudo apt-get update
sudo apt-get install -y nginx rsync curl

if ! getent group spm >/dev/null; then
  sudo groupadd --system spm
fi

if ! id -u spm >/dev/null 2>&1; then
  sudo useradd --system --gid spm --home-dir "$app_root" --shell /usr/sbin/nologin spm
fi

sudo install -d -o root -g spm -m 0755 \
  "$app_root" \
  "$app_root/releases"
sudo install -d -o spm -g spm -m 0750 \
  "$app_root/shared" \
  "$app_root/shared/data"

sudo install -m 0644 deploy/systemd/spm-backend.service \
  /etc/systemd/system/spm-backend.service
sudo install -m 0644 deploy/nginx/spm.conf \
  /etc/nginx/sites-available/spm.conf
sudo install -m 0755 deploy/bin/spm-deploy \
  /usr/local/sbin/spm-deploy
sudo ln -sfn /etc/nginx/sites-available/spm.conf \
  /etc/nginx/sites-enabled/spm.conf

printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/spm-deploy *\n' "$runner_user" \
  | sudo tee /etc/sudoers.d/spm-deploy >/dev/null
sudo chmod 0440 /etc/sudoers.d/spm-deploy
sudo visudo -cf /etc/sudoers.d/spm-deploy

sudo systemctl daemon-reload
sudo systemctl enable nginx spm-backend
sudo nginx -t

if [[ -e /etc/nginx/sites-enabled/default ]]; then
  echo 'WARNING: /etc/nginx/sites-enabled/default is still enabled.'
  echo 'Disable it if it owns the default port 80 server before the first deploy.'
fi

echo "Local deploy prerequisites installed for runner user: $runner_user"

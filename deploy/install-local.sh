#!/usr/bin/env bash
set -euo pipefail

app_root='/opt/spm-frontend'
runner_user="${RUNNER_USER:-$(id -un)}"

sudo apt-get update
sudo apt-get install -y nginx rsync curl

if ! command -v cloudflared >/dev/null 2>&1; then
  echo 'cloudflared is required for the production Quick Tunnel.' >&2
  echo 'Install cloudflared on Debian before running this script.' >&2
  exit 69
fi

cloudflared_path="$(command -v cloudflared)"

# Older deployments started this service with systemd-run, which leaves a
# transient unit in /run/systemd/transient. Stop that legacy unit before
# installing the persistent unit with the same name.
quick_tunnel_unit='spm-quick-tunnel.service'
quick_tunnel_fragment="$(sudo systemctl show -p FragmentPath --value "$quick_tunnel_unit" 2>/dev/null || true)"
if [[ "$quick_tunnel_fragment" == /run/systemd/transient/* ]]; then
  sudo systemctl stop "$quick_tunnel_unit" 2>/dev/null || true
  sudo systemctl reset-failed "$quick_tunnel_unit" 2>/dev/null || true
fi

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
sed "s|__CLOUDFLARED_PATH__|$cloudflared_path|g" \
  deploy/systemd/spm-quick-tunnel.service \
  | sudo tee /etc/systemd/system/spm-quick-tunnel.service >/dev/null
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

systemctl_path="$(command -v systemctl)"
journalctl_path="$(command -v journalctl)"
sudo tee /etc/sudoers.d/spm-quick-tunnel >/dev/null <<EOF
$runner_user ALL=(root) NOPASSWD: $systemctl_path restart spm-quick-tunnel.service
$runner_user ALL=(root) NOPASSWD: $systemctl_path status spm-quick-tunnel.service
$runner_user ALL=(root) NOPASSWD: $journalctl_path -u spm-quick-tunnel.service *
EOF
sudo chmod 0440 /etc/sudoers.d/spm-quick-tunnel
sudo visudo -cf /etc/sudoers.d/spm-quick-tunnel

sudo systemctl daemon-reload
sudo systemctl enable nginx spm-backend spm-quick-tunnel.service
sudo nginx -t
sudo systemctl start nginx

if [[ -e /etc/nginx/sites-enabled/default ]]; then
  echo 'WARNING: /etc/nginx/sites-enabled/default is still enabled.'
  echo 'Disable it if it owns the default port 80 server before the first deploy.'
fi

echo "Local deploy prerequisites installed for runner user: $runner_user"

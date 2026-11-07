#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd "$(dirname "$0")" && pwd)"
install_root='/opt/spm-observability'
secrets_root='/etc/spm-observability'
env_file="$secrets_root/grafana.env"

sudo install -d -m 0755 "$install_root" "$install_root/loki" \
  "$install_root/grafana/provisioning/datasources" "$install_root/alloy"
sudo install -d -m 0700 "$secrets_root"
sudo install -m 0644 "$source_root/compose.yml" "$install_root/compose.yml"
sudo install -m 0644 "$source_root/compose.host.yml" "$install_root/compose.host.yml"
sudo install -m 0644 "$source_root/local-nginx.conf" "$install_root/local-nginx.conf"
sudo install -m 0644 "$source_root/nginx-observability-defaults.conf" \
  "$install_root/nginx-observability-defaults.conf"
sudo install -m 0644 "$source_root/loki/config.yml" "$install_root/loki/config.yml"
sudo install -m 0644 "$source_root/grafana/provisioning/datasources/loki.yml" \
  "$install_root/grafana/provisioning/datasources/loki.yml"
sudo install -m 0644 "$source_root/alloy/config.alloy" "$install_root/alloy/config.alloy"

if ! sudo test -f "$env_file"; then
  grafana_password="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  printf '%s\n' \
    'GRAFANA_ADMIN_USER=admin' \
    "GRAFANA_ADMIN_PASSWORD=$grafana_password" \
    'GRAFANA_ROOT_URL=%(protocol)s://%(domain)s/observation/grafana/' \
    'OBSERVABILITY_VOLUME_PREFIX=spm-observability' \
    | sudo tee "$env_file" >/dev/null
  unset grafana_password
  sudo chown root:root "$env_file"
  sudo chmod 0600 "$env_file"
fi

if sudo grep -q '^GRAFANA_HOST_PORT=' "$env_file"; then
  sudo sed -i '/^GRAFANA_HOST_PORT=/d' "$env_file"
  sudo chmod 0600 "$env_file"
fi

sudo docker compose \
  --project-name spm-observability \
  --env-file "$env_file" \
  --file "$install_root/compose.yml" \
  --file "$install_root/compose.host.yml" \
  --profile host-logs up --detach

grafana_health_url='http://127.0.0.1:3101/api/health'
grafana_deadline=$((SECONDS + 120))
until curl --fail --silent --max-time 2 "$grafana_health_url" >/dev/null; do
  if (( SECONDS >= grafana_deadline )); then
    echo "Grafana did not become healthy within 120 seconds at $grafana_health_url." >&2
    sudo docker compose \
      --project-name spm-observability \
      --env-file "$env_file" \
      --file "$install_root/compose.yml" \
      --file "$install_root/compose.host.yml" \
      --profile host-logs ps --all >&2 || true
    exit 1
  fi
  sleep 2
done

echo 'Local Grafana/Loki services are installed. Grafana is only published on loopback port 3101.'

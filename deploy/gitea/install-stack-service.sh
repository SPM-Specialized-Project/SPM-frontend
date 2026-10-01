#!/usr/bin/env bash
set -euo pipefail

compose_root="${GITEA_COMPOSE_ROOT:-/srv/git-platform}"
compose_file="$compose_root/compose.yml"

if [[ ! -f "$compose_file" ]]; then
  echo "Missing Gitea Compose file: $compose_file" >&2
  echo 'Create /srv/git-platform/compose.yml first; this script does not overwrite it.' >&2
  exit 2
fi

docker_path="$(command -v docker || true)"
if [[ -z "$docker_path" ]]; then
  echo 'Docker is required but was not found in PATH.' >&2
  exit 69
fi

sudo "$docker_path" compose -f "$compose_file" config >/dev/null

sed \
  -e "s|__GITEA_COMPOSE_ROOT__|$compose_root|g" \
  -e "s|__DOCKER_PATH__|$docker_path|g" \
  deploy/systemd/gitea-stack.service.example \
  | sudo tee /etc/systemd/system/gitea-stack.service >/dev/null

sudo chmod 0644 /etc/systemd/system/gitea-stack.service
sudo systemctl daemon-reload
sudo systemctl enable gitea-stack.service
sudo systemctl restart gitea-stack.service

echo 'Gitea Compose stack is installed and enabled.'
sudo systemctl --no-pager --full status gitea-stack.service

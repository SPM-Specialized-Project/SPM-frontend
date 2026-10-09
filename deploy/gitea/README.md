# Gitea on the Debian runner

This example runs rootless Gitea with PostgreSQL and exposes only the local
HTTP origin used by the host Nginx:

- Gitea HTTP: `127.0.0.1:8211` -> container port `3000`
- Gitea SSH: runner port `2222` -> container port `2222`
- PostgreSQL and Redis: Docker-internal only
- No Caddy container: Nginx is the only reverse proxy

## Install or recreate the stack

On the persistent Debian runner:

```bash
sudo install -d -m 0750 /srv/git-platform
cd /srv/git-platform
sudo cp /path/to/SPM-frontend/deploy/gitea/compose.yml.example compose.yml
sudoedit .env
chmod 600 .env
docker compose -f compose.yml config
docker compose -f compose.yml up -d
```

The `.env` file must contain:

```env
GITEA_VERSION=1.27.3-rootless
PUBLIC_HOST=git.example.com
POSTGRES_PASSWORD=replace-with-a-long-random-password
```

`PUBLIC_HOST` must be the stable public hostname used in Gitea's canonical
URL. A random Quick Tunnel URL changes after restart, so it is suitable for a
temporary alias but not for a durable clone URL. Do not append the local
origin port `:8080` or `:8211` to a `trycloudflare.com` URL.

The host Nginx configuration in `deploy/nginx/spm.conf` and
`deploy/nginx/spm-staging.conf` proxies `/git/` to `127.0.0.1:8211`.

## Start automatically after a runner reset

The containers have `restart: unless-stopped`, but install a host systemd unit
as well so the Compose stack is explicitly brought up after Docker starts:

```bash
cd /path/to/SPM-frontend
chmod +x deploy/gitea/install-stack-service.sh
GITEA_COMPOSE_ROOT=/srv/git-platform \
  bash deploy/gitea/install-stack-service.sh

sudo systemctl is-enabled gitea-stack.service
sudo systemctl status gitea-stack.service --no-pager
docker compose -f /srv/git-platform/compose.yml ps
```

The service uses `docker compose stop` when stopped; it never removes the
containers or named volumes. The PostgreSQL data, Redis data, Gitea data and
Gitea configuration therefore survive a reboot and a service restart.

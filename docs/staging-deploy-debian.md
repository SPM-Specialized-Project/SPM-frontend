# Staging deployment on Debian 13

This is a separate staging-only deployment. It does not change the production
`main` deployment on port 80/4000.

## Runtime layout

- Nginx staging: `127.0.0.1:8080`
- Node staging backend: `127.0.0.1:4011`
- Staging data: `/opt/spm-frontend-staging/shared/data`
- Backend service: `spm-staging-backend.service`
- Public URL: `https://staging.<your-domain>`
- Public `/api/*`: proxied by Nginx to `127.0.0.1:4011`

Port `4011` is intentional. The `test-E2E` runner currently uses `4010` for
its isolated test process, so the persistent staging service does not collide
with E2E when both runners are on the same Debian host.

## One-time setup on Debian

Clone or update this repository on the Debian host, then run from the checkout:

```bash
cd /mnt/BigDisk/Tung-quan-private/SPM-frontend
git fetch origin
git checkout staging
git pull --ff-only origin staging

STAGING_HOSTNAME=staging.example.com \\
  RUNNER_USER=hutieunamvang \\
  bash deploy/install-staging-local.sh
```

The script installs the staging systemd unit, Nginx site, deploy helper and a
non-interactive sudo rule for the GitHub Actions runner. It does not copy a
tunnel credential into the repository.

## Named Cloudflare Tunnel

The hostname must be in a Cloudflare-managed domain. Replace
`staging.example.com` with the real hostname you own.

```bash
sudo cloudflared tunnel login
cloudflared tunnel create spm-staging
cloudflared tunnel list
cloudflared tunnel route dns spm-staging staging.example.com
```

Copy `deploy/cloudflared/staging-config.yml.example` to
`/etc/cloudflared/spm-staging.yml`, replace the tunnel UUID, credentials path
and hostname, then install the service:

```bash
sudo install -d -m 0755 /etc/cloudflared
sudo install -m 0600 ~/.cloudflared/<TUNNEL_UUID>.json \\
  /etc/cloudflared/<TUNNEL_UUID>.json
sudo cloudflared --config /etc/cloudflared/spm-staging.yml \\
  tunnel ingress validate
sudo cloudflared --config /etc/cloudflared/spm-staging.yml \\
  service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

If another Cloudflare service is already installed, keep one service and point
its `--config` at the staging config, or create a dedicated systemd unit. Do
not run two tunnel services that both own the same hostname.

## GitHub repository variable

In `SPM-frontend` repository settings, add a repository variable:

```text
Name:  SPM_STAGING_PUBLIC_URL
Value: https://staging.example.com
```

This is a variable, not a secret. The workflow only uses it to verify that the
hostname is reachable after the local deploy.

## Deployment behavior

Every push to `staging` runs `.github/workflows/staging-deploy.yml`:

1. Checks out the pushed staging commit.
2. Builds the frontend with `VITE_BACKEND_URL=/api`.
3. Installs an atomic release under `/opt/spm-frontend-staging`.
4. Restarts only `spm-staging-backend.service`.
5. Reloads Nginx and verifies local `/api/health` and `/` on port 8080.
6. Verifies the public staging frontend and backend health URL.

The existing `main-ci.yml` production deployment is unchanged. The existing
`staging-e2e.yml` remains separate; its isolated E2E app uses ports 3010/4010,
while this persistent staging app uses 8080/4011.

## Manual verification

```bash
sudo systemctl status spm-staging-backend --no-pager
sudo ss -ltnp | grep -E ':8080|:4011'
curl --fail http://127.0.0.1:8080/api/health
curl --fail -I http://127.0.0.1:8080/
curl --fail https://staging.example.com/api/health
curl --fail -I https://staging.example.com/
```

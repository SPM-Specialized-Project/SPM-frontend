# Cloudflare Tunnel for the Debian self-host

This repository contains an optional named-tunnel example with two hostnames:

- `https://app.example.com` -> Nginx on `127.0.0.1:80`
- `https://api.example.com` -> Node backend on `127.0.0.1:4000`

Replace both hostnames with DNS names in a Cloudflare-managed zone if you later
own a domain. Do not put the tunnel credentials in Git.

The default `main` and `staging` GitHub Actions flows do not require this named
tunnel. They use two independent Cloudflare Quick Tunnels instead:

- `main` -> Nginx on `127.0.0.1:80`
- `staging` -> Nginx on `127.0.0.1:8080`
- Gitea -> Nginx `/git/` -> `127.0.0.1:8211`

Quick Tunnel links are random `trycloudflare.com` URLs and can change when a
tunnel restarts. They are for staging/testing, not stable production hosting.
The public URL is HTTPS; do not append the origin port (`:80`, `:8080`, or
`:8211`) to it. The Gitea route is `<public-url>/git/`.

The repository installs Quick Tunnels as persistent systemd services through
`deploy/install-local.sh` and `deploy/install-staging-local.sh`. They are
enabled at boot and restart automatically if `cloudflared` exits. The GitHub
Actions jobs only restart the corresponding service and read the new URL from
its journal; they no longer create a one-shot `systemd-run` process.

This improves recovery after a runner reboot, but it cannot make a Quick
Tunnel hostname permanent. Use a named tunnel and a real DNS hostname for a
durable Gitea clone URL; see `deploy/cloudflared/gitea-config.yml.example`.

For a stable Gitea URL, use a hostname in a Cloudflare-managed zone, for
example `git.example.com`, then set the same value in `/srv/git-platform/.env`:

```bash
sudo cloudflared tunnel login
cloudflared tunnel create gitea
cloudflared tunnel route dns gitea git.example.com

sudo install -d -m 0750 /etc/cloudflared
sudo cp deploy/cloudflared/gitea-config.yml.example /etc/cloudflared/gitea-config.yml
sudoedit /etc/cloudflared/gitea-config.yml
sudo cloudflared --config /etc/cloudflared/gitea-config.yml tunnel ingress validate

sudo sed -i 's/^PUBLIC_HOST=.*/PUBLIC_HOST=git.example.com/' /srv/git-platform/.env
sudo docker compose -f /srv/git-platform/compose.yml up -d --force-recreate gitea
```

Install `deploy/cloudflared/gitea-tunnel.service.example` as a systemd unit
and enable it:

```bash
cloudflared_path="$(command -v cloudflared)"
sed "s|/usr/bin/cloudflared|$cloudflared_path|g" \
  deploy/cloudflared/gitea-tunnel.service.example \
  | sudo tee /etc/systemd/system/gitea-tunnel.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now gitea-tunnel.service
```

The named tunnel keeps `https://git.example.com/git/` as the canonical
address across runner resets; the Quick Tunnel URLs remain temporary aliases.

## One-time setup on Debian 13

Install `cloudflared` using the official Cloudflare package instructions, then:

```bash
sudo cloudflared tunnel login
cloudflared tunnel create spm-local
cloudflared tunnel route dns spm-local app.example.com
cloudflared tunnel route dns spm-local api.example.com
```

Copy `config.yml.example` to `/etc/cloudflared/config.yml`, replace the tunnel
UUID and hostnames, and keep the generated credentials JSON at the path named
by `credentials-file` with mode `0600`.

Validate and run it as a service:

```bash
sudo cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
sudo cloudflared --config /etc/cloudflared/config.yml service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager
```

## Same-origin API mode used by the workflows

The current workflows build the frontend with:

```text
/api
```

`main-ci.yml` and `staging-deploy.yml` pass `/api` as `VITE_BACKEND_URL`.
Nginx then proxies `/api/*` to the correct local backend for each environment.
No `SPM_BACKEND_URL` or `SPM_STAGING_PUBLIC_URL` repository variable is needed
for Quick Tunnel mode.

Gitea's `ROOT_URL` should use a stable hostname when Gitea is used as a real
Git origin. A Quick Tunnel can still expose `/git/` temporarily, but its
random hostname must not be treated as a permanent clone URL.

## Verify a named tunnel later

```bash
curl --fail https://api.example.com/api/health
curl --fail -I https://app.example.com/
```

The first command should return the backend health JSON. The second should
return an HTTP success response for the SPA shell.

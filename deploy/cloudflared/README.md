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

Quick Tunnel links are random `trycloudflare.com` URLs and can change when a
tunnel restarts. They are for staging/testing, not stable production hosting.

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

## Verify a named tunnel later

```bash
curl --fail https://api.example.com/api/health
curl --fail -I https://app.example.com/
```

The first command should return the backend health JSON. The second should
return an HTTP success response for the SPA shell.

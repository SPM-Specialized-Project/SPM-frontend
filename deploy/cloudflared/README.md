# Cloudflare Tunnel for the Debian self-host

This repository uses one named Cloudflare Tunnel with two hostnames:

- `https://app.example.com` -> Nginx on `127.0.0.1:80`
- `https://api.example.com` -> Node backend on `127.0.0.1:4000`

Replace both hostnames with DNS names in a Cloudflare-managed zone. Do not put
the tunnel credentials in Git.

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

## Production environment

Create `/etc/spm-frontend/backend.env` on Debian:

```dotenv
BACKEND_CORS_ORIGIN=https://app.example.com
```

The `spm-backend.service` unit reads this file. The GitHub repository variable
`SPM_BACKEND_URL` must be:

```text
https://api.example.com/api
```

`main-ci.yml` passes that variable as `VITE_BACKEND_URL` while building the
frontend. If the variable is empty, the frontend safely falls back to the
same-origin `/api` path through Nginx.

## Verify both links

```bash
curl --fail https://api.example.com/api/health
curl --fail -I https://app.example.com/
```

The first command should return the backend health JSON. The second should
return an HTTP success response for the SPA shell.

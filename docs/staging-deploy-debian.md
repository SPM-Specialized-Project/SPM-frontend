# Deploy staging and Gitea through GitHub Actions

Merging a PR into `staging` triggers `.github/workflows/staging-deploy.yml`.
Actions configures the Debian runner, initializes Gitea, deploys the app and
publishes the Quick Tunnel URL. No SSH session, installation form or manual
token creation is needed for this flow.

## GitHub settings before merging

Go to **Settings → Secrets and variables → Actions → Secrets** and add:

| Repository secret | Value |
| --- | --- |
| `GITEA_ADMIN_PASSWORD` | A strong new Gitea admin password, at least 12 characters |
| `RUNNER_SUDO_PASSWORD` | Linux password of the runner account, currently `hutieunamvang` |

These are different credentials. The Gitea password is used to create the
initial administrator; an existing administrator keeps its password. The
sudo password is passed through stdin. It can be omitted only if the runner
already permits passwordless root sudo. Keep credentials out of YAML and Git.

Repository **Variables** are optional:

| Variable | Default |
| --- | --- |
| `GITEA_ADMIN_USERNAME` | `spm-admin` |
| `GITEA_ADMIN_EMAIL` | `spm-admin@example.com` |
| `GITEA_OWNER` | `codepulse-bot` |

Set a real admin email if desired. Keep account names unchanged after the
first deployment. `GITEA_OWNER` is the separate non-admin service account
Actions creates for assignment repositories. It must be a username: the
backend uses `/user/repos`. Do not set it to an organization or URL.

These repository secrets are optional:

- `GITEA_API_TOKEN`: generated automatically, verified against real private
  repository/branch/file operations and cached on the runner. An explicitly
  supplied token must belong to the non-admin `GITEA_OWNER`, access private
  repositories and have `write:repository,write:user` scopes.
- `POSTGRES_PASSWORD`: recovered from the existing `git-postgres` container,
  or generated for a new stack. If supplied, it must match the existing
  database password; changing a container variable does not rotate the
  stored PostgreSQL role password.

Keep the existing `E2E_DISPATCH_TOKEN` for the staging-to-main E2E promotion
workflow. It is not needed for this staging bootstrap.
No SSH secrets, `PUBLIC_HOST`, `GITEA_API_URL`, `SPM_BACKEND_URL` or
`SPM_STAGING_PUBLIC_URL` GitHub setting is needed.

Under **Settings → Actions → Runners**, the runner must be online with
`self-hosted`, `linux`, `x64` and `local-deploy` labels, and its account must
have root sudo permission. Docker Engine, Compose and `cloudflared` are host
prerequisites already present on the current runner. Actions installs missing
Nginx, rsync and curl packages and refreshes the application services.

## Merge and check

1. Add the two secrets before merging and wait for both PR quality jobs.
2. Merge into `staging`; open **Actions → Staging Deploy → latest run**.
3. The first validation checks credentials and sudo before the frontend build.
4. Wait for Gitea setup, deployment and all verification steps to succeed.
5. Open the run **Summary** for the app, `/api/health` and `/git/` URLs.
6. Sign into `<public-url>/git/` as `spm-admin` with `GITEA_ADMIN_PASSWORD`.
   Verify lecturer publication and a student LAB submission in the app.

If credentials were missing or incorrect, fix them in GitHub and select
**Re-run failed jobs** on the staging run.

## Automatic setup behavior

Actions preserves the Compose project, PostgreSQL password and existing
database/Gitea volume identities; it refuses storage or Gitea image changes.
The current image is `docker.gitea.com/gitea:1.27.3-rootless`.

For `INSTALL_LOCK=false`, it migrates the database and creates the admin and
service account before starting the installed web service. Its root-owned
Compose override repairs the malformed `https://https://.../git/` URL and
sets `INSTALL_LOCK=true`. The base file and override are both included in
the persistent `gitea-stack.service`.

A uniquely named private check repository verifies branch creation, file
creation and file update using its SHA. Only that temporary repository is
deleted. Valid cached tokens are reused on subsequent setups.

Actions preserves unrelated settings and stores integration configuration
only in `/etc/spm-frontend/staging.env` (owner `root:spm`, mode `0640`):

~~~dotenv
GITEA_API_URL="http://127.0.0.1:8211/api/v1"
GITEA_OWNER="codepulse-bot"
GITEA_API_TOKEN="<generated-on-the-runner>"
~~~

It installs a Node 22 runtime outside the runner home directory, refreshes
Nginx, systemd units and the deploy helper, and enables services at boot.
After obtaining the Quick Tunnel URL, it updates Gitea `ROOT_URL` to
`<public-url>/git/` before checking the public endpoints.

| Component | Address/path |
| --- | --- |
| Staging Nginx/backend | `127.0.0.1:8080` / `127.0.0.1:4011` |
| Gitea HTTP/SSH | `127.0.0.1:8211` → container `3000` / host `2222` |
| Backend data | `/opt/spm-frontend-staging/shared/data` |
| Git platform | `/srv/git-platform/compose.yml` plus `actions.override.json` |
| Backend/tunnel units | `spm-staging-backend.service` / `spm-staging-quick-tunnel.service` |
| Public API/Gitea | `<public-url>/api/*` / `<public-url>/git/*` |

Production uses `80/4000`; isolated E2E uses `3010/4010`. This workflow
configures staging `8080/4011` and the shared Gitea stack.
Quick Tunnel needs no domain or Cloudflare credential, but its hostname
changes on restart. Use the latest Summary URL without `:8080`. Stable
Gitea clone URLs require a domain and Named Tunnel later.

## Deployment tests for maintainers

`npm run deploy:test` runs in backend PR quality and staging deployment.
It checks invalid inputs, database/volume continuity, URL normalization,
Compose dollar escaping, protected settings and repository-check cleanup.

The optional harness uses real Gitea 1.27.3, PostgreSQL 17 and Redis 8;
systemd/Nginx/cloudflared are stubbed. It cannot prove actual Debian service
or public tunnel behavior. Use a disposable Docker host, with ports
`8211/2222` free and no `gitea`, `git-postgres` or `git-redis` containers.

~~~bash
docker build -f deploy/test/Dockerfile.integration \
  -t spm-gitea-integration-harness .
docker run --rm --network host \
  -e SPM_DISPOSABLE_INTEGRATION=1 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:/workspace:ro" \
  spm-gitea-integration-harness node deploy/test/integration.mjs
~~~

The harness refuses existing named containers. It deletes only the unique
test project it creates, and checks installation recovery, actual API
writes, repeat setup/token reuse, unchanged volumes and preserved repository
data after the public URL update.

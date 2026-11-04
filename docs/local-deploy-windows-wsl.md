# Deploy main and staging from the Windows runner with WSL2

After a change reaches `main`, `.github/workflows/main-ci.yml` runs quality checks and deploys production on the `TUNGQUAN` Windows runner. Windows builds the frontend; the workflow invokes Ubuntu on WSL2 for the existing Linux service stack. Staging uses the same WSL distro and shared Gitea stack through `.github/workflows/staging-deploy.yml`.

See [the staging WSL setup guide](staging-deploy-windows-wsl.md) for installing WSL2, enabling systemd and Docker Engine, configuring the runner service account, adding the `local-deploy` label and setting up secrets.

## GitHub secrets and variables

Main and staging share these repository secrets:

| Secret | Purpose |
| --- | --- |
| `GITEA_ADMIN_PASSWORD` | Initial Gitea administrator password, at least 12 characters |
| `RUNNER_SUDO_PASSWORD` | Password for the Ubuntu WSL default user |
| `RUNNER_STATUS_TOKEN` | Fine-grained PAT with repository `Administration: Read`, for staging runner preflight |

The Windows runner service must run as the Windows user that owns the Ubuntu distro. `SPM_WSL_DISTRO` is an optional repository variable; it defaults to `Ubuntu`.

Other optional settings retain their existing behavior:

| Setting | Default or behavior |
| --- | --- |
| `GITEA_ADMIN_USERNAME` (variable) | `spm-admin`, shared |
| `GITEA_ADMIN_EMAIL` (variable) | `spm-admin@example.com` |
| `GITEA_OWNER` (variable) | `codepulse-bot` for staging |
| `GITEA_MAIN_OWNER` (variable) | `codepulse-bot-main` for main |
| `GITEA_API_TOKEN` (secret) | Staging token; generated and verified if omitted |
| `GITEA_MAIN_API_TOKEN` (secret) | Main token; generated and verified if omitted |
| `POSTGRES_PASSWORD` (secret) | Existing database password when restoring an existing volume |
| `E2E_DISPATCH_TOKEN` (secret) | Dispatches the remote test-E2E workflow |

A supplied Gitea token must belong to the environment's non-admin service account, access private repositories, and have `write:repository,write:user` scopes. Main and staging use distinct owners but share one Gitea instance and database.

## What main deploys

The main workflow runs only for the `main` ref. It builds the frontend on Windows, runs the deployment setup in WSL, promotes an atomic release, restarts `spm-backend.service`, starts the main Quick Tunnel and updates Gitea's canonical URL after main succeeds.

Staging and main share the GitHub Actions deployment concurrency group. They cannot mutate the shared WSL Gitea stack at the same time. Main owns the Gitea public `ROOT_URL` after its first successful deployment; later staging deployments do not replace it.

| Component | Main in WSL | Staging in WSL |
| --- | --- | --- |
| Nginx/backend | `80 / 4000` | `8080 / 4011` |
| Backend environment | `/etc/spm-frontend/backend.env` | `/etc/spm-frontend/staging.env` |
| Application data | `/opt/spm-frontend/shared/data` | `/opt/spm-frontend-staging/shared/data` |
| Backend service | `spm-backend.service` | `spm-staging-backend.service` |
| Quick Tunnel | `spm-quick-tunnel.service` | `spm-staging-quick-tunnel.service` |
| Gitea API | `127.0.0.1:8211` | Shared |

## Moving from the old Debian machine

The Windows WSL distro starts with its own Linux filesystem and Docker Engine volumes. The old Debian Gitea repositories, PostgreSQL data, and app JSON files are not copied automatically. Back them up and restore them into WSL before deploying if production history must continue. Setup protects storage inside WSL but cannot read the old machine's disks.

Once data is available, the first successful main deployment publishes the production URL and configures Gitea to use it. Quick Tunnel hostnames can change on restart; use the latest Actions summary. A stable clone URL requires a named Cloudflare Tunnel and a domain.

## Promotion flow

1. Configure the Windows WSL runner as described in the staging setup guide.
2. Merge the deployment support PR into `staging`.
3. Open the existing `staging → main` promotion PR and wait for the staging deployment and remote E2E checks.
4. Merge the promotion PR. The updated `main-ci.yml` then deploys production to the same Windows-hosted WSL distro.
5. Open **Actions → Main CI** and check the latest summary for the public app and shared Gitea URLs.

The migration PR changes both workflows, so `main` uses the same WSL host after the staging changes are promoted. It does not move production data from Debian; data restore is a separate prerequisite if the old state must be retained.

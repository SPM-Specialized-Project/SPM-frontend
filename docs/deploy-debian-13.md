# Deploy on the Debian 13 runner

The active GitHub Actions workflows deploy directly on the repository's self-hosted Linux runner. The runner currently appears online as debian with the self-hosted, Linux, X64, and debian-13 labels. Deployment jobs require those labels and verify the host is Debian 13 before changing services.

The previous Windows and WSL setup is archived under legacy/windows-wsl/. GitHub Actions only loads workflows from .github/workflows/.

## Host requirements

The runner service must remain online under the Linux account that owns the deployment. Install and verify:

- Debian 13 with systemd as PID 1.
- Node.js 22 or newer and npm.
- Docker Engine, the Compose v2 plugin, and Buildx.
- cloudflared.
- Nginx and rsync (the first setup workflow installs these through apt).
- Outbound HTTPS access to GitHub, Docker registries, and Cloudflare.

Run the checks below as the Actions runner account:

~~~bash
cat /etc/os-release
node --version
npm --version
systemctl is-system-running
docker info
docker compose version
docker buildx version
cloudflared --version
~~~

The deployment workflow fails early unless /etc/os-release reports Debian 13, systemd is active, Node is at least version 22, Docker and Compose work for the runner account, Buildx is available, and cloudflared runs.

The runner account must be able to use sudo for first-time setup. It may use passwordless sudo or the RUNNER_SUDO_PASSWORD repository secret. After setup, the install scripts add narrow sudo rules for the atomic deploy command and Quick Tunnel service operations. Docker group membership grants root-equivalent access; use a dedicated runner host and account.

## Runner labels

The deployment and preflight jobs target:

~~~yaml
runs-on: [self-hosted, linux, x64, debian-13]
~~~

The runner must have the custom debian-13 label; it is already applied to the online runner named debian. Promotion source uses RUNNER_STATUS_TOKEN to inspect the repository's runner inventory and stops unless a matching runner is online and idle. That check does not reserve the runner; GitHub's label scheduler selects the actual job runner.

## GitHub secrets and variables

Configure these under SPM-frontend → Settings → Secrets and variables → Actions:

| Name | Type | Purpose |
| --- | --- | --- |
| GITEA_ADMIN_PASSWORD | Secret | Initial Gitea administrator password, at least 12 characters. |
| RUNNER_STATUS_TOKEN | Secret | Fine-grained token with repository Administration: Read for runner preflight. |
| RUNNER_SUDO_PASSWORD | Secret | Runner account's sudo password when sudo -n true is not available. |
| POSTGRES_PASSWORD | Secret | Existing database password when reusing the current PostgreSQL volume. |
| GITEA_API_TOKEN | Secret | Optional staging service-account token; generated and verified when omitted. |
| GITEA_MAIN_API_TOKEN | Secret | Optional main service-account token; generated and verified when omitted. |
| E2E_DISPATCH_TOKEN | Secret | Dispatches and polls the remote test-E2E workflow. |

Existing optional variables remain supported: GITEA_ADMIN_USERNAME, GITEA_ADMIN_EMAIL, GITEA_OWNER, GITEA_MAIN_OWNER, and the observability settings.

## Deployment flow

- Pull requests run frontend, backend, and deployment-configuration checks on GitHub-hosted runners.
- Actions → Staging E2E Gate → Run workflow on staging deploys staging on Debian 13. This manual run does not dispatch browser E2E.
- A same-repository staging to main PR checks runner availability, deploys staging on Debian 13, and dispatches the remote test-E2E workflow.
- When the approved promotion reaches main, Main CI deploys the production release on the same Debian host.

Staging and main share the host's Nginx, systemd, Docker Engine, and Gitea/PostgreSQL/Redis Compose stack. The deploy is serialized across both environments. Main uses Nginx/backend ports 80/4000; staging uses 18080/4011. Gitea is served through Nginx at /git/; Grafana and Cloudflare Quick Tunnels retain their existing routes.

## Data and first deployment

Service setup preserves data and Docker volumes already present on this Debian host. It does not copy data from a separate Windows WSL2 distribution. Before the first deployment, confirm that the Debian host has the intended Gitea, PostgreSQL, and application JSON data. If the latest data exists only inside WSL, back it up and restore it on Debian before running setup.

The first main install disables the packaged Nginx default site when it is the standard default symlink, so the SPM virtual host owns port 80. Existing custom default Nginx files are preserved.

Cloudflare Quick Tunnel hostnames can change when the service restarts. Use the latest Actions summary for the current staging URL, production URL, and shared Gitea URL. See staging-e2e-debian.md for remote browser E2E details and legacy/windows-wsl/README.md for the archived Windows setup.

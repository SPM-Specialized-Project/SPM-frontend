# Deploy staging from the Windows runner with WSL2

The `TUNGQUAN` Windows runner builds the frontend on Windows and runs the Linux deployment stack inside Ubuntu on WSL2. This keeps the existing Linux service layout, Docker sandbox, systemd units, Nginx and Cloudflare Tunnel while moving them onto the Windows machine.

The staging-to-main PR gate checks the runner, deploys staging through `.github/workflows/staging-deploy.yml`, then dispatches E2E to the separate `test-E2E` repository. Manual runs of **Staging E2E Gate** on `staging` deploy staging only.

## One-time setup on TUNGQUAN

1. Install WSL2 and Ubuntu from an elevated PowerShell window:

   ```powershell
   wsl --install -d Ubuntu
   ```

2. In Ubuntu, enable systemd:

   ```bash
   sudo tee /etc/wsl.conf >/dev/null <<'EOF'
   [boot]
   systemd=true
   EOF
   ```

   From Windows, run `wsl --shutdown`, then open Ubuntu again.

3. Install Node.js 22, Docker Engine with the Compose plugin, and `cloudflared` inside Ubuntu. Follow the [Docker Engine install guide](https://docs.docker.com/engine/install/ubuntu/), [Compose plugin guide](https://docs.docker.com/compose/install/linux/), and [Cloudflare package instructions](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). Enable Docker at boot and add the Ubuntu default user to the `docker` group:

   ```bash
   sudo systemctl enable --now docker
   sudo usermod --append --groups docker "$USER"
   ```

   Restart the distro after changing group membership. The Ubuntu shell must be able to run `docker info` and `docker compose version` without `sudo`.

4. Check the WSL environment:

   ```bash
   node --version
   systemctl is-system-running
   docker info
   docker compose version
   cloudflared --version
   ```

5. Configure the GitHub Actions Windows runner service to log on as the same Windows user that owns the Ubuntu WSL distribution. A service running as `LocalSystem` will not see that user's distro.

6. In Windows Task Scheduler, create a task that starts Ubuntu at Windows boot, under that same account, and continues running whether the user is signed in or not. Use `wsl.exe -d Ubuntu --exec /usr/bin/sleep infinity` as the action so WSL and its enabled systemd services stay alive. Keep the Windows machine powered on and prevent it from sleeping while it hosts main or staging.

7. In **SPM-frontend → Settings → Actions → Runners → TUNGQUAN**, add the custom label `local-deploy`. The runner must show `self-hosted`, `Windows`, `X64`, and `local-deploy`, and be online and idle before the staging gate starts.

WSL paths such as `/opt/spm-frontend-staging`, `/srv/git-platform`, and `/etc/spm-frontend` live inside Ubuntu's virtual disk on Windows. Docker volumes live in the WSL Docker Engine storage. Do not unregister the distribution or prune these volumes; that deletes deployment data.

## GitHub settings

Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `GITEA_ADMIN_PASSWORD` | A strong Gitea admin password, at least 12 characters |
| `RUNNER_SUDO_PASSWORD` | Password for the default Ubuntu WSL user |
| `RUNNER_STATUS_TOKEN` | Fine-grained PAT with repository `Administration: Read`; used to inspect runner status |

The default WSL user must be able to use `sudo`. The setup stores narrowly scoped sudo rules for deployments and tunnel management.

Optional repository variable:

| Variable | Default |
| --- | --- |
| `SPM_WSL_DISTRO` | `Ubuntu` |

Other variables keep their current defaults: `GITEA_ADMIN_USERNAME=spm-admin`, `GITEA_ADMIN_EMAIL=spm-admin@example.com`, and staging `GITEA_OWNER=codepulse-bot`.

Optional secrets remain supported: `GITEA_API_TOKEN`, `POSTGRES_PASSWORD`, and `GITEA_MAIN_API_TOKEN`. The E2E promotion flow still needs `E2E_DISPATCH_TOKEN`.

## Data when moving from the Debian machine

The WSL distribution and its Docker Engine have their own files and volumes. They do not automatically include the old Debian machine's Gitea repositories, PostgreSQL volume, or application JSON data. Back up and restore those into WSL before deploying if they must be preserved. Do not point staging and main at copied, mismatched database volumes; setup intentionally refuses a storage identity change.

## Run and check

1. Configure WSL, Docker integration, the runner label and secrets above.
2. Merge the Windows/WSL deployment PR into `staging` after its checks pass.
3. Open a staging-to-main PR, or run **Actions → Staging E2E Gate → Run workflow** on `staging`.
4. The promotion precheck requires an idle Windows runner with all four labels. The deployment job then verifies WSL2, systemd, Node 22, Docker and cloudflared before changing services.
5. Open the Actions summary for the current staging and shared Gitea URLs.

The availability precheck uses `RUNNER_STATUS_TOKEN` and the repository runner API. It does not wait for a busy runner or reserve the runner after checking it. The GitHub runner label schedules the job; the WSL preflight confirms that its Linux environment is usable.

## What setup changes inside WSL

The existing deployment setup preserves the Compose project and storage identities, initializes Gitea if needed, keeps a separate repository owner for main and staging, and writes integration settings to environment files inside Ubuntu. It installs the Linux Nginx, rsync and curl packages and enables the backend, Gitea and tunnel systemd services.

The staging app uses Nginx/backend ports `8080/4011`; main uses `80/4000`. Gitea uses `127.0.0.1:8211` and SSH port `2222`. Both environments use the same Gitea/PostgreSQL/Redis Compose stack inside WSL. Staging application data is under `/opt/spm-frontend-staging/shared/data`; main data is under `/opt/spm-frontend/shared/data`.

The setup can keep existing volumes on repeat runs inside the same WSL distro. It cannot preserve data that remains only on the unavailable Debian machine.

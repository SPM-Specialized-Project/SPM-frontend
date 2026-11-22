# Archived Windows and WSL deployment

This directory preserves the previous Windows runner and Ubuntu WSL2 setup for reference.
The archived workflows are outside the active .github/workflows directory, so GitHub
Actions does not load them.

Active deployments now use the self-hosted Debian 13 runner. See:

- docs/deploy-debian-13.md for host prerequisites, secrets, and operations.
- docs/staging-e2e-debian.md for the cross-repository E2E gate.

The folder mirrors the former repository paths. To restore the previous setup, copy
selected .github/workflows, deploy, and docs files back to their matching paths in the
repository root. Do not copy this archive README over the project README.

Archived items:

- .github/workflows/: the former Windows/WSL Main CI, staging deployment, and E2E gate.
- docs/: Windows runner installation and WSL setup instructions.
- deploy/actions/: the former PowerShell bridge, WSL orchestrator, and Windows runner check.
- deploy/gitea/ and deploy/cloudflared/: the former WSL-specific operator guides.

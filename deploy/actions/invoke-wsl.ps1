param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('host-check', 'check', 'build-sandbox', 'tests', 'setup', 'deploy', 'verify-local', 'tunnel', 'public', 'verify-public')]
  [string]$Phase
)

$ErrorActionPreference = 'Stop'
$distribution = if ([string]::IsNullOrWhiteSpace($env:SPM_WSL_DISTRO)) { 'Ubuntu' } else { $env:SPM_WSL_DISTRO }
$env:SPM_WSL_PHASE = $Phase

$pathVariables = @('GITHUB_WORKSPACE', 'GITHUB_OUTPUT')
$forwardVariables = @(
  'GITHUB_WORKSPACE', 'GITHUB_OUTPUT', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA',
  'SPM_DEPLOY_ENVIRONMENT', 'SPM_WSL_PHASE', 'SPM_WSL_RELEASE_ID', 'SPM_DEPLOY_PUBLIC_URL',
  'RUNNER_SUDO_PASSWORD', 'GITEA_ADMIN_PASSWORD', 'GITEA_ADMIN_USERNAME', 'GITEA_ADMIN_EMAIL',
  'GITEA_OWNER', 'POSTGRES_PASSWORD', 'GITEA_API_TOKEN'
)
$existing = @()
if (-not [string]::IsNullOrWhiteSpace($env:WSLENV)) {
  $existing = @($env:WSLENV -split ':' | Where-Object { $_ })
}
$preserved = @($existing | Where-Object { ($_.Split('/')[0]) -notin $forwardVariables })
$forwarded = @($forwardVariables | ForEach-Object {
  if ($_ -in $pathVariables) { "$_/p" } else { $_ }
})
$env:WSLENV = (@($preserved) + @($forwarded) | Select-Object -Unique) -join ':'

if ([string]::IsNullOrWhiteSpace($env:GITHUB_WORKSPACE)) {
  throw 'GITHUB_WORKSPACE is missing; checkout must complete before invoking WSL.'
}

$wsl = Get-Command 'wsl.exe' -ErrorAction SilentlyContinue
if (-not $wsl) { throw 'WSL is unavailable. Install WSL 2 and an Ubuntu distribution on this Windows runner.' }

& $wsl.Source --distribution $distribution --exec bash -lc 'cd "$GITHUB_WORKSPACE" && exec node deploy/actions/wsl-deployment.mjs "$SPM_WSL_PHASE" "$SPM_WSL_RELEASE_ID"'
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

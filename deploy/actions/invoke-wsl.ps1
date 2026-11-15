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

$wslArguments = @('--distribution', $distribution, '--cd', $env:GITHUB_WORKSPACE,
  '--exec', 'node', 'deploy/actions/wsl-deployment.mjs', $env:SPM_WSL_PHASE)
if (-not [string]::IsNullOrWhiteSpace($env:SPM_WSL_RELEASE_ID)) {
  $wslArguments += $env:SPM_WSL_RELEASE_ID
}

$maxAttempts = if ($Phase -eq 'host-check') { 3 } else { 1 }
for ($attempt = 1; $attempt -le $maxAttempts; $attempt += 1) {
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    # Windows PowerShell 5 can promote native-command stderr to a terminating
    # NativeCommandError when ErrorActionPreference is Stop. WSL tools may emit
    # warnings on stderr even when the command succeeds, so use the process exit
    # code as the source of truth and restore the caller's preference afterwards.
    $ErrorActionPreference = 'Continue'
    $output = & $wsl.Source @wslArguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  $diagnostic = ($output | Out-String) -replace "`0", ''

  if ($exitCode -eq 0) {
    if ($diagnostic) { Write-Output $diagnostic.TrimEnd() }
    exit 0
  }

  if ($Phase -eq 'host-check' -and $diagnostic -match 'Wsl/Service/0x8007274c' -and $attempt -lt $maxAttempts) {
    Write-Warning "WSL service timed out while starting the distro; retrying host-check ($($attempt + 1)/$maxAttempts)."
    Start-Sleep -Seconds $attempt
    continue
  }

  if ($diagnostic) { Write-Output $diagnostic.TrimEnd() }
  exit $exitCode
}

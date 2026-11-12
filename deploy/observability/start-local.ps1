$ErrorActionPreference = 'Stop'

$observabilityDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$redirectsGenerator = Join-Path $observabilityDir '..\..\frontend\scripts\generate-observability-nginx-redirects.mjs'
$secretDirectory = Join-Path $env:LOCALAPPDATA 'SPM-Observability'
$envFile = Join-Path $secretDirectory 'grafana.env'

New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null

if (-not (Test-Path -LiteralPath $envFile)) {
    $bytes = [byte[]]::new(32)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $generator.GetBytes($bytes)
    $generator.Dispose()
    $password = [BitConverter]::ToString($bytes).Replace('-', '')
    @(
        'GRAFANA_ADMIN_USER=admin'
        ('GRAFANA_ADMIN_PASSWORD=' + $password)
        'GRAFANA_ROOT_URL=http://localhost:8081/observation/grafana/'
        'OBSERVABILITY_VOLUME_PREFIX=spm-observability-local'
    ) | Set-Content -LiteralPath $envFile -Encoding ascii
}

$envLines = @(Get-Content -LiteralPath $envFile)
if ($envLines | Where-Object { $_.StartsWith('GRAFANA_HOST_PORT=') }) {
    $envLines | Where-Object { -not $_.StartsWith('GRAFANA_HOST_PORT=') } |
        Set-Content -LiteralPath $envFile -Encoding ascii
}

node $redirectsGenerator
if ($LASTEXITCODE -ne 0) {
    throw 'Could not generate the local Nginx dashboard URL map.'
}

docker compose --project-name spm-observability-local --env-file $envFile --file (Join-Path $observabilityDir 'compose.yml') --profile local up --detach
if ($LASTEXITCODE -ne 0) {
    throw 'Could not start local Grafana and Loki. Check Docker Desktop and port 8081.'
}

Write-Host 'Grafana: http://localhost:8081/observation/grafana/'
Write-Host 'Grafana is available to the local Nginx gateway only; no host port is published.'
Write-Host ('Private login file: ' + $envFile)

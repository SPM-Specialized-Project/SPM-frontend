$ErrorActionPreference = 'Stop'

$observabilityDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $env:LOCALAPPDATA 'SPM-Observability\grafana.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    Write-Host 'Local Grafana/Loki has not been configured.'
    exit 0
}

docker compose --project-name spm-observability-local --env-file $envFile --file (Join-Path $observabilityDir 'compose.yml') --profile local down
if ($LASTEXITCODE -ne 0) {
    throw 'Could not stop local Grafana and Loki.'
}

Write-Host 'Local Grafana and Loki are stopped. Their data volumes are preserved.'

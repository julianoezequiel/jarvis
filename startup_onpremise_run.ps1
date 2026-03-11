<#
  Startup script for on-premise deployment (PowerShell)
  - Expects `docker-compose.onpremise.yml` and `.env.onpremise` in repo root
  - Usage: Run this script from the repository root in an elevated PowerShell
#>

Write-Host "Starting Jarvis on-premise stack..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is not installed or not in PATH. Install Docker Desktop or Docker Engine."
  exit 1
}

$composeFile = "docker-compose.onpremise.yml"
if (-not (Test-Path $composeFile)) {
  Write-Error "$composeFile not found in current directory.`nCreate it or copy from templates.`n"
  exit 1
}

if (-not (Test-Path ".env.onpremise")) {
  Copy-Item .env.example .env.onpremise -ErrorAction SilentlyContinue
  Write-Host "Created .env.onpremise from .env.example - please edit and add secrets before proceeding."
}

Write-Host "Bringing up containers..."
docker compose -f $composeFile up -d

Write-Host "Waiting for web service to become healthy (http://localhost:3000)..."
$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
      Write-Host "Web service is responding."
      break
    }
  } catch {
    Start-Sleep -Seconds 3
    $attempt++
    Write-Host "Waiting... ($attempt/$maxAttempts)"
  }
}

if ($attempt -ge $maxAttempts) {
  Write-Warning "Web service did not respond in time. Check container logs:"
  docker compose -f $composeFile ps
  docker compose -f $composeFile logs --tail=200 web
  exit 2
}

Write-Host "Startup complete. To follow logs run:`ndocker compose -f $composeFile logs -f web`"

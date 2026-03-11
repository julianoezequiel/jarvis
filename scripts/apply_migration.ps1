<#
Apply migration to Supabase/Postgres using psql.

Usage:
- Set the environment variable SUPABASE_DB_CONN to your Postgres connection string, for example:
  $env:SUPABASE_DB_CONN = 'postgres://postgres:password@dbhost:5432/postgres'

- Or pass the connection string as the first argument:
  ./scripts/apply_migration.ps1 "postgres://user:pass@host:5432/dbname"

Requires: psql (Postgres client) available on PATH.
#>

param(
  [string]$Conn = $env:SUPABASE_DB_CONN
)

$scriptPath = Join-Path $PSScriptRoot "..\database\migrations\001_create_jarvis_tables.sql"
$scriptPath = (Resolve-Path $scriptPath).Path

if (-not (Test-Path $scriptPath)) {
  Write-Error "Migration file not found: $scriptPath"
  exit 2
}

if (-not $Conn) {
  Write-Host "No connection string provided. Please either set the SUPABASE_DB_CONN environment variable or pass the connection string as the first argument."
  Write-Host "Example (PowerShell):`
  $env:SUPABASE_DB_CONN='postgres://postgres:password@dbhost:5432/postgres'`
  ./scripts/apply_migration.ps1"
  exit 1
}

# Check for psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Error "psql not found in PATH. Install PostgreSQL client or use Supabase SQL editor."
  Write-Host "If you have the Supabase CLI, you can also run: supabase db remote set <CONN>; supabase db query -f $scriptPath"
  exit 3
}

Write-Host "Applying migration file: $scriptPath"
Write-Host "Using connection: $Conn"

# Run psql with the SQL file
$escapeConn = $Conn
$cmd = "psql '$escapeConn' -f `"$scriptPath`""
Write-Host "Running: $cmd"

# Execute
$proc = Start-Process -FilePath psql -ArgumentList @($Conn, '-f', $scriptPath) -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -eq 0) {
  Write-Host "Migration applied successfully."
  exit 0
} else {
  Write-Error "psql exited with code $($proc.ExitCode). Check output above for details."
  exit $proc.ExitCode
}

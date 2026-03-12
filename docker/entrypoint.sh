#!/bin/sh
# entrypoint.sh — Maya Widget Docker entrypoint
#
# 1. If DB_ADAPTER=postgres, waits for PostgreSQL then runs all migrations in order.
# 2. Starts the Next.js production server.
#
# Environment variables consumed here:
#   DB_ADAPTER    — "postgres" or "supabase" (default: supabase)
#   DATABASE_URL  — postgresql://user:pass@host:port/db (required when postgres)
#   PORT          — server port (default: 3000)

set -e

# ─── PostgreSQL wait + migrations ─────────────────────────────────────────────
if [ "${DB_ADAPTER}" = "postgres" ] && [ -n "${DATABASE_URL}" ]; then

  # Extract host and port from DATABASE_URL using the bundled Python
  _PARSED=$(python3 - <<'EOF'
import os, sys
from urllib.parse import urlparse
url = urlparse(os.environ.get("DATABASE_URL", ""))
print(url.hostname or "localhost")
print(url.port or 5432)
EOF
)
  _host=$(echo "${_PARSED}" | head -1)
  _port=$(echo "${_PARSED}" | tail -1)

  printf '[entrypoint] Waiting for PostgreSQL at %s:%s...\n' "${_host}" "${_port}"
  _retries=0
  until nc -z "${_host}" "${_port}" 2>/dev/null; do
    _retries=$(( _retries + 1 ))
    if [ "${_retries}" -ge 30 ]; then
      printf '[entrypoint] ERROR: PostgreSQL did not become available after 60s. Aborting.\n'
      exit 1
    fi
    sleep 2
    printf '[entrypoint] Not ready yet (%d/30), retrying...\n' "${_retries}"
  done
  printf '[entrypoint] PostgreSQL is ready.\n'

  printf '[entrypoint] Running database migrations...\n'
  for _sql in /app/database/migrations/*.sql; do
    printf '[entrypoint] Applying %s\n' "$(basename "${_sql}")"
    # || true: non-fatal — idempotent CREATE IF NOT EXISTS handles re-runs
    psql "${DATABASE_URL}" -f "${_sql}" || true
  done
  printf '[entrypoint] All migrations applied.\n'

fi

# ─── Start Next.js ─────────────────────────────────────────────────────────────
exec node_modules/.bin/next start -p "${PORT:-3000}"

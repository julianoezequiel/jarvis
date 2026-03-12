# ─── Dockerfile — Maya Widget ─────────────────────────────────────────────────
#
# Multi-stage build:
#   deps    — production-only node_modules (fast runner copy)
#   builder — full dev deps + next build
#   runner  — minimal Debian slim image with Python + vosk
#
# Build:  docker build -t maya-widget .
# Run:    docker run -p 3000:3000 --env-file .env.local -e DB_ADAPTER=postgres -e DATABASE_URL=... maya-widget
#
# Target image size: < 700 MB

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# Install production deps only (omits devDependencies)
RUN npm ci --omit=dev

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# Full install (includes devDeps needed for next build)
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# System dependencies:
#   python3 + venv   → speaker recognition via vosk
#   libstdc++6       → vosk native library runtime
#   postgresql-client → psql for applying migrations in entrypoint
#   netcat-openbsd   → nc used to wait for PostgreSQL readiness
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      python3-venv \
      libstdc++6 \
      postgresql-client \
      netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# Create Python venv and install vosk (uses prebuilt manylinux wheel)
RUN python3 -m venv /app/.venv \
  && /app/.venv/bin/pip install --no-cache-dir vosk

# ── Node.js application ───────────────────────────────────────────────────────
# Production node_modules from deps stage
COPY --from=deps    /app/node_modules         ./node_modules

# Next.js build output from builder stage
COPY --from=builder /app/.next                ./.next
COPY --from=builder /app/public               ./public
COPY --from=builder /app/next.config.js       ./next.config.js
COPY --from=builder /app/package.json         ./package.json

# ── Python scripts ────────────────────────────────────────────────────────────
COPY src/scripts/vosk_speaker.py ./src/scripts/vosk_speaker.py

# ── Voice speaker models (included in repo, ~13 MB) ───────────────────────────
# vosk-model-spk-0.4 is required for speaker embedding extraction.
# The ASR model (~30 MB) is auto-downloaded to /root/.vosk/ on first run
# and persisted via a Docker volume (see docker-compose.widget.yml).
COPY models ./models

# ── Database migrations ───────────────────────────────────────────────────────
COPY database/migrations ./database/migrations

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# ── Environment ───────────────────────────────────────────────────────────────
ENV NODE_ENV=production
# PYTHON env var is read by src/lib/voskSpeaker.ts to locate the Python binary
ENV PYTHON=/app/.venv/bin/python3
ENV PORT=3000
# Ensure Next.js binds to 0.0.0.0 (required inside Docker)
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]

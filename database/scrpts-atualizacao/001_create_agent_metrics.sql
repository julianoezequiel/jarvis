-- Migration: 001_create_agent_metrics.sql
-- Purpose: create `agent_metrics` table to persist agent call metrics
-- Run this script in Supabase SQL Editor or via psql against the project's DB.

-- Extension for UUID generation (pgcrypto). If your project uses uuid-ossp, adapt accordingly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agent_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,
  provider text NOT NULL,
  valid boolean NOT NULL,
  latency integer,
  total_calls integer,
  valid_responses integer,
  avg_latency_ms integer,
  validation_errors text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_created_at ON agent_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_provider ON agent_metrics (provider);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent ON agent_metrics (agent);

-- Notes:
-- - `validation_errors` stores the Ajv/errors JSON as text.
-- - For high-volume setups, consider a separate time-series store or partitioning by date.

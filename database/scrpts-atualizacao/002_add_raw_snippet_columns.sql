-- Migration: add raw_snippet and text_length to agent_metrics
-- Creates two columns used for debugging LLM responses: a short snippet and the total text length

ALTER TABLE IF EXISTS agent_metrics
  ADD COLUMN IF NOT EXISTS raw_snippet TEXT NULL,
  ADD COLUMN IF NOT EXISTS text_length INTEGER NULL;

-- Notes:
-- - `raw_snippet` stores a truncated portion (e.g. first 8KB) of the LLM response for quick debugging.
-- - `text_length` stores the length of the full aggregated text returned by the provider.
-- Consider adding retention/partitioning for large volumes in production.

-- Migration: 002_add_agent_knowledge.sql
-- Purpose: create `agent_knowledge` table used by the Knowledge Base API
--          and by agent context retrieval across all Maya agents.
-- Run after: 001_create_jarvis_tables.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- agent_knowledge: vector of facts/skills per agent + knowledge-base uploads
CREATE TABLE IF NOT EXISTS public.agent_knowledge (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text        NOT NULL,
  skill_name  text        NOT NULL,
  content     text        NOT NULL,
  quality     integer     DEFAULT 3,
  created_at  timestamptz DEFAULT now()
);

-- Index for fast lookup by agent + skill (used in knowledge chunked retrieval)
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_skill
  ON public.agent_knowledge (agent_id, skill_name);

-- Full-text search index over content (Portuguese)
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_content
  ON public.agent_knowledge USING gin (to_tsvector('portuguese', content));

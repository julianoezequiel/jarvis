-- Migration: create jarvis memory and files tables
-- Run this in your Supabase SQL editor or via psql against the project's DB.

-- jarvis_memory: conversational history
CREATE TABLE IF NOT EXISTS public.jarvis_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  content text NOT NULL,
  session_id text,
  importance integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- user_facts: user facts and preferences
CREATE TABLE IF NOT EXISTS public.user_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact text NOT NULL,
  category text,
  importance integer DEFAULT 1,
  source text,
  created_at timestamptz DEFAULT now()
);

-- jarvis_files: stored deliverables / project files
CREATE TABLE IF NOT EXISTS public.jarvis_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  content text NOT NULL,
  project_name text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- oraculo_knowledge: periodic research outputs
CREATE TABLE IF NOT EXISTS public.oraculo_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  content text NOT NULL,
  source text,
  quality integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

-- indexes for basic search
CREATE INDEX IF NOT EXISTS idx_jarvis_memory_content ON public.jarvis_memory USING gin (to_tsvector('portuguese', content));
CREATE INDEX IF NOT EXISTS idx_user_facts_fact ON public.user_facts USING gin (to_tsvector('portuguese', fact));
CREATE INDEX IF NOT EXISTS idx_jarvis_files_path ON public.jarvis_files (path);

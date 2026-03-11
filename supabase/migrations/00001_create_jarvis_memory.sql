-- Migration: create jarvis_memory table
create table if not exists public.jarvis_memory (
  id uuid primary key default gen_random_uuid(),
  role text,
  content text,
  session_id text,
  importance int,
  created_at timestamptz default now()
);

create index if not exists idx_jarvis_memory_session on public.jarvis_memory (session_id);

-- Optional dev policy: allow inserts via anon key (uncomment if desired)
-- alter table public.jarvis_memory enable row level security;
-- create policy allow_all_insert on public.jarvis_memory
--   for insert using (true) with check (true);

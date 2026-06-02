-- Migration v2 : stockage complet de la collection
-- Supabase → SQL Editor → Run

alter table public.collections
  add column if not exists collection_data jsonb not null default '{}';

-- ============================================================
-- Migration v5 – Échanges Vinted
-- À exécuter dans : Supabase → SQL Editor → New query
-- ============================================================

create table public.vinted_exchanges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references public.profiles(id) on delete cascade,
  exchanges  jsonb not null default '[]',
  updated_at timestamptz default now() not null
);

-- RLS
alter table public.vinted_exchanges enable row level security;

create policy "L'utilisateur peut lire ses échanges Vinted"
  on public.vinted_exchanges for select
  using (auth.uid() = user_id);

create policy "L'utilisateur peut créer ses échanges Vinted"
  on public.vinted_exchanges for insert
  with check (auth.uid() = user_id);

create policy "L'utilisateur peut mettre à jour ses échanges Vinted"
  on public.vinted_exchanges for update
  using (auth.uid() = user_id);

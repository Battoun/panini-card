-- Migration v3 : demandes d'échange entre amis
-- Supabase → SQL Editor → Run

create table public.exchange_requests (
  id               uuid primary key default gen_random_uuid(),
  from_user_id     uuid not null references public.profiles(id) on delete cascade,
  to_user_id       uuid not null references public.profiles(id) on delete cascade,
  give_display_id  text not null,    -- carte que l'expéditeur donne
  recv_display_id  text not null,    -- carte que l'expéditeur reçoit
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at       timestamptz default now() not null
);

create index exchange_requests_from_idx on public.exchange_requests (from_user_id);
create index exchange_requests_to_idx   on public.exchange_requests (to_user_id);

alter table public.exchange_requests enable row level security;

create policy "Visible par les deux parties"
  on public.exchange_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "L'expéditeur peut créer"
  on public.exchange_requests for insert
  with check (auth.uid() = from_user_id);

create policy "Le destinataire peut répondre"
  on public.exchange_requests for update
  using (auth.uid() = to_user_id or auth.uid() = from_user_id);

create policy "L'expéditeur peut annuler"
  on public.exchange_requests for delete
  using (auth.uid() = from_user_id);

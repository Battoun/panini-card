-- ============================================================
-- Panini WC 2026 – Schéma Supabase
-- À exécuter dans : Supabase → SQL Editor → New query
-- ============================================================


-- ------------------------------------------------------------
-- 1. PROFILS UTILISATEURS
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  created_at  timestamptz default now() not null
);

-- Index pour les recherches de pseudo
create index profiles_username_idx on public.profiles (lower(username));

-- RLS
alter table public.profiles enable row level security;

create policy "Tout le monde peut lire les profils"
  on public.profiles for select
  using (true);

create policy "L'utilisateur peut modifier son profil"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger : crée le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- 2. DEMANDES D'AMIS
-- ------------------------------------------------------------
create table public.friend_requests (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz default now() not null,
  unique (from_user_id, to_user_id)
);

-- Empêche de s'envoyer une demande à soi-même
alter table public.friend_requests
  add constraint no_self_friend check (from_user_id != to_user_id);

create index friend_requests_to_user_idx on public.friend_requests (to_user_id);

-- RLS
alter table public.friend_requests enable row level security;

create policy "Visible par les deux parties"
  on public.friend_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "L'envoyeur peut créer une demande"
  on public.friend_requests for insert
  with check (auth.uid() = from_user_id);

create policy "Le destinataire peut accepter/rejeter"
  on public.friend_requests for update
  using (auth.uid() = to_user_id);

create policy "Les deux parties peuvent supprimer"
  on public.friend_requests for delete
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);


-- ------------------------------------------------------------
-- 3. COLLECTIONS (sync cloud – pour plus tard)
-- ------------------------------------------------------------
create table public.collections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique not null references public.profiles(id) on delete cascade,
  copies       jsonb not null default '{}',
  packs        integer not null default 0,
  last_updated timestamptz default now() not null
);

-- RLS
alter table public.collections enable row level security;

create policy "L'utilisateur peut lire sa propre collection"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Les amis peuvent lire la collection"
  on public.collections for select
  using (
    exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.from_user_id = auth.uid() and fr.to_user_id = user_id) or
          (fr.to_user_id   = auth.uid() and fr.from_user_id = user_id)
        )
    )
  );

create policy "L'utilisateur peut modifier sa collection"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "L'utilisateur peut mettre à jour sa collection"
  on public.collections for update
  using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 4. HISTORIQUE D'ÉCHANGES (sync cloud – pour plus tard)
-- ------------------------------------------------------------
create table public.exchange_history (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  give_display_id     text not null,
  receive_display_id  text not null,
  exchanged_at        timestamptz default now() not null
);

create index exchange_history_user_idx on public.exchange_history (user_id);

-- RLS
alter table public.exchange_history enable row level security;

create policy "L'utilisateur voit son historique"
  on public.exchange_history for select
  using (auth.uid() = user_id);

create policy "L'utilisateur peut enregistrer un échange"
  on public.exchange_history for insert
  with check (auth.uid() = user_id);

create policy "L'utilisateur peut supprimer ses échanges"
  on public.exchange_history for delete
  using (auth.uid() = user_id);

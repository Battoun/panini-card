-- Migration v4 : statut "completed" pour les demandes d'échange
-- Supabase → SQL Editor → Run

alter table public.exchange_requests
  drop constraint exchange_requests_status_check;

alter table public.exchange_requests
  add constraint exchange_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed'));

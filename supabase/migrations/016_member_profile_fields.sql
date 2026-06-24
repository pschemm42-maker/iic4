-- Run in Supabase SQL Editor after 015_portfolio_snapshots.sql
--
-- Adds member profile fields: about (self-editable), position and basis (admin-editable).

alter table public.profiles
  add column if not exists about text not null default '',
  add column if not exists position text not null default '',
  add column if not exists basis numeric(15,2),
  add column if not exists basis_last_edited timestamptz;

-- Allow any authenticated user to read all profiles (needed for the Members page).
-- Drop the old restrictive self-only read policy first.
drop policy if exists "Profiles are readable by service role only" on public.profiles;

create policy "Profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

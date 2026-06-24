-- Run in Supabase SQL Editor after 016_member_profile_fields.sql
--
-- Adds Club Cash (undeployed funds) tracking.
-- Club Cash comes from dividends, liquidated positions, and member contributions.
-- Total Club Equity = Market Value + Club Cash.

-- Persist club cash on each saved snapshot.
alter table public.portfolio_snapshots
  add column if not exists club_cash numeric(15, 2) not null default 0;

-- Singleton table for live portfolio-wide settings.
create table public.club_settings (
  id boolean primary key default true,
  club_cash numeric(15, 2) not null default 0,
  club_cash_updated_at timestamptz,
  club_cash_updated_by uuid references public.profiles(id) on delete set null,
  constraint club_settings_singleton check (id)
);

-- Seed the singleton row.
insert into public.club_settings (id, club_cash)
values (true, 0)
on conflict (id) do nothing;

alter table public.club_settings enable row level security;

create policy "Members can view club settings"
on public.club_settings
for select
to authenticated
using (true);

create policy "Administrators can update club settings"
on public.club_settings
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

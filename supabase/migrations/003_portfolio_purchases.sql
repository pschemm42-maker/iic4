-- Run in Supabase SQL Editor after 002_portfolio_holdings.sql

create table public.portfolio_purchases (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.portfolio_holdings(id) on delete cascade,
  shares numeric(18, 6) not null check (shares > 0),
  cost_per_share numeric(18, 4) not null check (cost_per_share >= 0),
  purchase_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index portfolio_purchases_holding_id_idx
  on public.portfolio_purchases (holding_id);

create index portfolio_purchases_purchase_date_idx
  on public.portfolio_purchases (purchase_date);

insert into public.portfolio_purchases (
  holding_id,
  shares,
  cost_per_share,
  purchase_date,
  notes
)
select
  id,
  shares,
  average_cost_per_share,
  purchase_date,
  notes
from public.portfolio_holdings;

alter table public.portfolio_purchases enable row level security;

create policy "Members can view portfolio purchases"
on public.portfolio_purchases
for select
to authenticated
using (true);

create policy "Administrators can add portfolio purchases"
on public.portfolio_purchases
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update portfolio purchases"
on public.portfolio_purchases
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete portfolio purchases"
on public.portfolio_purchases
for delete
to authenticated
using (public.is_administrator());

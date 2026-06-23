-- Run in Supabase SQL Editor after 014_stock_suggestion_research_detail.sql
--
-- Point-in-time portfolio snapshots independent from live holdings.

create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint portfolio_snapshots_date_unique unique (snapshot_date)
);

create index portfolio_snapshots_snapshot_date_idx
  on public.portfolio_snapshots (snapshot_date desc);

create table public.portfolio_snapshot_holdings (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.portfolio_snapshots(id) on delete cascade,
  ticker text not null,
  company_name text not null default '',
  shares numeric(18, 6) not null check (shares > 0),
  average_cost_per_share numeric(18, 4) not null check (average_cost_per_share >= 0),
  close_price numeric(18, 4) check (close_price is null or close_price >= 0),
  sector text not null default '',
  purchase_date date,
  dividend_yield numeric(8, 4) check (dividend_yield is null or dividend_yield >= 0),
  pe_ratio numeric(12, 4) check (pe_ratio is null or pe_ratio >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint portfolio_snapshot_holdings_snapshot_ticker_unique unique (snapshot_id, ticker)
);

create index portfolio_snapshot_holdings_snapshot_id_idx
  on public.portfolio_snapshot_holdings (snapshot_id);

create index portfolio_snapshot_holdings_ticker_idx
  on public.portfolio_snapshot_holdings (ticker);

create table public.portfolio_snapshot_purchases (
  id uuid primary key default gen_random_uuid(),
  snapshot_holding_id uuid not null references public.portfolio_snapshot_holdings(id) on delete cascade,
  shares numeric(18, 6) not null check (shares > 0),
  cost_per_share numeric(18, 4) not null check (cost_per_share >= 0),
  purchase_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index portfolio_snapshot_purchases_snapshot_holding_id_idx
  on public.portfolio_snapshot_purchases (snapshot_holding_id);

create or replace function public.set_portfolio_snapshot_holdings_ticker()
returns trigger
language plpgsql
as $$
begin
  new.ticker = upper(trim(new.ticker));
  return new;
end;
$$;

create trigger portfolio_snapshot_holdings_set_ticker
before insert or update on public.portfolio_snapshot_holdings
for each row
execute function public.set_portfolio_snapshot_holdings_ticker();

alter table public.portfolio_snapshots enable row level security;
alter table public.portfolio_snapshot_holdings enable row level security;
alter table public.portfolio_snapshot_purchases enable row level security;

create policy "Members can view portfolio snapshots"
on public.portfolio_snapshots
for select
to authenticated
using (true);

create policy "Administrators can add portfolio snapshots"
on public.portfolio_snapshots
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update portfolio snapshots"
on public.portfolio_snapshots
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete portfolio snapshots"
on public.portfolio_snapshots
for delete
to authenticated
using (public.is_administrator());

create policy "Members can view portfolio snapshot holdings"
on public.portfolio_snapshot_holdings
for select
to authenticated
using (true);

create policy "Administrators can add portfolio snapshot holdings"
on public.portfolio_snapshot_holdings
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update portfolio snapshot holdings"
on public.portfolio_snapshot_holdings
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete portfolio snapshot holdings"
on public.portfolio_snapshot_holdings
for delete
to authenticated
using (public.is_administrator());

create policy "Members can view portfolio snapshot purchases"
on public.portfolio_snapshot_purchases
for select
to authenticated
using (true);

create policy "Administrators can add portfolio snapshot purchases"
on public.portfolio_snapshot_purchases
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update portfolio snapshot purchases"
on public.portfolio_snapshot_purchases
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete portfolio snapshot purchases"
on public.portfolio_snapshot_purchases
for delete
to authenticated
using (public.is_administrator());

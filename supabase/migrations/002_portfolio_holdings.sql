-- Run in Supabase SQL Editor after 001_user_profiles.sql

create table public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  company_name text not null default '',
  shares numeric(18, 6) not null check (shares > 0),
  average_cost_per_share numeric(18, 4) not null check (average_cost_per_share >= 0),
  current_price numeric(18, 4) check (current_price is null or current_price >= 0),
  sector text not null default '',
  purchase_date date,
  dividend_yield numeric(8, 4) check (dividend_yield is null or dividend_yield >= 0),
  pe_ratio numeric(12, 4) check (pe_ratio is null or pe_ratio >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_holdings_ticker_unique unique (ticker)
);

create index portfolio_holdings_ticker_idx on public.portfolio_holdings (ticker);
create index portfolio_holdings_sector_idx on public.portfolio_holdings (sector);

create or replace function public.set_portfolio_holdings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.ticker = upper(trim(new.ticker));
  return new;
end;
$$;

create trigger portfolio_holdings_set_updated_at
before insert or update on public.portfolio_holdings
for each row
execute function public.set_portfolio_holdings_updated_at();

create or replace function public.is_administrator()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'administrator'
  );
$$;

alter table public.portfolio_holdings enable row level security;

create policy "Members can view portfolio holdings"
on public.portfolio_holdings
for select
to authenticated
using (true);

create policy "Administrators can add portfolio holdings"
on public.portfolio_holdings
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update portfolio holdings"
on public.portfolio_holdings
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete portfolio holdings"
on public.portfolio_holdings
for delete
to authenticated
using (public.is_administrator());

-- Run in Supabase SQL Editor after 003_portfolio_purchases.sql
--
-- Daily position snapshots: closing market price plus shares owned on that date.
-- Position value on a date = close_price * shares_owned.

create table public.portfolio_price_history (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.portfolio_holdings(id) on delete cascade,
  ticker text not null,
  price_date date not null,
  close_price numeric(18, 4) not null check (close_price >= 0),
  shares_owned numeric(18, 6) not null check (shares_owned >= 0),
  created_at timestamptz not null default now(),
  constraint portfolio_price_history_holding_date_unique unique (holding_id, price_date)
);

create index portfolio_price_history_holding_id_idx
  on public.portfolio_price_history (holding_id);

create index portfolio_price_history_ticker_idx
  on public.portfolio_price_history (ticker);

create index portfolio_price_history_price_date_idx
  on public.portfolio_price_history (price_date);

create index portfolio_price_history_ticker_date_idx
  on public.portfolio_price_history (ticker, price_date desc);

create or replace function public.set_portfolio_price_history_ticker()
returns trigger
language plpgsql
as $$
begin
  new.ticker = upper(trim(new.ticker));
  return new;
end;
$$;

create trigger portfolio_price_history_set_ticker
before insert or update on public.portfolio_price_history
for each row
execute function public.set_portfolio_price_history_ticker();

alter table public.portfolio_price_history enable row level security;

create policy "Members can view portfolio price history"
on public.portfolio_price_history
for select
to authenticated
using (true);

create policy "Administrators can add portfolio price history"
on public.portfolio_price_history
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update portfolio price history"
on public.portfolio_price_history
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete portfolio price history"
on public.portfolio_price_history
for delete
to authenticated
using (public.is_administrator());

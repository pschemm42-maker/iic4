-- Run in Supabase SQL Editor after 007_stock_suggestion_research_score.sql

create table public.stock_suggestion_research (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null unique references public.stock_suggestions(id) on delete cascade,
  score_value numeric(5, 2) not null check (score_value >= 0 and score_value <= 100),
  score_revenue numeric(5, 2) not null check (score_revenue >= 0 and score_revenue <= 100),
  score_growth numeric(5, 2) not null check (score_growth >= 0 and score_growth <= 100),
  score_profitability numeric(5, 2) not null check (score_profitability >= 0 and score_profitability <= 100),
  score_balance_sheet numeric(5, 2) not null check (score_balance_sheet >= 0 and score_balance_sheet <= 100),
  score_risk numeric(5, 2) not null check (score_risk >= 0 and score_risk <= 100),
  composite_score numeric(5, 2) not null check (composite_score >= 0 and composite_score <= 100),
  robinhood_recommendation text not null default '',
  schwab_recommendation text not null default '',
  fidelity_recommendation text not null default '',
  conclusion text not null default '',
  researched_by uuid not null references public.profiles(id) on delete cascade,
  researcher_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_suggestion_research_suggestion_id_idx
  on public.stock_suggestion_research (suggestion_id);

create or replace function public.set_stock_suggestion_research_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stock_suggestion_research_set_updated_at
before update on public.stock_suggestion_research
for each row
execute function public.set_stock_suggestion_research_updated_at();

alter table public.stock_suggestion_research enable row level security;

create policy "Members can view stock suggestion research"
on public.stock_suggestion_research
for select
to authenticated
using (true);

create policy "Members can add stock suggestion research"
on public.stock_suggestion_research
for insert
to authenticated
with check (researched_by = auth.uid());

create policy "Members can update stock suggestion research"
on public.stock_suggestion_research
for update
to authenticated
using (true)
with check (researched_by = auth.uid());

create policy "Administrators can update stock suggestion research"
on public.stock_suggestion_research
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

-- Run in Supabase SQL Editor after 004_portfolio_price_history.sql

create table public.stock_suggestions (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  company_name text not null default '',
  sector text not null default '',
  current_price numeric(18, 4) check (current_price is null or current_price >= 0),
  pe_ratio numeric(12, 4) check (pe_ratio is null or pe_ratio >= 0),
  dividend_yield numeric(8, 4) check (dividend_yield is null or dividend_yield >= 0),
  suggested_by uuid not null references public.profiles(id) on delete cascade,
  suggester_name text not null default '',
  recommendation_reason text not null default '',
  research_composite_score numeric(5, 2)
    check (research_composite_score is null or research_composite_score >= 0),
  created_at timestamptz not null default now()
);

create index stock_suggestions_ticker_idx on public.stock_suggestions (ticker);
create index stock_suggestions_created_at_idx on public.stock_suggestions (created_at desc);
create index stock_suggestions_suggested_by_idx on public.stock_suggestions (suggested_by);

create or replace function public.set_stock_suggestions_ticker()
returns trigger
language plpgsql
as $$
begin
  new.ticker = upper(trim(new.ticker));
  return new;
end;
$$;

create trigger stock_suggestions_set_ticker
before insert or update on public.stock_suggestions
for each row
execute function public.set_stock_suggestions_ticker();

alter table public.stock_suggestions enable row level security;

create policy "Members can view stock suggestions"
on public.stock_suggestions
for select
to authenticated
using (true);

create policy "Members can add stock suggestions"
on public.stock_suggestions
for insert
to authenticated
with check (suggested_by = auth.uid());

create policy "Members can delete own stock suggestions"
on public.stock_suggestions
for delete
to authenticated
using (suggested_by = auth.uid());

create policy "Administrators can delete stock suggestions"
on public.stock_suggestions
for delete
to authenticated
using (public.is_administrator());

create or replace function public.update_stock_suggestion_recommendation_reason(
  p_suggestion_id uuid,
  p_recommendation_reason text
)
returns public.stock_suggestions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.stock_suggestions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if length(trim(p_recommendation_reason)) = 0 then
    raise exception 'Member recommendation reason is required.';
  end if;

  if length(p_recommendation_reason) > 500 then
    raise exception 'Recommendation reason must be 500 characters or fewer.';
  end if;

  update public.stock_suggestions
  set recommendation_reason = trim(p_recommendation_reason)
  where id = p_suggestion_id
  returning * into updated;

  if updated.id is null then
    raise exception 'Suggestion not found.';
  end if;

  return updated;
end;
$$;

grant execute on function public.update_stock_suggestion_recommendation_reason(uuid, text)
to authenticated;

create or replace function public.update_stock_suggestion_composite_score(
  p_suggestion_id uuid,
  p_composite_score numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_composite_score is null or p_composite_score < 0 or p_composite_score > 100 then
    raise exception 'Composite score must be between 0 and 100.';
  end if;

  update public.stock_suggestions
  set research_composite_score = p_composite_score
  where id = p_suggestion_id;

  if not found then
    raise exception 'Suggestion not found.';
  end if;
end;
$$;

grant execute on function public.update_stock_suggestion_composite_score(uuid, numeric)
to authenticated;

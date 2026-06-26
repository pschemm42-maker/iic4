-- Run in Supabase SQL Editor after 020_dashboard_messages.sql
--
-- Point-in-time equity selection meeting snapshots independent from live suggestions.

create table public.equity_selection_meetings (
  id uuid primary key default gen_random_uuid(),
  saved_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  suggestion_count int not null check (suggestion_count >= 0),
  vote_count int not null check (vote_count >= 0)
);

create index equity_selection_meetings_saved_at_idx
  on public.equity_selection_meetings (saved_at desc);

create index equity_selection_meetings_is_active_idx
  on public.equity_selection_meetings (is_active)
  where is_active = true;

create table public.equity_selection_meeting_suggestions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.equity_selection_meetings(id) on delete cascade,
  source_suggestion_id uuid,
  ticker text not null,
  company_name text not null default '',
  sector text not null default '',
  current_price numeric(18, 4) check (current_price is null or current_price >= 0),
  pe_ratio numeric(12, 4) check (pe_ratio is null or pe_ratio >= 0),
  dividend_yield numeric(8, 4) check (dividend_yield is null or dividend_yield >= 0),
  suggested_by uuid not null,
  suggester_name text not null default '',
  recommendation_reason text not null default '',
  research_composite_score numeric(5, 2)
    check (research_composite_score is null or research_composite_score >= 0),
  created_at timestamptz not null
);

create index equity_selection_meeting_suggestions_meeting_id_idx
  on public.equity_selection_meeting_suggestions (meeting_id);

create index equity_selection_meeting_suggestions_ticker_idx
  on public.equity_selection_meeting_suggestions (ticker);

create or replace function public.set_equity_selection_meeting_suggestions_ticker()
returns trigger
language plpgsql
as $$
begin
  new.ticker = upper(trim(new.ticker));
  return new;
end;
$$;

create trigger equity_selection_meeting_suggestions_set_ticker
before insert or update on public.equity_selection_meeting_suggestions
for each row
execute function public.set_equity_selection_meeting_suggestions_ticker();

create table public.equity_selection_meeting_research (
  id uuid primary key default gen_random_uuid(),
  meeting_suggestion_id uuid not null unique
    references public.equity_selection_meeting_suggestions(id) on delete cascade,
  score_value numeric(5, 2) not null check (score_value >= 0 and score_value <= 100),
  score_revenue numeric(5, 2) not null check (score_revenue >= 0 and score_revenue <= 100),
  score_growth numeric(5, 2) not null check (score_growth >= 0 and score_growth <= 100),
  score_profitability numeric(5, 2) not null check (score_profitability >= 0 and score_profitability <= 100),
  score_balance_sheet numeric(5, 2) not null check (score_balance_sheet >= 0 and score_balance_sheet <= 100),
  score_risk numeric(5, 2) not null check (score_risk >= 0 and score_risk <= 100),
  composite_score numeric(5, 2) not null check (composite_score >= 0 and composite_score <= 100),
  data_coverage numeric(5, 4) check (data_coverage is null or (data_coverage >= 0 and data_coverage <= 1)),
  analysis_detail jsonb,
  analyst_trends jsonb,
  yahoo_insights jsonb,
  robinhood_recommendation text not null default '',
  schwab_recommendation text not null default '',
  fidelity_recommendation text not null default '',
  conclusion text not null default '',
  researched_by uuid not null,
  researcher_name text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index equity_selection_meeting_research_meeting_suggestion_id_idx
  on public.equity_selection_meeting_research (meeting_suggestion_id);

create table public.equity_selection_meeting_votes (
  id uuid primary key default gen_random_uuid(),
  meeting_suggestion_id uuid not null
    references public.equity_selection_meeting_suggestions(id) on delete cascade,
  voter_id uuid not null,
  voter_name text not null default '',
  created_at timestamptz not null,
  constraint equity_selection_meeting_votes_unique unique (meeting_suggestion_id, voter_id)
);

create index equity_selection_meeting_votes_meeting_suggestion_id_idx
  on public.equity_selection_meeting_votes (meeting_suggestion_id);

alter table public.equity_selection_meetings enable row level security;
alter table public.equity_selection_meeting_suggestions enable row level security;
alter table public.equity_selection_meeting_research enable row level security;
alter table public.equity_selection_meeting_votes enable row level security;

create policy "Members can view equity selection meetings"
on public.equity_selection_meetings
for select
to authenticated
using (true);

create policy "Administrators can add equity selection meetings"
on public.equity_selection_meetings
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update equity selection meetings"
on public.equity_selection_meetings
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete equity selection meetings"
on public.equity_selection_meetings
for delete
to authenticated
using (public.is_administrator());

create policy "Members can view equity selection meeting suggestions"
on public.equity_selection_meeting_suggestions
for select
to authenticated
using (true);

create policy "Administrators can add equity selection meeting suggestions"
on public.equity_selection_meeting_suggestions
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update equity selection meeting suggestions"
on public.equity_selection_meeting_suggestions
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete equity selection meeting suggestions"
on public.equity_selection_meeting_suggestions
for delete
to authenticated
using (public.is_administrator());

create policy "Members can view equity selection meeting research"
on public.equity_selection_meeting_research
for select
to authenticated
using (true);

create policy "Administrators can add equity selection meeting research"
on public.equity_selection_meeting_research
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update equity selection meeting research"
on public.equity_selection_meeting_research
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete equity selection meeting research"
on public.equity_selection_meeting_research
for delete
to authenticated
using (public.is_administrator());

create policy "Members can view equity selection meeting votes"
on public.equity_selection_meeting_votes
for select
to authenticated
using (true);

create policy "Administrators can add equity selection meeting votes"
on public.equity_selection_meeting_votes
for insert
to authenticated
with check (public.is_administrator());

create policy "Administrators can update equity selection meeting votes"
on public.equity_selection_meeting_votes
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

create policy "Administrators can delete equity selection meeting votes"
on public.equity_selection_meeting_votes
for delete
to authenticated
using (public.is_administrator());

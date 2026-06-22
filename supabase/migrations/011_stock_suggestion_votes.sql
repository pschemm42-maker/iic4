-- Run in Supabase SQL Editor after 010_stock_suggestion_composite_score_update.sql

create table public.stock_suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.stock_suggestions(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  voter_name text not null default '',
  created_at timestamptz not null default now(),
  unique (suggestion_id, voter_id)
);

create index stock_suggestion_votes_suggestion_id_idx
  on public.stock_suggestion_votes (suggestion_id);

create index stock_suggestion_votes_voter_id_idx
  on public.stock_suggestion_votes (voter_id);

alter table public.stock_suggestion_votes enable row level security;

create policy "Members can view stock suggestion votes"
on public.stock_suggestion_votes
for select
to authenticated
using (true);

create policy "Members can add own stock suggestion vote"
on public.stock_suggestion_votes
for insert
to authenticated
with check (voter_id = auth.uid());

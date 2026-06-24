-- Run in Supabase SQL Editor after 019_stock_suggestion_research_yahoo.sql
--
-- Club-wide dashboard messages visible to all authenticated members.

create table public.dashboard_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dashboard_messages_body_length check (char_length(body) <= 2000)
);

create index dashboard_messages_created_at_idx
  on public.dashboard_messages (created_at desc);

create or replace function public.set_dashboard_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dashboard_messages_set_updated_at
before update on public.dashboard_messages
for each row
execute function public.set_dashboard_messages_updated_at();

alter table public.dashboard_messages enable row level security;

create policy "Members can view dashboard messages"
on public.dashboard_messages
for select
to authenticated
using (true);

create policy "Members can add dashboard messages"
on public.dashboard_messages
for insert
to authenticated
with check (author_id = auth.uid());

create policy "Members can update dashboard messages"
on public.dashboard_messages
for update
to authenticated
using (true)
with check (true);

create policy "Members can delete dashboard messages"
on public.dashboard_messages
for delete
to authenticated
using (true);

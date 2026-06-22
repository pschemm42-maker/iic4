-- Run in Supabase SQL Editor after 011_stock_suggestion_votes.sql

create policy "Members can remove own stock suggestion vote"
on public.stock_suggestion_votes
for delete
to authenticated
using (voter_id = auth.uid());

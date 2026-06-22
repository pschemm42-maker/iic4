-- Run in Supabase SQL Editor after 009_stock_suggestion_reason_update.sql

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

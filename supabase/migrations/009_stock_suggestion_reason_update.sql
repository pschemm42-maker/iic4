-- Run in Supabase SQL Editor after 008_stock_suggestion_research.sql

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

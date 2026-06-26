-- Run in Supabase SQL Editor after 021_equity_selection_meetings.sql
--
-- Allows authenticated members to refresh market fields on a suggestion when research is captured.

create or replace function public.update_stock_suggestion_market_data(
  p_suggestion_id uuid,
  p_current_price numeric,
  p_pe_ratio numeric,
  p_dividend_yield numeric
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

  if p_current_price is not null and p_current_price < 0 then
    raise exception 'Current price must be zero or greater.';
  end if;

  if p_pe_ratio is not null and p_pe_ratio < 0 then
    raise exception 'P/E ratio must be zero or greater.';
  end if;

  if p_dividend_yield is not null and p_dividend_yield < 0 then
    raise exception 'Dividend yield must be zero or greater.';
  end if;

  update public.stock_suggestions
  set
    current_price = p_current_price,
    pe_ratio = p_pe_ratio,
    dividend_yield = p_dividend_yield
  where id = p_suggestion_id;

  if not found then
    raise exception 'Suggestion not found.';
  end if;
end;
$$;

grant execute on function public.update_stock_suggestion_market_data(uuid, numeric, numeric, numeric)
to authenticated;

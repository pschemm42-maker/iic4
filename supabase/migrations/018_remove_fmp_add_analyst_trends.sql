-- Run in Supabase SQL Editor after 017_club_cash.sql
-- Removes unused FMP column; adds Finnhub sell-side trend history for research display.

alter table public.stock_suggestion_research
  drop column if exists fmp_insights;

alter table public.stock_suggestion_research
  add column if not exists analyst_trends jsonb;

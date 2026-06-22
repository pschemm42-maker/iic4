-- Run in Supabase SQL Editor after 013_user_status_pending.sql
-- Adds structured statistical analysis detail to research records.

alter table public.stock_suggestion_research
  add column if not exists data_coverage numeric(5, 4)
    check (data_coverage is null or (data_coverage >= 0 and data_coverage <= 1));

alter table public.stock_suggestion_research
  add column if not exists analysis_detail jsonb;

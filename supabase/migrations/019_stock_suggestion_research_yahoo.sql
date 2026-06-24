-- Run in Supabase SQL Editor after 018_remove_fmp_add_analyst_trends.sql
-- Adds display-only Yahoo Finance insights (price targets, estimates, trend, news) to research records.

alter table public.stock_suggestion_research
  add column if not exists yahoo_insights jsonb;

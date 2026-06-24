-- Run in Supabase SQL Editor after 015_portfolio_snapshots.sql
-- Adds display-only Financial Modeling Prep (free-tier) analyst insights to research records.

alter table public.stock_suggestion_research
  add column if not exists fmp_insights jsonb;

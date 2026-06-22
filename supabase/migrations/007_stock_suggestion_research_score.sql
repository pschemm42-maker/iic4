-- Run in Supabase SQL Editor after 006_stock_suggestion_recommendation_reason.sql

alter table public.stock_suggestions
add column research_composite_score numeric(5, 2)
  check (research_composite_score is null or research_composite_score >= 0);

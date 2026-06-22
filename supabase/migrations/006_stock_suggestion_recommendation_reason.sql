-- Run in Supabase SQL Editor after 005_stock_suggestions.sql

alter table public.stock_suggestions
add column recommendation_reason text not null default '';

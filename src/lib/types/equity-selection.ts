export type StockSuggestion = {
  id: string;
  ticker: string;
  company_name: string;
  sector: string;
  current_price: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  suggested_by: string;
  suggester_name: string;
  recommendation_reason: string;
  research_composite_score: number | null;
  vote_count: number;
  current_user_has_voted: boolean;
  created_at: string;
};

export type StockSuggestionVote = {
  id: string;
  suggestion_id: string;
  voter_id: string;
  voter_name: string;
  created_at: string;
};

import type { AnalysisDetail } from "@/lib/equity-selection/scoring";

export type StockSuggestionResearch = {
  id: string;
  suggestion_id: string;
  score_value: number;
  score_revenue: number;
  score_growth: number;
  score_profitability: number;
  score_balance_sheet: number;
  score_risk: number;
  composite_score: number;
  data_coverage: number | null;
  analysis_detail: AnalysisDetail | null;
  robinhood_recommendation: string;
  schwab_recommendation: string;
  fidelity_recommendation: string;
  conclusion: string;
  researched_by: string;
  researcher_name: string;
  created_at: string;
  updated_at: string;
};

export const RESEARCH_SCORE_CATEGORIES = [
  {
    key: "score_value",
    label: "Value",
    description: "How cheap the stock is on earnings, sales, book, and cash flow. Higher = cheaper.",
  },
  {
    key: "score_revenue",
    label: "Revenue",
    description: "Revenue quality and scale via margins and company size. Higher = stronger.",
  },
  {
    key: "score_growth",
    label: "Growth",
    description: "Revenue and earnings growth, recent and multi-year. Higher = faster.",
  },
  {
    key: "score_profitability",
    label: "Profitability",
    description: "Margins and returns on equity/assets. Losses score low. Higher = more profitable.",
  },
  {
    key: "score_balance_sheet",
    label: "Balance Sheet",
    description: "Liquidity, leverage, and interest coverage. Higher = stronger finances.",
  },
  {
    key: "score_risk",
    label: "Risk",
    description: "Stability from beta, leverage, and earnings consistency. Higher = LOWER risk.",
  },
] as const;

export const RESEARCH_BROKER_SOURCES = [
  { key: "robinhood_recommendation", label: "Robinhood" },
  { key: "schwab_recommendation", label: "Schwab" },
  { key: "fidelity_recommendation", label: "Fidelity" },
] as const;

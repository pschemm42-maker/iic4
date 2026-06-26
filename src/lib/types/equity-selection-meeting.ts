import type {
  StockSuggestion,
  StockSuggestionResearch,
  StockSuggestionVote,
} from "@/lib/types/equity-selection";

export type EquitySelectionMeeting = {
  id: string;
  saved_at: string;
  created_by: string | null;
  is_active: boolean;
  suggestion_count: number;
  vote_count: number;
};

export type EquitySelectionMeetingSummary = EquitySelectionMeeting;

export type EquitySelectionMeetingSuggestion = {
  id: string;
  meeting_id: string;
  source_suggestion_id: string | null;
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
  created_at: string;
};

export type EquitySelectionMeetingResearch = {
  id: string;
  meeting_suggestion_id: string;
  score_value: number;
  score_revenue: number;
  score_growth: number;
  score_profitability: number;
  score_balance_sheet: number;
  score_risk: number;
  composite_score: number;
  data_coverage: number | null;
  analysis_detail: StockSuggestionResearch["analysis_detail"];
  analyst_trends: StockSuggestionResearch["analyst_trends"];
  yahoo_insights: StockSuggestionResearch["yahoo_insights"];
  robinhood_recommendation: string;
  schwab_recommendation: string;
  fidelity_recommendation: string;
  conclusion: string;
  researched_by: string;
  researcher_name: string;
  created_at: string;
  updated_at: string;
};

export type EquitySelectionMeetingVote = {
  id: string;
  meeting_suggestion_id: string;
  voter_id: string;
  voter_name: string;
  created_at: string;
};

export function meetingSuggestionToStockSuggestion(
  suggestion: EquitySelectionMeetingSuggestion,
  options?: { voteCount?: number },
): StockSuggestion {
  return {
    id: suggestion.id,
    ticker: suggestion.ticker,
    company_name: suggestion.company_name,
    sector: suggestion.sector,
    current_price: suggestion.current_price,
    pe_ratio: suggestion.pe_ratio,
    dividend_yield: suggestion.dividend_yield,
    suggested_by: suggestion.suggested_by,
    suggester_name: suggestion.suggester_name,
    recommendation_reason: suggestion.recommendation_reason,
    research_composite_score: suggestion.research_composite_score,
    vote_count: options?.voteCount ?? 0,
    current_user_has_voted: false,
    created_at: suggestion.created_at,
  };
}

export function meetingResearchToStockSuggestionResearch(
  research: EquitySelectionMeetingResearch,
): StockSuggestionResearch {
  return {
    id: research.id,
    suggestion_id: research.meeting_suggestion_id,
    score_value: research.score_value,
    score_revenue: research.score_revenue,
    score_growth: research.score_growth,
    score_profitability: research.score_profitability,
    score_balance_sheet: research.score_balance_sheet,
    score_risk: research.score_risk,
    composite_score: research.composite_score,
    data_coverage: research.data_coverage,
    analysis_detail: research.analysis_detail,
    analyst_trends: research.analyst_trends,
    yahoo_insights: research.yahoo_insights,
    robinhood_recommendation: research.robinhood_recommendation,
    schwab_recommendation: research.schwab_recommendation,
    fidelity_recommendation: research.fidelity_recommendation,
    conclusion: research.conclusion,
    researched_by: research.researched_by,
    researcher_name: research.researcher_name,
    created_at: research.created_at,
    updated_at: research.updated_at,
  };
}

export function meetingVoteToStockSuggestionVote(
  vote: EquitySelectionMeetingVote,
): StockSuggestionVote {
  return {
    id: vote.id,
    suggestion_id: vote.meeting_suggestion_id,
    voter_id: vote.voter_id,
    voter_name: vote.voter_name,
    created_at: vote.created_at,
  };
}

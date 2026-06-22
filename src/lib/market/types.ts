export type HoldingMarketData = {
  currentPrice: number | null;
  companyName: string | null;
  sector: string | null;
  peRatio: number | null;
  dividendYield: number | null;
};

export type QuoteResult =
  | { success: true; ticker: string; currentPrice: number }
  | { success: false; ticker: string; error: string };

export type BatchQuoteResult = {
  succeeded: Array<{ ticker: string; currentPrice: number }>;
  failed: Array<{ ticker: string; error: string }>;
};

export type FinnhubResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type RecommendationTrendPeriod = {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

/**
 * Normalized financial metrics pulled from Finnhub `/stock/metric?metric=all`.
 * Every field is nullable because coverage varies by ticker and plan tier.
 * Margins, growth rates, and returns are expressed in percent (e.g. 25.3 = 25.3%).
 * Valuation multiples, ratios, and beta are plain ratios. Market cap is in millions USD.
 */
export type FinancialMetrics = {
  marketCapitalization: number | null;
  // Revenue magnitude (higher is bigger)
  revenueTTM: number | null;
  revenuePerShareTTM: number | null;
  // Valuation (lower is cheaper)
  peTTM: number | null;
  psTTM: number | null;
  pbRatio: number | null;
  pfcfShareTTM: number | null;
  // Margins / profitability (higher is better; percent)
  grossMarginTTM: number | null;
  operatingMarginTTM: number | null;
  netProfitMarginTTM: number | null;
  roeTTM: number | null;
  roaTTM: number | null;
  // Growth (higher is better; percent)
  revenueGrowthTTMYoy: number | null;
  revenueGrowth5Y: number | null;
  epsGrowthTTMYoy: number | null;
  epsGrowth5Y: number | null;
  // Balance sheet
  currentRatio: number | null;
  debtToEquity: number | null;
  netInterestCoverageTTM: number | null;
  // Risk / stability
  beta: number | null;
  priceReturn52Week: number | null;
  // Income
  dividendYieldIndicatedAnnual: number | null;
  payoutRatioTTM: number | null;
};

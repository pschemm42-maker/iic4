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

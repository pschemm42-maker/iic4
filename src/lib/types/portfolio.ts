export type PortfolioPurchase = {
  id: string;
  holding_id: string;
  shares: number;
  cost_per_share: number;
  purchase_date: string | null;
  notes: string;
  created_at: string;
};

export type PortfolioHolding = {
  id: string;
  ticker: string;
  company_name: string;
  shares: number;
  average_cost_per_share: number;
  current_price: number | null;
  sector: string;
  purchase_date: string | null;
  dividend_yield: number | null;
  pe_ratio: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  purchase_count: number;
};

export type PortfolioHoldingInput = {
  ticker: string;
  companyName: string;
  shares: number;
  costPerShare: number;
  currentPrice: number | null;
  sector: string;
  purchaseDate: string | null;
  dividendYield: number | null;
  peRatio: number | null;
  notes: string;
};

export type PortfolioHoldingWithMetrics = PortfolioHolding & {
  costBasis: number;
  marketValue: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
  portfolioWeight: number | null;
};

export type PortfolioSummary = {
  totalCostBasis: number;
  totalMarketValue: number | null;
  totalGainLoss: number | null;
  totalGainLossPercent: number | null;
  holdingCount: number;
};

import type { PortfolioHolding, PortfolioSummary } from "@/lib/types/portfolio";

export type PortfolioSnapshot = {
  id: string;
  snapshot_date: string;
  created_at: string;
  created_by: string | null;
  club_cash: number;
};

export type PortfolioSnapshotHolding = {
  id: string;
  snapshot_id: string;
  ticker: string;
  company_name: string;
  shares: number;
  average_cost_per_share: number;
  close_price: number | null;
  sector: string;
  purchase_date: string | null;
  dividend_yield: number | null;
  pe_ratio: number | null;
  notes: string;
  created_at: string;
};

export type PortfolioSnapshotPurchase = {
  id: string;
  snapshot_holding_id: string;
  shares: number;
  cost_per_share: number;
  purchase_date: string | null;
  notes: string;
  created_at: string;
};

export type PortfolioSnapshotSummary = PortfolioSnapshot & PortfolioSummary;

export type PortfolioSnapshotHoldingInput = {
  ticker: string;
  companyName: string;
  shares: number;
  averageCostPerShare: number;
  closePrice: number | null;
  sector: string;
  purchaseDate: string | null;
  dividendYield: number | null;
  peRatio: number | null;
  notes: string;
};

export type PortfolioSnapshotHoldingUpdateInput = {
  ticker: string;
  companyName: string;
  closePrice: number | null;
  sector: string;
  dividendYield: number | null;
  peRatio: number | null;
  notes: string;
  shares?: number;
  costPerShare?: number;
  purchaseDate?: string | null;
};

export type PortfolioSnapshotPurchaseUpdateInput = {
  shares: number;
  costPerShare: number;
  purchaseDate: string | null;
  notes: string;
};

export function snapshotHoldingToPortfolioHolding(
  holding: PortfolioSnapshotHolding,
  purchaseCount: number,
): PortfolioHolding {
  return {
    id: holding.id,
    ticker: holding.ticker,
    company_name: holding.company_name,
    shares: holding.shares,
    average_cost_per_share: holding.average_cost_per_share,
    current_price: holding.close_price,
    sector: holding.sector,
    purchase_date: holding.purchase_date,
    dividend_yield: holding.dividend_yield,
    pe_ratio: holding.pe_ratio,
    notes: holding.notes,
    created_at: holding.created_at,
    updated_at: holding.created_at,
    purchase_count: purchaseCount,
  };
}

export function snapshotPurchaseToPortfolioPurchase(
  purchase: PortfolioSnapshotPurchase,
): {
  id: string;
  holding_id: string;
  shares: number;
  cost_per_share: number;
  purchase_date: string | null;
  notes: string;
  created_at: string;
} {
  return {
    id: purchase.id,
    holding_id: purchase.snapshot_holding_id,
    shares: purchase.shares,
    cost_per_share: purchase.cost_per_share,
    purchase_date: purchase.purchase_date,
    notes: purchase.notes,
    created_at: purchase.created_at,
  };
}

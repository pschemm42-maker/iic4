import type {
  PortfolioHolding,
  PortfolioHoldingWithMetrics,
  PortfolioSummary,
} from "@/lib/types/portfolio";

export function calculateHoldingMetrics(
  holding: PortfolioHolding,
  totalMarketValue: number | null,
): PortfolioHoldingWithMetrics {
  const costBasis = holding.shares * holding.average_cost_per_share;
  const marketValue =
    holding.current_price !== null
      ? holding.shares * holding.current_price
      : null;
  const gainLoss =
    marketValue !== null ? marketValue - costBasis : null;
  const gainLossPercent =
    gainLoss !== null && costBasis > 0
      ? (gainLoss / costBasis) * 100
      : null;
  const portfolioWeight =
    marketValue !== null && totalMarketValue !== null && totalMarketValue > 0
      ? (marketValue / totalMarketValue) * 100
      : null;

  return {
    ...holding,
    costBasis,
    marketValue,
    gainLoss,
    gainLossPercent,
    portfolioWeight,
  };
}

export function calculatePortfolioSummary(
  holdings: PortfolioHoldingWithMetrics[],
  clubCash = 0,
): PortfolioSummary {
  const totalCostBasis = holdings.reduce(
    (sum, holding) => sum + holding.costBasis,
    0,
  );
  const hasAllPrices = holdings.every(
    (holding) => holding.marketValue !== null,
  );
  const totalMarketValue = hasAllPrices
    ? holdings.reduce((sum, holding) => sum + (holding.marketValue ?? 0), 0)
    : null;
  const totalGainLoss =
    totalMarketValue !== null ? totalMarketValue - totalCostBasis : null;
  const totalGainLossPercent =
    totalGainLoss !== null && totalCostBasis > 0
      ? (totalGainLoss / totalCostBasis) * 100
      : null;
  const totalClubEquity =
    totalMarketValue !== null ? totalMarketValue + clubCash : null;

  return {
    totalCostBasis,
    totalMarketValue,
    totalGainLoss,
    totalGainLossPercent,
    holdingCount: holdings.length,
    clubCash,
    totalClubEquity,
  };
}

export function enrichHoldings(
  holdings: PortfolioHolding[],
): PortfolioHoldingWithMetrics[] {
  const preliminary = holdings.map((holding) =>
    calculateHoldingMetrics(holding, null),
  );
  const totalMarketValue = preliminary.every(
    (holding) => holding.marketValue !== null,
  )
    ? preliminary.reduce((sum, holding) => sum + (holding.marketValue ?? 0), 0)
    : null;

  return holdings.map((holding) =>
    calculateHoldingMetrics(holding, totalMarketValue),
  );
}

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null, showSign = true) {
  if (value === null) {
    return "—";
  }

  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatAllocationPercent(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

export function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export function gainLossClassName(value: number | null) {
  if (value === null) {
    return "text-zinc-500";
  }

  if (value > 0) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (value < 0) {
    return "text-red-600 dark:text-red-400";
  }

  return "text-zinc-500";
}

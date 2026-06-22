import { BrandStatCard } from "@/components/brand/brand-card";
import {
  calculatePortfolioSummary,
  formatCurrency,
  formatPercent,
  gainLossClassName,
} from "@/lib/portfolio/metrics";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

type PortfolioSummaryCardsProps = {
  holdings: PortfolioHoldingWithMetrics[];
};

export function PortfolioSummaryCards({ holdings }: PortfolioSummaryCardsProps) {
  const summary = calculatePortfolioSummary(holdings);

  const cards = [
    { label: "Holdings", value: String(summary.holdingCount) },
    { label: "Total cost basis", value: formatCurrency(summary.totalCostBasis) },
    { label: "Market value", value: formatCurrency(summary.totalMarketValue) },
    {
      label: "Total gain/loss",
      value: formatCurrency(summary.totalGainLoss),
      valueClassName: gainLossClassName(summary.totalGainLoss),
    },
    {
      label: "Total return",
      value: formatPercent(summary.totalGainLossPercent),
      valueClassName: gainLossClassName(summary.totalGainLossPercent),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <BrandStatCard
          key={card.label}
          label={card.label}
          value={card.value}
          valueClassName={card.valueClassName}
        />
      ))}
    </div>
  );
}

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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {card.label}
          </p>
          <p
            className={`mt-2 text-xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50 ${card.valueClassName ?? ""}`}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

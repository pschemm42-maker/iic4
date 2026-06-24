"use client";

import { parseBrokerRecommendation } from "@/lib/equity-selection/broker-ratings";
import { formatNumber } from "@/lib/portfolio/metrics";
import type { RecommendationTrendPeriod } from "@/lib/market/types";
import type { StockSuggestionResearch } from "@/lib/types/equity-selection";

function buyPercent(period: RecommendationTrendPeriod) {
  const buyCount = period.strongBuy + period.buy;
  const total =
    buyCount + period.hold + period.sell + period.strongSell;
  if (total === 0) {
    return null;
  }
  return Math.round((buyCount / total) * 1000) / 10;
}

function TrendTable({ trends }: { trends: RecommendationTrendPeriod[] }) {
  const rows = trends.slice(0, 4);

  return (
    <table className="mt-2 w-full text-[12px]">
      <thead>
        <tr className="text-left text-zinc-500">
          <th className="pb-1 font-medium">Period</th>
          <th className="pb-1 font-medium">Strong buy</th>
          <th className="pb-1 font-medium">Buy</th>
          <th className="pb-1 font-medium">Hold</th>
          <th className="pb-1 font-medium">Sell</th>
          <th className="pb-1 font-medium">Strong sell</th>
          <th className="pb-1 text-right font-medium">% Buy</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((period) => {
          const pct = buyPercent(period);
          return (
            <tr
              key={period.period}
              className="border-t border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              <td className="py-0.5 pr-2">{period.period}</td>
              <td className="py-0.5 tabular-nums">{period.strongBuy}</td>
              <td className="py-0.5 tabular-nums">{period.buy}</td>
              <td className="py-0.5 tabular-nums">{period.hold}</td>
              <td className="py-0.5 tabular-nums">{period.sell}</td>
              <td className="py-0.5 tabular-nums">{period.strongSell}</td>
              <td className="py-0.5 text-right tabular-nums text-brand-teal">
                {pct !== null ? `${formatNumber(pct, 1)}%` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function BrokerRecommendationsSection({
  research,
  compact = false,
}: {
  research: StockSuggestionResearch;
  compact?: boolean;
}) {
  const rating = parseBrokerRecommendation(research.robinhood_recommendation);
  const trends = research.analyst_trends;

  if (compact) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-[11px] font-medium uppercase tracking-wider text-brand-gold">
          Sell-side analyst consensus
        </p>
        <p className="mt-0.5 text-base font-semibold text-zinc-950 dark:text-zinc-50">
          {rating.grade}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-zinc-600 dark:text-zinc-400">
          {rating.takeaway}
        </p>
        {trends && trends.length > 0 ? (
          <TrendTable trends={trends} />
        ) : (
          <p className="mt-1 text-[12px] text-zinc-500">
            Recapture research to load multi-period trend history.
          </p>
        )}
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        Sell-side analyst consensus
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Finnhub sell-side buy/hold/sell counts by reporting period.
      </p>
      <div className="mt-3 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Latest consensus
        </p>
        <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          {rating.grade}
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {rating.takeaway}
        </p>
        {trends && trends.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <TrendTable trends={trends} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatAllocationPercent,
  gainLossClassName,
} from "@/lib/portfolio/metrics";
import { refreshHoldingStats, removeHolding } from "@/lib/portfolio/actions";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

type PortfolioTableProps = {
  holdings: PortfolioHoldingWithMetrics[];
  isAdministrator: boolean;
};

export function PortfolioTable({
  holdings,
  isAdministrator,
}: PortfolioTableProps) {
  const [isPending, startTransition] = useTransition();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  function handleRefresh(holdingId: string) {
    setRefreshingId(holdingId);

    startTransition(async () => {
      const result = await refreshHoldingStats(holdingId);
      setRefreshingId(null);

      if (!result.success) {
        alert(result.error);
      }
    });
  }

  function handleRemove(holdingId: string, ticker: string) {
    if (!confirm(`Remove ${ticker} from the portfolio?`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeHolding(holdingId);
      if (!result.success) {
        alert(result.error);
      }
    });
  }

  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No holdings yet.
          {isAdministrator
            ? " Add a stock ticker to start tracking the club portfolio."
            : " An administrator can add holdings for the club."}
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Ticker</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium text-right">Shares</th>
              <th className="px-4 py-3 font-medium text-right">Avg cost</th>
              <th className="px-4 py-3 font-medium text-right">Current</th>
              <th className="px-4 py-3 font-medium text-right">Cost basis</th>
              <th className="px-4 py-3 font-medium text-right">Market value</th>
              <th className="px-4 py-3 font-medium text-right">Gain/Loss</th>
              <th className="px-4 py-3 font-medium text-right">Return</th>
              <th className="px-4 py-3 font-medium text-right">Weight</th>
              <th className="px-4 py-3 font-medium text-right">P/E</th>
              <th className="px-4 py-3 font-medium text-right">Div yield</th>
              <th className="px-4 py-3 font-medium">Purchased</th>
              {isAdministrator ? (
                <th className="px-4 py-3 font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr
                key={holding.id}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-semibold text-zinc-950 dark:text-zinc-50">
                  {holding.ticker}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  <div>{holding.company_name}</div>
                  {holding.notes ? (
                    <div className="mt-1 max-w-xs truncate text-xs text-zinc-500">
                      {holding.notes}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {holding.sector || "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatNumber(holding.shares, 4)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.average_cost_per_share)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.current_price)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.costBasis)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-medium ${gainLossClassName(holding.gainLoss)}`}
                >
                  {formatCurrency(holding.gainLoss)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-medium ${gainLossClassName(holding.gainLossPercent)}`}
                >
                  {formatPercent(holding.gainLossPercent)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatAllocationPercent(holding.portfolioWeight)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {holding.pe_ratio !== null
                    ? formatNumber(holding.pe_ratio, 2)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {holding.dividend_yield !== null
                    ? formatAllocationPercent(holding.dividend_yield)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {holding.purchase_date
                    ? new Date(holding.purchase_date).toLocaleDateString()
                    : "—"}
                </td>
                {isAdministrator ? (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRefresh(holding.id)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {refreshingId === holding.id ? "Refreshing..." : "Refresh"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemove(holding.id, holding.ticker)}
                        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

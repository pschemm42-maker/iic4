"use client";

import { useTransition } from "react";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatAllocationPercent,
  gainLossClassName,
} from "@/lib/portfolio/metrics";
import { removeHolding } from "@/lib/portfolio/actions";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 008.084 19h3.832a2.75 2.75 0 002.704-2.618l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.495.06l.375 6a.75.75 0 101.495.06l-.375-6zm4.34.06a.75.75 0 10-1.493.06l-.375 6a.75.75 0 001.493.06l.375-6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type PortfolioTableProps = {
  holdings: PortfolioHoldingWithMetrics[];
  isAdministrator: boolean;
};

export function PortfolioTable({
  holdings,
  isAdministrator,
}: PortfolioTableProps) {
  const [isPending, startTransition] = useTransition();

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
    <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="w-[4%] px-2 py-2.5 font-medium">Ticker</th>
              <th className="w-[12%] px-2 py-2.5 font-medium">Company</th>
              <th className="w-[8%] px-2 py-2.5 font-medium">Sector</th>
              <th className="w-[6%] px-2 py-2.5 font-medium text-right">Shares</th>
              <th className="w-[7%] px-2 py-2.5 font-medium text-right">Avg cost</th>
              <th className="w-[7%] px-2 py-2.5 font-medium text-right">Current</th>
              <th className="w-[7%] px-2 py-2.5 font-medium text-right">Cost basis</th>
              <th className="w-[7%] px-2 py-2.5 font-medium text-right">Market value</th>
              <th className="w-[7%] px-2 py-2.5 font-medium text-right">Gain/Loss</th>
              <th className="w-[6%] px-2 py-2.5 font-medium text-right">Return</th>
              <th className="w-[5%] px-2 py-2.5 font-medium text-right">Weight</th>
              <th className="w-[5%] px-2 py-2.5 font-medium text-right">P/E</th>
              <th className="w-[6%] px-2 py-2.5 font-medium text-right">Div yield</th>
              <th className="w-[7%] px-2 py-2.5 font-medium">Purchased</th>
              {isAdministrator ? (
                <th className="w-[4%] px-2 py-2.5 font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr
                key={holding.id}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-2 py-2.5 font-semibold text-zinc-950 dark:text-zinc-50">
                  {holding.ticker}
                </td>
                <td className="px-2 py-2.5 text-zinc-700 dark:text-zinc-300">
                  <div className="truncate" title={holding.company_name}>
                    {holding.company_name}
                  </div>
                  {holding.notes ? (
                    <div className="mt-1 truncate text-xs text-zinc-500" title={holding.notes}>
                      {holding.notes}
                    </div>
                  ) : null}
                </td>
                <td className="truncate px-2 py-2.5 text-zinc-600 dark:text-zinc-400" title={holding.sector || undefined}>
                  {holding.sector || "—"}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatNumber(holding.shares, 4)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.average_cost_per_share)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.current_price)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.costBasis)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td
                  className={`whitespace-nowrap px-2 py-2.5 text-right tabular-nums font-medium ${gainLossClassName(holding.gainLoss)}`}
                >
                  {formatCurrency(holding.gainLoss)}
                </td>
                <td
                  className={`whitespace-nowrap px-2 py-2.5 text-right tabular-nums font-medium ${gainLossClassName(holding.gainLossPercent)}`}
                >
                  {formatPercent(holding.gainLossPercent)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatAllocationPercent(holding.portfolioWeight)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {holding.pe_ratio !== null
                    ? formatNumber(holding.pe_ratio, 2)
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {holding.dividend_yield !== null
                    ? formatAllocationPercent(holding.dividend_yield)
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-zinc-600 dark:text-zinc-400">
                  {holding.purchase_date ? (
                    <>
                      {new Date(holding.purchase_date).toLocaleDateString()}
                      {holding.purchase_count > 1
                        ? ` (${holding.purchase_count} lots)`
                        : ""}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                {isAdministrator ? (
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemove(holding.id, holding.ticker)}
                      aria-label={`Remove ${holding.ticker} from portfolio`}
                      className="rounded-md border border-red-300 p-1.5 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
    </section>
  );
}

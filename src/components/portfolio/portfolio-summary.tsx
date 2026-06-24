"use client";

import { useState, useTransition } from "react";
import { setClubCash } from "@/lib/portfolio/actions";
import {
  calculatePortfolioSummary,
  formatCurrency,
  formatPercent,
  gainLossClassName,
} from "@/lib/portfolio/metrics";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

type PortfolioSummaryCardsProps = {
  holdings: PortfolioHoldingWithMetrics[];
  clubCash?: number;
  isAdministrator?: boolean;
};

type StatCellProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

function StatCell({ label, value, valueClassName = "" }: StatCellProps) {
  return (
    <div className="flex min-w-0 flex-col justify-center px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700/80 dark:text-amber-400/90">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-semibold tabular-nums text-brand-navy dark:text-zinc-50 ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

type CashCellProps = {
  currentCash: number;
  isAdministrator: boolean;
};

function CashCell({ currentCash, isAdministrator }: CashCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentCash));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsed = Number(inputValue.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setClubCash(parsed);
      if (result.success) {
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") { setEditing(false); setError(null); }
  }

  return (
    <div className="group/cash flex min-w-0 flex-col justify-center px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700/80 dark:text-amber-400/90">
        Club cash
      </p>
      {editing ? (
        <div className="mt-1 space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              autoFocus
              className="w-28 rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm font-semibold tabular-nums text-brand-navy focus:outline-none focus:ring-2 focus:ring-teal-500/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          {error ? (
            <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded bg-teal-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? "…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null); }}
              disabled={isPending}
              className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex items-baseline gap-1.5">
          <p className="text-base font-semibold tabular-nums text-brand-navy dark:text-zinc-50">
            {formatCurrency(currentCash)}
          </p>
          {isAdministrator ? (
            <button
              type="button"
              onClick={() => { setInputValue(String(currentCash)); setEditing(true); }}
              className="rounded px-1 py-0.5 text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 group-hover/cash:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            >
              Edit
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function PortfolioSummaryCards({
  holdings,
  clubCash = 0,
  isAdministrator = false,
}: PortfolioSummaryCardsProps) {
  const summary = calculatePortfolioSummary(holdings, clubCash);

  const leftStats = [
    { label: "Holdings", value: String(summary.holdingCount) },
    { label: "Cost basis", value: formatCurrency(summary.totalCostBasis) },
    { label: "Market value", value: formatCurrency(summary.totalMarketValue) },
    {
      label: "Gain / Loss",
      value: formatCurrency(summary.totalGainLoss),
      valueClassName: gainLossClassName(summary.totalGainLoss),
    },
    {
      label: "Return",
      value: formatPercent(summary.totalGainLossPercent),
      valueClassName: gainLossClassName(summary.totalGainLossPercent),
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="brand-accent-bar absolute inset-x-0 top-0 h-0.5" aria-hidden="true" />

      <div className="flex flex-wrap items-stretch divide-x divide-zinc-100 dark:divide-zinc-800">
        {leftStats.map((stat) => (
          <StatCell
            key={stat.label}
            label={stat.label}
            value={stat.value}
            valueClassName={stat.valueClassName}
          />
        ))}

        <CashCell currentCash={clubCash} isAdministrator={isAdministrator} />

        {/* Club Portfolio Equity — right-anchored, bold navy */}
        <div className="ml-auto flex flex-col justify-center bg-brand-navy px-6 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-300/90">
            Club Portfolio Equity
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-white">
            {formatCurrency(summary.totalClubEquity)}
          </p>
        </div>
      </div>
    </div>
  );
}

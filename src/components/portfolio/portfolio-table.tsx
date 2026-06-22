"use client";

import { useMemo, useState, useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import { PurchaseLotsDialog } from "@/components/portfolio/purchase-lots-dialog";
import { EditHoldingDialog } from "@/components/portfolio/edit-holding-dialog";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatAllocationPercent,
  gainLossClassName,
} from "@/lib/portfolio/metrics";
import { removeHolding } from "@/lib/portfolio/actions";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

type SortColumn =
  | "ticker"
  | "company_name"
  | "sector"
  | "shares"
  | "average_cost_per_share"
  | "current_price"
  | "costBasis"
  | "marketValue"
  | "gainLoss"
  | "gainLossPercent"
  | "portfolioWeight"
  | "pe_ratio"
  | "dividend_yield"
  | "purchase_date";

type SortDirection = "asc" | "desc";

type SortableValue = string | number | null;

function compareSortValues(
  left: SortableValue,
  right: SortableValue,
  direction: SortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  if (typeof left === "string" && typeof right === "string") {
    return (
      multiplier *
      left.localeCompare(right, undefined, {
        sensitivity: "base",
        numeric: true,
      })
    );
  }

  return multiplier * (Number(left) - Number(right));
}

function getSortValue(
  holding: PortfolioHoldingWithMetrics,
  column: SortColumn,
): SortableValue {
  switch (column) {
    case "ticker":
      return holding.ticker;
    case "company_name":
      return holding.company_name;
    case "sector":
      return holding.sector || null;
    case "shares":
      return holding.shares;
    case "average_cost_per_share":
      return holding.average_cost_per_share;
    case "current_price":
      return holding.current_price;
    case "costBasis":
      return holding.costBasis;
    case "marketValue":
      return holding.marketValue;
    case "gainLoss":
      return holding.gainLoss;
    case "gainLossPercent":
      return holding.gainLossPercent;
    case "portfolioWeight":
      return holding.portfolioWeight;
    case "pe_ratio":
      return holding.pe_ratio;
    case "dividend_yield":
      return holding.dividend_yield;
    case "purchase_date":
      return holding.purchase_date;
  }
}

function sortHoldings(
  holdings: PortfolioHoldingWithMetrics[],
  sortColumn: SortColumn,
  sortDirection: SortDirection,
) {
  return [...holdings].sort((left, right) => {
    const comparison = compareSortValues(
      getSortValue(left, sortColumn),
      getSortValue(right, sortColumn),
      sortDirection,
    );

    if (comparison !== 0) {
      return comparison;
    }

    return compareSortValues(left.ticker, right.ticker, "asc");
  });
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 transition-opacity ${active ? "text-teal-700 opacity-100 dark:text-teal-400" : "opacity-40 group-hover:opacity-70"}`}
    >
      {active && direction === "desc" ? (
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M14.77 12.79a.75.75 0 01-1.06-.02L10 9.06l-3.71 3.71a.75.75 0 11-1.06-1.06l4.24-4.25a.75.75 0 011.06 0l4.24 4.25a.75.75 0 01-.02 1.08z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const isActive = sortColumn === column;

  return (
    <th
      className={className}
      aria-sort={
        isActive
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group inline-flex w-full items-center gap-1 font-medium transition-colors hover:text-zinc-800 dark:hover:text-zinc-200 ${align === "right" ? "justify-end" : "justify-start"} ${isActive ? "text-zinc-800 dark:text-zinc-200" : ""}`}
      >
        <span>{label}</span>
        <SortIcon active={isActive} direction={sortDirection} />
      </button>
    </th>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 008.084 19h3.832a2.75 2.75 0 002.704-2.618l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.495.06l.375 6a.75.75 0 101.495.06l-.375-6zm4.34.06a.75.75 0 10-1.493.06l-.375 6a.75.75 0 001.493.06l.375-6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
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
  const [selectedHolding, setSelectedHolding] =
    useState<PortfolioHoldingWithMetrics | null>(null);
  const [editingHolding, setEditingHolding] =
    useState<PortfolioHoldingWithMetrics | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("ticker");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedHoldings = useMemo(
    () => sortHoldings(holdings, sortColumn, sortDirection),
    [holdings, sortColumn, sortDirection],
  );

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
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
    <>
      {editingHolding ? (
        <EditHoldingDialog
          holding={editingHolding}
          onClose={() => setEditingHolding(null)}
        />
      ) : null}
      {selectedHolding ? (
        <PurchaseLotsDialog
          holdingId={selectedHolding.id}
          ticker={selectedHolding.ticker}
          isAdministrator={isAdministrator}
          onClose={() => setSelectedHolding(null)}
        />
      ) : null}
      <BrandCard accent className="overflow-hidden">
        <table className="w-full table-fixed text-left text-sm leading-tight">
          <thead className="bg-brand-navy/[0.03] text-zinc-500 dark:bg-brand-navy/20 dark:text-zinc-400">
            <tr>
              <SortableHeader
                label="Ticker"
                column="ticker"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[4%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Company"
                column="company_name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[12%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Sector"
                column="sector"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[8%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Shares"
                column="shares"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[6%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Avg cost"
                column="average_cost_per_share"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[7%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Current"
                column="current_price"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[7%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Cost basis"
                column="costBasis"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[7%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Market value"
                column="marketValue"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[7%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Gain/Loss"
                column="gainLoss"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[7%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Return"
                column="gainLossPercent"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[6%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Weight"
                column="portfolioWeight"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[5%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="P/E"
                column="pe_ratio"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[5%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Div yield"
                column="dividend_yield"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
                className="w-[6%] px-1.5 py-1.5"
              />
              <SortableHeader
                label="Purchased"
                column="purchase_date"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="w-[7%] px-1.5 py-1.5"
              />
              {isAdministrator ? (
                <th className="w-[6%] px-1.5 py-1.5 font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((holding) => (
              <tr
                key={holding.id}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-1.5 py-1 font-semibold text-zinc-950 dark:text-zinc-50">
                  {holding.ticker}
                </td>
                <td className="px-1.5 py-1 text-zinc-700 dark:text-zinc-300">
                  <div className="truncate" title={holding.company_name}>
                    {holding.company_name}
                  </div>
                  {holding.notes ? (
                    <div className="mt-0.5 truncate text-xs text-zinc-500" title={holding.notes}>
                      {holding.notes}
                    </div>
                  ) : null}
                </td>
                <td className="truncate px-1.5 py-1 text-zinc-600 dark:text-zinc-400" title={holding.sector || undefined}>
                  {holding.sector || "—"}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums">
                  <button
                    type="button"
                    onClick={() => setSelectedHolding(holding)}
                    title="View purchase lots"
                    className="rounded px-1 py-0.5 text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-teal-700 hover:decoration-teal-500 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-teal-400 dark:hover:decoration-teal-600"
                  >
                    {formatNumber(holding.shares, 4)}
                  </button>
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.average_cost_per_share)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.current_price)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.costBasis)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td
                  className={`whitespace-nowrap px-1.5 py-1 text-right tabular-nums font-medium ${gainLossClassName(holding.gainLoss)}`}
                >
                  {formatCurrency(holding.gainLoss)}
                </td>
                <td
                  className={`whitespace-nowrap px-1.5 py-1 text-right tabular-nums font-medium ${gainLossClassName(holding.gainLossPercent)}`}
                >
                  {formatPercent(holding.gainLossPercent)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatAllocationPercent(holding.portfolioWeight)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {holding.pe_ratio !== null
                    ? formatNumber(holding.pe_ratio, 2)
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {holding.dividend_yield !== null
                    ? formatAllocationPercent(holding.dividend_yield)
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-1.5 py-1 text-zinc-600 dark:text-zinc-400">
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
                  <td className="px-1.5 py-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setEditingHolding(holding)}
                        aria-label={`Edit ${holding.ticker}`}
                        className="rounded border border-zinc-300 p-1 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemove(holding.id, holding.ticker)}
                        aria-label={`Remove ${holding.ticker} from portfolio`}
                        className="rounded border border-red-300 p-1 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </BrandCard>
    </>
  );
}

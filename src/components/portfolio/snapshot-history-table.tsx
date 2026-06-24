"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import {
  formatCurrency,
  formatPercent,
  gainLossClassName,
} from "@/lib/portfolio/metrics";
import {
  deleteSnapshot,
  updateSnapshotClubCash,
} from "@/lib/portfolio/snapshot-actions";
import type { PortfolioSnapshotSummary } from "@/lib/types/portfolio-snapshot";

type SortColumn =
  | "snapshot_date"
  | "holdingCount"
  | "totalCostBasis"
  | "totalMarketValue"
  | "totalGainLoss"
  | "totalGainLossPercent"
  | "clubCash"
  | "totalClubEquity";

type SortDirection = "asc" | "desc";

type SnapshotHistoryTableProps = {
  snapshots: PortfolioSnapshotSummary[];
  isAdministrator: boolean;
};

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

function formatSnapshotDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

function getSortValue(
  snapshot: PortfolioSnapshotSummary,
  column: SortColumn,
): string | number | null {
  switch (column) {
    case "snapshot_date":
      return snapshot.snapshot_date;
    case "holdingCount":
      return snapshot.holdingCount;
    case "totalCostBasis":
      return snapshot.totalCostBasis;
    case "totalMarketValue":
      return snapshot.totalMarketValue;
    case "totalGainLoss":
      return snapshot.totalGainLoss;
    case "totalGainLossPercent":
      return snapshot.totalGainLossPercent;
    case "clubCash":
      return snapshot.clubCash;
    case "totalClubEquity":
      return snapshot.totalClubEquity;
    default:
      return null;
  }
}

function sortSnapshots(
  snapshots: PortfolioSnapshotSummary[],
  column: SortColumn,
  direction: SortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...snapshots].sort((left, right) => {
    const leftValue = getSortValue(left, column);
    const rightValue = getSortValue(right, column);

    if (leftValue === null && rightValue === null) {
      return 0;
    }

    if (leftValue === null) {
      return 1;
    }

    if (rightValue === null) {
      return -1;
    }

    if (typeof leftValue === "string" && typeof rightValue === "string") {
      return multiplier * leftValue.localeCompare(rightValue);
    }

    return multiplier * (Number(leftValue) - Number(rightValue));
  });
}

type SnapshotClubCashCellProps = {
  snapshot: PortfolioSnapshotSummary;
  disabled: boolean;
};

function SnapshotClubCashCell({ snapshot, disabled }: SnapshotClubCashCellProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(snapshot.clubCash));
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
      const result = await updateSnapshotClubCash(snapshot.id, parsed);

      if (result.success) {
        setEditing(false);
        router.refresh();
        return;
      }

      setError(result.error);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditing(false);
      setError(null);
      setInputValue(String(snapshot.clubCash));
    }
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending || disabled}
            autoFocus
            className="w-24 rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </div>
        {error ? (
          <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || disabled}
            className="rounded bg-teal-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {isPending ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
              setInputValue(String(snapshot.clubCash));
            }}
            disabled={isPending || disabled}
            className="rounded border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/cash flex items-baseline gap-1.5">
      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatCurrency(snapshot.clubCash)}
      </span>
      <button
        type="button"
        onClick={() => {
          setInputValue(String(snapshot.clubCash));
          setError(null);
          setEditing(true);
        }}
        disabled={disabled}
        className="rounded px-1 py-0.5 text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 group-hover/cash:opacity-100 disabled:opacity-0 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
      >
        Edit
      </button>
    </div>
  );
}

export function SnapshotHistoryTable({
  snapshots,
  isAdministrator,
}: SnapshotHistoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sortColumn, setSortColumn] = useState<SortColumn>("snapshot_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedSnapshots = useMemo(
    () => sortSnapshots(snapshots, sortColumn, sortDirection),
    [snapshots, sortColumn, sortDirection],
  );

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === "snapshot_date" ? "desc" : "asc");
  }

  function handleDelete(event: React.MouseEvent, snapshot: PortfolioSnapshotSummary) {
    event.preventDefault();
    event.stopPropagation();

    if (
      !confirm(
        `Delete the snapshot for ${formatSnapshotDate(snapshot.snapshot_date)}?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSnapshot(snapshot.id);
      if (!result.success) {
        alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  if (snapshots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No portfolio snapshots yet.
          {isAdministrator
            ? " Save a snapshot from the portfolio page or create a historic snapshot here."
            : " An administrator can save snapshots for the club."}
        </p>
      </div>
    );
  }

  const columns: Array<[string, SortColumn]> = [
    ["Snapshot date", "snapshot_date"],
    ["Holdings", "holdingCount"],
    ["Total cost", "totalCostBasis"],
    ["Market value", "totalMarketValue"],
    ["Total gain/loss", "totalGainLoss"],
    ["Total return", "totalGainLossPercent"],
    ["Club cash", "clubCash"],
    ["Total club equity", "totalClubEquity"],
  ];

  return (
    <BrandCard accent className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-brand-navy/[0.03] text-zinc-500 dark:bg-brand-navy/20 dark:text-zinc-400">
            <tr>
              {columns.map(([label, column]) => (
                <th key={column} className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort(column)}
                    className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    {label}
                    {sortColumn === column ? (
                      <span aria-hidden="true">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    ) : null}
                  </button>
                </th>
              ))}
              {isAdministrator ? (
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sortedSnapshots.map((snapshot) => (
              <tr
                key={snapshot.id}
                className="border-t border-zinc-200 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
              >
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/portfolio/history/${snapshot.id}`}
                    className="text-brand-navy underline decoration-zinc-300 underline-offset-2 hover:text-teal-700 dark:text-zinc-50 dark:hover:text-teal-400"
                  >
                    {formatSnapshotDate(snapshot.snapshot_date)}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {snapshot.holdingCount}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(snapshot.totalCostBasis)}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(snapshot.totalMarketValue)}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums font-medium ${gainLossClassName(snapshot.totalGainLoss)}`}
                >
                  {formatCurrency(snapshot.totalGainLoss)}
                </td>
                <td
                  className={`px-4 py-3 tabular-nums font-medium ${gainLossClassName(snapshot.totalGainLossPercent)}`}
                >
                  {formatPercent(snapshot.totalGainLossPercent)}
                </td>
                <td className="px-4 py-3">
                  {isAdministrator ? (
                    <SnapshotClubCashCell
                      snapshot={snapshot}
                      disabled={isPending}
                    />
                  ) : (
                    <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(snapshot.clubCash)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums font-medium text-brand-navy dark:text-zinc-50">
                  {formatCurrency(snapshot.totalClubEquity)}
                </td>
                {isAdministrator ? (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={(event) => handleDelete(event, snapshot)}
                      aria-label={`Delete snapshot for ${formatSnapshotDate(snapshot.snapshot_date)}`}
                      className="rounded border border-red-300 p-1 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BrandCard>
  );
}

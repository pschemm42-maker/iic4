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
import { deleteSnapshot } from "@/lib/portfolio/snapshot-actions";
import type { PortfolioSnapshotSummary } from "@/lib/types/portfolio-snapshot";

type SortColumn =
  | "snapshot_date"
  | "holdingCount"
  | "totalCostBasis"
  | "totalMarketValue"
  | "totalGainLoss"
  | "totalGainLossPercent";

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

  return (
    <BrandCard accent className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-navy/[0.03] text-zinc-500 dark:bg-brand-navy/20 dark:text-zinc-400">
          <tr>
            {[
              ["Snapshot date", "snapshot_date"],
              ["Holdings", "holdingCount"],
              ["Total cost", "totalCostBasis"],
              ["Market value", "totalMarketValue"],
              ["Total gain/loss", "totalGainLoss"],
              ["Total return", "totalGainLossPercent"],
            ].map(([label, column]) => (
              <th key={column} className="px-4 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => handleSort(column as SortColumn)}
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
    </BrandCard>
  );
}

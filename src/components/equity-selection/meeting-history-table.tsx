"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import {
  deleteMeeting,
  inactivateMeeting,
} from "@/lib/equity-selection/meeting-actions";
import type { EquitySelectionMeetingSummary } from "@/lib/types/equity-selection-meeting";

type SortColumn = "saved_at" | "suggestion_count" | "vote_count";
type SortDirection = "asc" | "desc";

type MeetingHistoryTableProps = {
  meetings: EquitySelectionMeetingSummary[];
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

function formatMeetingDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getSortValue(
  meeting: EquitySelectionMeetingSummary,
  column: SortColumn,
): string | number {
  switch (column) {
    case "saved_at":
      return meeting.saved_at;
    case "suggestion_count":
      return meeting.suggestion_count;
    case "vote_count":
      return meeting.vote_count;
    default:
      return "";
  }
}

function sortMeetings(
  meetings: EquitySelectionMeetingSummary[],
  column: SortColumn,
  direction: SortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...meetings].sort((left, right) => {
    const leftValue = getSortValue(left, column);
    const rightValue = getSortValue(right, column);

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * multiplier;
    }

    return String(leftValue).localeCompare(String(rightValue)) * multiplier;
  });
}

export function MeetingHistoryTable({
  meetings,
  isAdministrator,
}: MeetingHistoryTableProps) {
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<SortColumn>("saved_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedMeetings = useMemo(
    () => sortMeetings(meetings, sortColumn, sortDirection),
    [meetings, sortColumn, sortDirection],
  );

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection(column === "saved_at" ? "desc" : "asc");
  }

  function sortIndicator(column: SortColumn) {
    if (sortColumn !== column) {
      return null;
    }

    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  function handleInactivate(meetingId: string) {
    if (
      !confirm(
        "Inactivate this meeting? It will be hidden from the history list for all members.",
      )
    ) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await inactivateMeeting(meetingId);

      if (result.success) {
        router.refresh();
        return;
      }

      setError(result.error);
    });
  }

  function handleDelete(meetingId: string) {
    if (
      !confirm(
        "Permanently delete this meeting and all archived suggestions, research, and votes?",
      )
    ) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await deleteMeeting(meetingId);

      if (result.success) {
        router.refresh();
        return;
      }

      setError(result.error);
    });
  }

  if (meetings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-950/30">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No saved meetings yet.
          {isAdministrator
            ? " Save a meeting from the equity selection page when voting is complete."
            : " Check back after the next club meeting."}
        </p>
      </div>
    );
  }

  return (
    <BrandCard accent className="overflow-hidden">
      {error ? (
        <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("saved_at")}
                  className="hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Saved{sortIndicator("saved_at")}
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("suggestion_count")}
                  className="hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Suggestions{sortIndicator("suggestion_count")}
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("vote_count")}
                  className="hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Votes{sortIndicator("vote_count")}
                </button>
              </th>
              {isAdministrator ? (
                <th className="px-4 py-3 text-right">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sortedMeetings.map((meeting) => (
              <tr
                key={meeting.id}
                className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/equity-selection/history/${meeting.id}`}
                    className="font-medium text-brand-navy underline decoration-brand-teal/40 underline-offset-2 hover:text-brand-teal dark:text-teal-300 dark:hover:text-teal-200"
                  >
                    {formatMeetingDate(meeting.saved_at)}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {meeting.suggestion_count}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {meeting.vote_count}
                </td>
                {isAdministrator ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleInactivate(meeting.id)}
                        disabled={isPending}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Inactivate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(meeting.id)}
                        disabled={isPending}
                        aria-label="Delete meeting"
                        className="rounded-lg border border-red-200 p-1.5 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
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
      </div>
    </BrandCard>
  );
}

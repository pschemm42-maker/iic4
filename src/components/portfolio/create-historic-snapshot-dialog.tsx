"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createHistoricSnapshot } from "@/lib/portfolio/snapshot-actions";

type CreateHistoricSnapshotDialogProps = {
  onClose: () => void;
};

const inputClassName =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateHistoricSnapshotDialog({
  onClose,
}: CreateHistoricSnapshotDialogProps) {
  const router = useRouter();
  const [snapshotDate, setSnapshotDate] = useState(todayDateString());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createHistoricSnapshot(snapshotDate);

      if (result.success) {
        router.refresh();
        if (result.data) {
          router.push(`/portfolio/history/${result.data.id}`);
        }
        onClose();
        return;
      }

      setError(result.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close create historic snapshot dialog"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
        disabled={isPending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-historic-snapshot-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="create-historic-snapshot-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Create historic snapshot
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Rebuild the club portfolio as it stood on a past date. Holdings
              include purchase lots on or before that date, with close prices
              looked up from market data.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Snapshot date
            </span>
            <input
              type="date"
              required
              value={snapshotDate}
              max={todayDateString()}
              onChange={(event) => setSnapshotDate(event.target.value)}
              className={inputClassName}
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#0C1929] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#16263d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Creating snapshot..." : "Create snapshot"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { refreshAllQuotes } from "@/lib/portfolio/actions";

type RefreshAllPricesButtonProps = {
  lastUpdatedAt: string | null;
};

export function RefreshAllPricesButton({
  lastUpdatedAt,
}: RefreshAllPricesButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await refreshAllQuotes();

      if (result.success) {
        setMessage(result.message ?? "Prices refreshed.");
        return;
      }

      setError(result.error);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
            Market data
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Updates current price for every holding (~1 API call each).
          </p>
          {lastUpdatedAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              Last updated{" "}
              {new Date(lastUpdatedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {isPending ? "Refreshing prices..." : "Refresh all prices"}
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { refreshAllQuotes } from "@/lib/portfolio/actions";

type RefreshAllPricesButtonProps = {
  lastUpdatedAt: string | null;
  onDark?: boolean;
};

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MarketDataTooltip({
  lastUpdatedAt,
  onDark = false,
}: {
  lastUpdatedAt: string | null;
  onDark?: boolean;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className={`rounded-full p-1.5 transition-colors ${
          onDark
            ? "text-slate-300 hover:bg-white/10 hover:text-white"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        }`}
        aria-label="Market data information"
      >
        <InfoIcon />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-lg group-hover:visible group-focus-within:visible dark:border-zinc-700 dark:bg-zinc-900"
      >
        <p className="font-medium text-zinc-950 dark:text-zinc-50">Market data</p>
        <p className="mt-1 leading-5 text-zinc-600 dark:text-zinc-400">
          Refreshes current price, P/E, and dividend yield for every holding from
          Finnhub (~2 API calls each, queued at 60 requests per minute).
        </p>
        {lastUpdatedAt ? (
          <p className="mt-2 text-xs text-zinc-500">
            Last updated{" "}
            {new Date(lastUpdatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">No price refresh recorded yet.</p>
        )}
      </div>
    </div>
  );
}

export function RefreshAllPricesButton({
  lastUpdatedAt,
  onDark = false,
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
        setMessage(result.message ?? "Market data refreshed.");
        return;
      }

      setError(result.error);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <MarketDataTooltip lastUpdatedAt={lastUpdatedAt} onDark={onDark} />
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            onDark
              ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
              : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {isPending ? "Refreshing market data..." : "Refresh market data"}
        </button>
      </div>

      {message ? (
        <p className="max-w-sm rounded-lg bg-emerald-50 px-3 py-2 text-right text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="max-w-sm rounded-lg bg-red-50 px-3 py-2 text-right text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { addHolding } from "@/lib/portfolio/actions";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-5 w-5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function AddHoldingForm() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await addHolding(formData);

      if (result.success) {
        setMessage(result.message ?? `${result.data?.ticker} added to the portfolio.`);
        (document.getElementById("add-holding-form") as HTMLFormElement)?.reset();
        return;
      }

      setError(result.error);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="min-w-0 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-950 dark:text-zinc-50">
            Add holding
          </span>
          {" — "}
          Add a purchase lot for a ticker. Repeat entries aggregate shares and average cost.
        </p>
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-controls="add-holding-panel"
          aria-label={isExpanded ? "Collapse add holding form" : "Expand add holding form"}
          className="shrink-0 rounded-lg border border-zinc-300 p-1.5 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <ChevronIcon expanded={isExpanded} />
        </button>
      </div>

      {isExpanded ? (
        <div id="add-holding-panel" className="border-t border-zinc-200 p-6 pt-0 dark:border-zinc-800">
          <form id="add-holding-form" action={handleSubmit} className="grid gap-4 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Ticker
            </span>
            <input
              name="ticker"
              type="text"
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 uppercase text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="AAPL"
            />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Company
            </span>
            <input
              name="companyName"
              type="text"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="Apple Inc. (required for new tickers)"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Shares
            </span>
            <input
              name="shares"
              type="number"
              required
              min="0.000001"
              step="0.000001"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="100"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Cost / share
            </span>
            <input
              name="costPerShare"
              type="number"
              required
              min="0"
              step="0.01"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="150.25"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Current price
            </span>
            <input
              name="currentPrice"
              type="number"
              min="0"
              step="0.01"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="175.00"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Sector
            </span>
            <input
              name="sector"
              type="text"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="Technology"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Purchase date
            </span>
            <input
              name="purchaseDate"
              type="date"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Dividend yield (%)
            </span>
            <input
              name="dividendYield"
              type="number"
              min="0"
              step="0.01"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="1.25"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              P/E ratio
            </span>
            <input
              name="peRatio"
              type="number"
              min="0"
              step="0.01"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="28.5"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Notes</span>
          <textarea
            name="notes"
            rows={2}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            placeholder="Lot-specific notes (optional)"
          />
        </label>

        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#0C1929] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#16263d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Adding..." : "Add purchase"}
          </button>
        </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

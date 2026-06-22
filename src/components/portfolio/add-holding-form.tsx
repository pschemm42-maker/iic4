"use client";

import { useState, useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import { addHolding } from "@/lib/portfolio/actions";

const inputClassName =
  "h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

const labelClassName = "grid gap-1 text-xs";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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
    <BrandCard accent className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="min-w-0 text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
          <span className="font-semibold text-brand-navy dark:text-zinc-50">
            Add holding
          </span>
          <span className="hidden sm:inline">
            {" — "}
            Add a purchase lot for a ticker. Repeat entries aggregate shares and average cost.
          </span>
        </p>
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          aria-controls="add-holding-panel"
          aria-label={isExpanded ? "Collapse add holding form" : "Expand add holding form"}
          className="shrink-0 rounded-md border border-zinc-300 p-1 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <ChevronIcon expanded={isExpanded} />
        </button>
      </div>

      {isExpanded ? (
        <div id="add-holding-panel" className="border-t border-zinc-200 px-3 pb-3 dark:border-zinc-800">
          <form id="add-holding-form" action={handleSubmit} className="grid max-w-5xl gap-2 pt-3">
            <div className="grid grid-cols-12 gap-x-2 gap-y-2">
              <label className={`${labelClassName} col-span-4 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Ticker</span>
                <input
                  name="ticker"
                  type="text"
                  required
                  className={`${inputClassName} uppercase`}
                  placeholder="AAPL"
                />
              </label>

              <label className={`${labelClassName} col-span-8 sm:col-span-9 lg:col-span-10`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Company</span>
                <input
                  name="companyName"
                  type="text"
                  className={inputClassName}
                  placeholder="Apple Inc. (required for new tickers)"
                />
              </label>

              <label className={`${labelClassName} col-span-4 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Shares</span>
                <input
                  name="shares"
                  type="number"
                  required
                  min="0.000001"
                  step="0.000001"
                  className={inputClassName}
                  placeholder="100"
                />
              </label>

              <label className={`${labelClassName} col-span-4 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Cost / share</span>
                <input
                  name="costPerShare"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className={inputClassName}
                  placeholder="150.25"
                />
              </label>

              <label className={`${labelClassName} col-span-4 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Current price</span>
                <input
                  name="currentPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClassName}
                  placeholder="175.00"
                />
              </label>

              <label className={`${labelClassName} col-span-6 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Sector</span>
                <input
                  name="sector"
                  type="text"
                  className={inputClassName}
                  placeholder="Technology"
                />
              </label>

              <label className={`${labelClassName} col-span-6 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Purchase date</span>
                <input name="purchaseDate" type="date" className={inputClassName} />
              </label>

              <label className={`${labelClassName} col-span-6 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Dividend yield (%)</span>
                <input
                  name="dividendYield"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClassName}
                  placeholder="1.25"
                />
              </label>

              <label className={`${labelClassName} col-span-6 sm:col-span-3 lg:col-span-2`}>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">P/E ratio</span>
                <input
                  name="peRatio"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClassName}
                  placeholder="28.5"
                />
              </label>
            </div>

            <label className={labelClassName}>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Notes</span>
              <textarea
                name="notes"
                rows={1}
                className={`${inputClassName} min-h-8 resize-y py-1.5`}
                placeholder="Lot-specific notes (optional)"
              />
            </label>

            {message ? (
              <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            ) : null}

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="h-8 rounded-md bg-brand-teal px-3 text-sm font-medium text-white transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Adding..." : "Add purchase"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </BrandCard>
  );
}

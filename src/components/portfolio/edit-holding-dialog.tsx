"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateHolding } from "@/lib/portfolio/actions";
import { updateSnapshotHolding } from "@/lib/portfolio/snapshot-actions";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

type EditHoldingDialogProps = {
  holding: PortfolioHoldingWithMetrics;
  mode?: "live" | "snapshot";
  onClose: () => void;
};

const inputClassName =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

function formatDateInputValue(date: string | null) {
  if (!date) {
    return "";
  }

  return date.slice(0, 10);
}

export function EditHoldingDialog({
  holding,
  mode = "live",
  onClose,
}: EditHoldingDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canEditPosition = holding.purchase_count <= 1;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result =
        mode === "snapshot"
          ? await updateSnapshotHolding(holding.id, formData)
          : await updateHolding(holding.id, formData);

      if (result.success) {
        router.refresh();
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
        aria-label="Close edit holding dialog"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
        disabled={isPending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-holding-title"
        className="relative z-10 flex max-h-[min(90vh,48rem)] w-full max-w-3xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="edit-holding-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Edit {holding.ticker}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Update holding details for this position.
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

        <form
          action={handleSubmit}
          className="overflow-auto px-6 py-4"
        >
          <input type="hidden" name="editPosition" value={String(canEditPosition)} />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Ticker
              </span>
              <input
                name="ticker"
                type="text"
                required
                defaultValue={holding.ticker}
                className={`${inputClassName} uppercase`}
              />
            </label>

            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Company
              </span>
              <input
                name="companyName"
                type="text"
                required
                defaultValue={holding.company_name}
                className={inputClassName}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Shares
              </span>
              <input
                name="shares"
                type="number"
                required={canEditPosition}
                min="0.000001"
                step="0.000001"
                defaultValue={holding.shares}
                disabled={!canEditPosition}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Cost / share
              </span>
              <input
                name="costPerShare"
                type="number"
                required={canEditPosition}
                min="0"
                step="0.01"
                defaultValue={holding.average_cost_per_share}
                disabled={!canEditPosition}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {mode === "snapshot" ? "Close price" : "Current price"}
              </span>
              <input
                name="currentPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={holding.current_price ?? ""}
                className={inputClassName}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Sector
              </span>
              <input
                name="sector"
                type="text"
                defaultValue={holding.sector}
                className={inputClassName}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Purchase date
              </span>
              <input
                name="purchaseDate"
                type="date"
                defaultValue={formatDateInputValue(holding.purchase_date)}
                disabled={!canEditPosition}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
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
                defaultValue={holding.dividend_yield ?? ""}
                className={inputClassName}
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
                defaultValue={holding.pe_ratio ?? ""}
                className={inputClassName}
              />
            </label>
          </div>

          {!canEditPosition ? (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Shares, cost, and purchase date are managed per lot for positions
              with multiple purchases. Click the shares value in the table to
              view and edit individual lots.
            </p>
          ) : null}

          <label className="mt-4 grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Notes
            </span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={holding.notes}
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
              {isPending ? "Saving..." : "Save changes"}
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

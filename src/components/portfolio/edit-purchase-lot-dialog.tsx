"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updatePurchase } from "@/lib/portfolio/actions";
import type { PortfolioPurchase } from "@/lib/types/portfolio";

type EditPurchaseLotDialogProps = {
  purchase: PortfolioPurchase;
  lotNumber: number;
  ticker: string;
  onClose: () => void;
  onSaved: (purchase: PortfolioPurchase) => void;
};

const inputClassName =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

function formatDateInputValue(date: string | null) {
  if (!date) {
    return "";
  }

  return date.slice(0, 10);
}

export function EditPurchaseLotDialog({
  purchase,
  lotNumber,
  ticker,
  onClose,
  onSaved,
}: EditPurchaseLotDialogProps) {
  const router = useRouter();
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

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await updatePurchase(purchase.id, formData);

      if (result.success && result.data) {
        router.refresh();
        onSaved(result.data);
        onClose();
        return;
      }

      setError(result.success ? "Purchase lot could not be updated." : result.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close edit purchase lot dialog"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
        disabled={isPending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-purchase-lot-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="edit-purchase-lot-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Edit lot {lotNumber} — {ticker}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Update this purchase lot. Position totals are recalculated from all
              lots.
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

        <form action={handleSubmit} className="px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
                defaultValue={purchase.shares}
                className={inputClassName}
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
                defaultValue={purchase.cost_per_share}
                className={inputClassName}
              />
            </label>

            <label className="grid gap-2 text-sm sm:col-span-2">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Purchase date
              </span>
              <input
                name="purchaseDate"
                type="date"
                defaultValue={formatDateInputValue(purchase.purchase_date)}
                className={inputClassName}
              />
            </label>
          </div>

          <label className="mt-4 grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Lot notes
            </span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={purchase.notes}
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
              {isPending ? "Saving..." : "Save lot"}
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

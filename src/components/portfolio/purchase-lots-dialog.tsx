"use client";

import { useEffect, useState } from "react";
import { listPurchasesForHolding } from "@/lib/portfolio/actions";
import { formatCurrency, formatNumber } from "@/lib/portfolio/metrics";
import type { PortfolioPurchase } from "@/lib/types/portfolio";

type PurchaseLotsDialogProps = {
  holdingId: string;
  ticker: string;
  onClose: () => void;
};

function formatPurchaseDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

export function PurchaseLotsDialog({
  holdingId,
  ticker,
  onClose,
}: PurchaseLotsDialogProps) {
  const [purchases, setPurchases] = useState<PortfolioPurchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPurchases() {
      setIsLoading(true);
      setError(null);

      const result = await listPurchasesForHolding(holdingId);

      if (cancelled) {
        return;
      }

      if (result.success && result.data) {
        setPurchases(result.data);
      } else {
        setError(result.success ? "No purchase lots found." : result.error);
      }

      setIsLoading(false);
    }

    void loadPurchases();

    return () => {
      cancelled = true;
    };
  }, [holdingId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close purchase lots dialog"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-lots-title"
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="purchase-lots-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              {ticker} purchase lots
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Individual lots that make up this position.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="max-h-[min(60vh,28rem)] overflow-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading purchase lots…
            </p>
          ) : error ? (
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          ) : purchases && purchases.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Lot</th>
                  <th className="pb-2 pr-4 font-medium text-right">Shares</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Cost / share
                  </th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Total cost
                  </th>
                  <th className="pb-2 font-medium">Purchased</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase, index) => (
                  <tr
                    key={purchase.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="py-2.5 pr-4 text-zinc-700 dark:text-zinc-300">
                      {index + 1}
                      {purchase.notes ? (
                        <div
                          className="mt-0.5 max-w-[10rem] truncate text-xs text-zinc-500"
                          title={purchase.notes}
                        >
                          {purchase.notes}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatNumber(purchase.shares, 4)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(purchase.cost_per_share)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(purchase.shares * purchase.cost_per_share)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-zinc-600 dark:text-zinc-400">
                      {formatPurchaseDate(purchase.purchase_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No purchase lots recorded for this holding.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

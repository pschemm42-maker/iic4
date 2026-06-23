"use client";

import { useEffect, useState } from "react";
import { EditPurchaseLotDialog } from "@/components/portfolio/edit-purchase-lot-dialog";
import { listPurchasesForHolding } from "@/lib/portfolio/actions";
import { listSnapshotPurchases } from "@/lib/portfolio/snapshot-actions";
import { formatCurrency, formatNumber } from "@/lib/portfolio/metrics";
import type { PortfolioPurchase } from "@/lib/types/portfolio";
import { snapshotPurchaseToPortfolioPurchase } from "@/lib/types/portfolio-snapshot";

type PurchaseLotsDialogProps = {
  holdingId: string;
  ticker: string;
  isAdministrator?: boolean;
  mode?: "live" | "snapshot";
  onClose: () => void;
};

function formatPurchaseDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

export function PurchaseLotsDialog({
  holdingId,
  ticker,
  isAdministrator = false,
  mode = "live",
  onClose,
}: PurchaseLotsDialogProps) {
  const [purchases, setPurchases] = useState<PortfolioPurchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPurchase, setEditingPurchase] = useState<{
    purchase: PortfolioPurchase;
    lotNumber: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPurchases() {
      setIsLoading(true);
      setError(null);

      if (mode === "snapshot") {
        const result = await listSnapshotPurchases(holdingId);

        if (cancelled) {
          return;
        }

        if (result.success && result.data) {
          setPurchases(result.data.map(snapshotPurchaseToPortfolioPurchase));
        } else {
          setError(result.success ? "No purchase lots found." : result.error);
        }

        setIsLoading(false);
        return;
      }

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
  }, [holdingId, mode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !editingPurchase) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingPurchase, onClose]);

  function handlePurchaseSaved(updatedPurchase: PortfolioPurchase) {
    setPurchases((current) =>
      current
        ? current.map((purchase) =>
            purchase.id === updatedPurchase.id ? updatedPurchase : purchase,
          )
        : current,
    );
  }

  return (
    <>
      {editingPurchase ? (
        <EditPurchaseLotDialog
          purchase={editingPurchase.purchase}
          lotNumber={editingPurchase.lotNumber}
          ticker={ticker}
          mode={mode}
          onClose={() => setEditingPurchase(null)}
          onSaved={handlePurchaseSaved}
        />
      ) : null}
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
                {isAdministrator
                  ? " Edit each lot to update shares, cost, and purchase date."
                  : null}
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
                    {isAdministrator ? (
                      <th className="pb-2 pl-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
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
                        {formatCurrency(
                          purchase.shares * purchase.cost_per_share,
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-zinc-600 dark:text-zinc-400">
                        {formatPurchaseDate(purchase.purchase_date)}
                      </td>
                      {isAdministrator ? (
                        <td className="py-2.5 pl-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPurchase({
                                purchase,
                                lotNumber: index + 1,
                              })
                            }
                            aria-label={`Edit lot ${index + 1}`}
                            className="rounded-md border border-zinc-300 p-1.5 text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            <PencilIcon />
                          </button>
                        </td>
                      ) : null}
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
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setClubCash } from "@/lib/portfolio/actions";
import { formatCurrency } from "@/lib/portfolio/metrics";

type ClubCashCardProps = {
  currentCash: number;
};

export function ClubCashCard({ currentCash }: ClubCashCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentCash));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    setInputValue(String(currentCash));
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setError(null);
  }

  function handleSave() {
    const parsed = Number(inputValue.trim());

    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid non-negative dollar amount.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await setClubCash(parsed);

      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-teal-50/40 p-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-teal-950/20">
      <div className="brand-accent-bar absolute inset-x-0 top-0 h-0.5 opacity-60" aria-hidden="true" />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700/80 dark:text-amber-400/90">
          Club cash — undeployed funds
        </p>
        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              autoFocus
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold tabular-nums text-brand-navy focus:outline-none focus:ring-2 focus:ring-teal-500/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 disabled:opacity-60"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-lg font-semibold tabular-nums text-brand-navy dark:text-zinc-50">
          {formatCurrency(currentCash)}
        </p>
      )}
    </div>
  );
}

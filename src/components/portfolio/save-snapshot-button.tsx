"use client";

import { useState, useTransition } from "react";
import { saveCurrentSnapshot } from "@/lib/portfolio/snapshot-actions";

type SaveSnapshotButtonProps = {
  onDark?: boolean;
};

export function SaveSnapshotButton({ onDark = false }: SaveSnapshotButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (
      !confirm(
        "Save a snapshot of the current portfolio with today's prices and holdings?",
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await saveCurrentSnapshot();

      if (result.success) {
        setMessage(result.message ?? "Snapshot saved.");
        return;
      }

      setError(result.error);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          onDark
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        {isPending ? "Saving snapshot..." : "Save snapshot"}
      </button>

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

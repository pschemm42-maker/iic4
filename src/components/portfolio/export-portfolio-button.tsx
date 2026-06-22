"use client";

import { useState, useTransition } from "react";
import type { PortfolioHoldingWithMetrics } from "@/lib/types/portfolio";

type ExportPortfolioButtonProps = {
  holdings: PortfolioHoldingWithMetrics[];
  onDark?: boolean;
};

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
      <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
  );
}

export function ExportPortfolioButton({
  holdings,
  onDark = false,
}: ExportPortfolioButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDisabled = isPending || holdings.length === 0;

  function handleExport() {
    setError(null);

    startTransition(async () => {
      try {
        const { downloadPortfolioExcel } = await import("@/lib/portfolio/export-excel");
        downloadPortfolioExcel(holdings);
      } catch (exportError) {
        console.error(exportError);
        setError("Could not export portfolio. Please try again.");
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={isDisabled}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          onDark
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <DownloadIcon />
        {isPending ? "Exporting..." : "Export to Excel"}
      </button>

      {error ? (
        <p className="max-w-sm rounded-lg bg-red-50 px-3 py-2 text-right text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

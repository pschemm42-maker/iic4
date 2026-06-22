"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BrokerRecommendationsSection } from "@/components/equity-selection/broker-recommendations-section";
import { ResearchScorecard } from "@/components/equity-selection/research-scorecard";
import {
  captureStockResearch,
  getStockSuggestionResearch,
} from "@/lib/equity-selection/actions";
import { formatNumber } from "@/lib/portfolio/metrics";
import type { StockSuggestion } from "@/lib/types/equity-selection";
import { type StockSuggestionResearch } from "@/lib/types/equity-selection";

type ResearchModalProps = {
  suggestion: StockSuggestion;
  onClose: () => void;
  onResearchCaptured?: (suggestionId: string, compositeScore: number) => void;
};

function formatResearchDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ResearchModal({
  suggestion,
  onClose,
  onResearchCaptured,
}: ResearchModalProps) {
  const router = useRouter();
  const [research, setResearch] = useState<StockSuggestionResearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadResearch() {
      setIsLoading(true);
      setError(null);

      const result = await getStockSuggestionResearch(suggestion.id);

      if (cancelled) {
        return;
      }

      if (result.success) {
        setResearch(result.data ?? null);
      } else {
        setError(result.error);
      }

      setIsLoading(false);
    }

    void loadResearch();

    return () => {
      cancelled = true;
    };
  }, [suggestion.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function handleCaptureResearch() {
    setError(null);

    startTransition(async () => {
      const result = await captureStockResearch(suggestion.id);

      if (result.success && result.data) {
        setResearch(result.data);
        onResearchCaptured?.(suggestion.id, result.data.composite_score);
        router.refresh();
        return;
      }

      setError(result.success ? "Research capture failed." : result.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close research modal"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
        disabled={isPending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-modal-title"
        className="relative z-10 flex max-h-[min(92vh,52rem)] w-full max-w-4xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="research-modal-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              {suggestion.ticker} research
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {suggestion.company_name || "Equity selection research review"}
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

        <div className="overflow-auto px-6 py-5">
          {isLoading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading research…
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Research composite score
                  </p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                    {research
                      ? formatNumber(research.composite_score, 1)
                      : suggestion.research_composite_score !== null
                        ? formatNumber(suggestion.research_composite_score, 1)
                        : "—"}
                  </p>
                  {research ? (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Captured by {research.researcher_name} on{" "}
                      {formatResearchDate(research.updated_at)}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleCaptureResearch}
                  disabled={isPending}
                  className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? "Capturing research…"
                    : research
                      ? "Recapture research"
                      : "Capture research"}
                </button>
              </div>

              {error ? (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              {research ? (
                <div className="mt-6 space-y-6">
                  <ResearchScorecard research={research} />

                  <BrokerRecommendationsSection research={research} />

                  <section className="rounded-xl bg-zinc-50 px-4 py-4 dark:bg-zinc-950">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      Conclusion
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                      {research.conclusion}
                    </p>
                  </section>
                </div>
              ) : (
                <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
                  No research has been captured yet. Use Capture research to
                  compute statistical category scores from live financial
                  metrics, pull analyst consensus, and generate a composite
                  score with a short conclusion.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

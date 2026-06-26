"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BrokerRecommendationsSection } from "@/components/equity-selection/broker-recommendations-section";
import { ResearchScorecard } from "@/components/equity-selection/research-scorecard";
import { YahooInsightsSection } from "@/components/equity-selection/yahoo-insights-section";
import {
  captureStockResearch,
  getStockSuggestionResearch,
} from "@/lib/equity-selection/actions";
import { getMeetingSuggestionResearch } from "@/lib/equity-selection/meeting-actions";
import { formatNumber } from "@/lib/portfolio/metrics";
import type { StockSuggestion } from "@/lib/types/equity-selection";
import { type StockSuggestionResearch } from "@/lib/types/equity-selection";

type ResearchModalProps = {
  suggestion: StockSuggestion;
  mode?: "live" | "meeting";
  onClose: () => void;
  onResearchCaptured?: (suggestionId: string, compositeScore: number) => void;
};

function formatResearchDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function compositeScoreColor(score: number) {
  if (score >= 70) return "text-brand-teal-light";
  if (score >= 50) return "text-amber-300";
  return "text-orange-300";
}

export function ResearchModal({
  suggestion,
  mode = "live",
  onClose,
  onResearchCaptured,
}: ResearchModalProps) {
  const isMeeting = mode === "meeting";
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

      const result = isMeeting
        ? await getMeetingSuggestionResearch(suggestion.id)
        : await getStockSuggestionResearch(suggestion.id);

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
  }, [suggestion.id, isMeeting]);

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

  const compositeScore =
    research?.composite_score ??
    suggestion.research_composite_score ??
    null;
  const coveragePct =
    research?.data_coverage !== null && research?.data_coverage !== undefined
      ? Math.round(research.data_coverage * 100)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close research modal"
        className="absolute inset-0 bg-brand-navy/70"
        onClick={onClose}
        disabled={isPending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-modal-title"
        className="relative z-10 flex h-[min(94vh,52rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl dark:bg-zinc-900"
      >
        {/* Brand header */}
        <div className="relative shrink-0 overflow-hidden bg-brand-navy text-white">
          <div className="brand-gradient-glow absolute inset-0" aria-hidden="true" />
          <div className="brand-accent-bar h-0.5 w-full" aria-hidden="true" />
          <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300/90">
                Equity research
              </p>
              <h2
                id="research-modal-title"
                className="truncate text-lg font-semibold tracking-tight"
              >
                {suggestion.ticker}
                {suggestion.company_name ? (
                  <span className="ml-2 font-normal text-slate-300">
                    {suggestion.company_name}
                  </span>
                ) : null}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!isMeeting ? (
                <button
                  type="button"
                  onClick={handleCaptureResearch}
                  disabled={isPending || isLoading}
                  className="rounded-md bg-brand-teal px-3 py-1 text-[13px] font-medium text-white transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? "Capturing…"
                    : research
                      ? "Recapture"
                      : "Capture"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                aria-label="Close"
                className="rounded-md border border-white/20 px-2 py-1 text-[13px] text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                Close
              </button>
            </div>
          </div>

          {/* Composite score strip */}
          {!isLoading ? (
            <div className="relative z-10 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 border-t border-white/10 px-4 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Composite
                </span>
                <span
                  className={`text-[26px] font-bold tabular-nums ${compositeScore !== null ? compositeScoreColor(compositeScore) : "text-slate-500"}`}
                >
                  {compositeScore !== null
                    ? formatNumber(compositeScore, 1)
                    : "—"}
                </span>
              </div>
              {coveragePct !== null ? (
                <span className="text-[12px] text-slate-400">
                  {coveragePct}% data coverage
                </span>
              ) : null}
              {research ? (
                <span className="text-[12px] text-slate-500">
                  {research.researcher_name} ·{" "}
                  {formatResearchDate(research.updated_at)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Body — no scroll */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
          {isLoading ? (
            <p className="text-sm text-zinc-500">Loading research…</p>
          ) : error ? (
            <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : research ? (
            <>
              <ResearchScorecard research={research} compact />

              <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-2">
                <BrokerRecommendationsSection research={research} compact />
                <YahooInsightsSection insights={research.yahoo_insights} />
              </div>

              <section className="shrink-0 rounded-md border border-brand-gold/30 bg-amber-50/50 px-2.5 py-2 dark:border-amber-800/40 dark:bg-amber-950/20">
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-gold">
                  Conclusion
                </p>
                <p className="mt-0.5 line-clamp-3 text-[13px] leading-snug text-zinc-700 dark:text-zinc-300">
                  {research.conclusion}
                </p>
              </section>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                {isMeeting
                  ? "No research was captured for this suggestion at the time of the meeting."
                  : "No research captured yet. Capture to compute statistical category scores, sell-side consensus, and Yahoo Finance targets, trends, and news."}
              </p>
              {!isMeeting ? (
                <button
                  type="button"
                  onClick={handleCaptureResearch}
                  disabled={isPending}
                  className="rounded-md bg-brand-teal px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-400 disabled:opacity-60"
                >
                  Capture research
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

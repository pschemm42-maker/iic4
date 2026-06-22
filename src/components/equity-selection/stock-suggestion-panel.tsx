"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ResearchModal } from "@/components/equity-selection/research-modal";
import { SuggestionUpvoteControl } from "@/components/equity-selection/suggestion-upvote-control";
import {
  addStockSuggestion,
  removeStockSuggestion,
  updateStockSuggestionReason,
} from "@/lib/equity-selection/actions";
import {
  formatAllocationPercent,
  formatCurrency,
  formatNumber,
} from "@/lib/portfolio/metrics";
import type { StockSuggestion } from "@/lib/types/equity-selection";

const CARD_ACCENTS = [
  {
    ring: "ring-teal-500/20",
    header: "from-brand-navy via-brand-navy-light to-[#1a3352]",
    infoBg: "bg-teal-50/70 dark:bg-teal-950/20",
    infoLabel: "text-teal-700 dark:text-teal-300",
    scoreBg: "bg-teal-50 dark:bg-teal-950/30",
    scoreBorder: "border-teal-200 dark:border-teal-900",
  },
  {
    ring: "ring-amber-500/20",
    header: "from-[#1f2937] via-brand-navy-light to-[#243247]",
    infoBg: "bg-amber-50/70 dark:bg-amber-950/20",
    infoLabel: "text-amber-700 dark:text-amber-300",
    scoreBg: "bg-amber-50 dark:bg-amber-950/25",
    scoreBorder: "border-amber-200 dark:border-amber-900",
  },
] as const;

function StockInfoColumn({
  suggestion,
  accent,
}: {
  suggestion: StockSuggestion;
  accent: (typeof CARD_ACCENTS)[number];
}) {
  const stats = [
    {
      label: "P/E (TTM)",
      value:
        suggestion.pe_ratio !== null
          ? formatNumber(suggestion.pe_ratio, 2)
          : "—",
    },
    {
      label: "Div yield",
      value:
        suggestion.dividend_yield !== null
          ? formatAllocationPercent(suggestion.dividend_yield)
          : "—",
    },
    {
      label: "Sector",
      value: suggestion.sector || "—",
    },
  ];

  return (
    <div className={`flex h-full flex-col p-3.5 ${accent.infoBg}`}>
      <div>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent.infoLabel}`}
        >
          Key information
        </p>
        <p className="mt-2 text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {suggestion.ticker}
        </p>
        {suggestion.company_name ? (
          <p
            className="mt-0.5 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300"
            title={suggestion.company_name}
          >
            {suggestion.company_name}
          </p>
        ) : null}
        <p className="mt-2 text-lg font-semibold tabular-nums text-brand-navy dark:text-brand-teal-light">
          {formatCurrency(suggestion.current_price)}
        </p>
      </div>

      <dl className="mt-3 space-y-1.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-baseline justify-between gap-2 rounded-md bg-white/70 px-2 py-1.5 text-xs dark:bg-zinc-900/50"
          >
            <dt className="shrink-0 text-zinc-500">{stat.label}</dt>
            <dd
              className="truncate text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
              title={stat.value}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-auto pt-3 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
        Suggested by{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {suggestion.suggester_name}
        </span>
        <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
        {formatSuggestionDate(suggestion.created_at)}
      </p>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 008.084 19h3.832a2.75 2.75 0 002.704-2.618l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.495.06l.375 6a.75.75 0 101.495.06l-.375-6zm4.34.06a.75.75 0 10-1.493.06l-.375 6a.75.75 0 001.493.06l.375-6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatSuggestionDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCompositeScore(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "—";
  }

  return formatNumber(score, 1);
}

function compositeScoreClassName(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "text-zinc-400";
  }

  if (score >= 7) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (score >= 5) {
    return "text-teal-700 dark:text-teal-400";
  }

  if (score >= 3) {
    return "text-amber-600 dark:text-amber-400";
  }

  return "text-red-600 dark:text-red-400";
}

function compositeScoreBadgeClassName(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
  }

  if (score >= 7) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (score >= 5) {
    return "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300";
  }

  if (score >= 3) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
}

function RecommendationReasonEditor({
  suggestion,
  disabled,
}: {
  suggestion: StockSuggestion;
  disabled: boolean;
}) {
  const [reason, setReason] = useState(suggestion.recommendation_reason);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const hasChanges = reason.trim() !== suggestion.recommendation_reason;

  function handleSave() {
    setError(null);

    startSaveTransition(async () => {
      const result = await updateStockSuggestionReason(suggestion.id, reason);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setReason(result.data.recommendation_reason);
      }
    });
  }

  return (
    <label className="grid h-full grid-rows-[auto_1fr_auto] gap-2 p-3.5 text-sm">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
        Member recommendation
      </span>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={4}
        maxLength={500}
        disabled={disabled || isSaving}
        className="min-h-[5.5rem] flex-1 rounded-lg border border-violet-200 bg-violet-50/40 px-2.5 py-2 text-sm leading-5 text-zinc-950 outline-none ring-violet-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900 dark:bg-violet-950/20 dark:text-zinc-50"
      />
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || isSaving || !hasChanges || !reason.trim()}
          className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-800 dark:bg-zinc-900 dark:text-violet-300 dark:hover:bg-violet-950/30"
        >
          {isSaving ? "Saving..." : "Save reason"}
        </button>
      </div>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </label>
  );
}

type SuggestionCardProps = {
  suggestion: StockSuggestion;
  compositeScore: number | null;
  voteCount: number;
  hasVoted: boolean;
  canDelete: boolean;
  isPending: boolean;
  accentIndex: number;
  onRemove: (suggestion: StockSuggestion) => void;
  onLaunchResearch: (suggestion: StockSuggestion) => void;
  onVoteChanged: (suggestionId: string, voted: boolean) => void;
};

function SuggestionCard({
  suggestion,
  compositeScore,
  voteCount,
  hasVoted,
  canDelete,
  isPending,
  accentIndex,
  onRemove,
  onLaunchResearch,
  onVoteChanged,
}: SuggestionCardProps) {
  const accent = CARD_ACCENTS[accentIndex % CARD_ACCENTS.length];

  return (
    <li>
      <article
        className={`overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm ring-1 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${accent.ring}`}
      >
        <div
          className={`relative bg-gradient-to-r px-3.5 py-2.5 text-white ${accent.header}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200/90">
                Stock suggestion
              </p>
              <p className="truncate text-sm font-semibold">{suggestion.ticker}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${compositeScoreBadgeClassName(compositeScore)}`}
              >
                Score {formatCompositeScore(compositeScore)}
              </span>
              {canDelete ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onRemove(suggestion)}
                  aria-label={`Remove ${suggestion.ticker} suggestion`}
                  className="rounded-md border border-white/20 bg-white/10 p-1.5 text-white transition-colors hover:bg-red-500/80 disabled:opacity-60"
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-zinc-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0 dark:divide-zinc-800">
          <StockInfoColumn suggestion={suggestion} accent={accent} />

          <div className="min-w-0 bg-white dark:bg-zinc-900">
            <RecommendationReasonEditor
              key={`${suggestion.id}-${suggestion.recommendation_reason}`}
              suggestion={suggestion}
              disabled={isPending}
            />
          </div>

          <div
            className={`min-w-0 p-3.5 ${accent.scoreBg} border-t lg:border-t-0 ${accent.scoreBorder}`}
          >
            <div className="flex h-full flex-col items-center justify-between gap-3">
              <div className="w-full text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Research composite
                </p>
                <p
                  className={`mt-1 text-3xl font-bold tabular-nums ${compositeScoreClassName(compositeScore)}`}
                >
                  {formatCompositeScore(compositeScore)}
                </p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onLaunchResearch(suggestion)}
                  className="mt-2.5 w-full rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 disabled:opacity-60 dark:border-teal-800 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-teal-950/30"
                >
                  {compositeScore !== null ? "View research" : "Launch research"}
                </button>
              </div>

              <SuggestionUpvoteControl
                suggestionId={suggestion.id}
                ticker={suggestion.ticker}
                voteCount={voteCount}
                hasVoted={hasVoted}
                disabled={isPending}
                onVoteChanged={(voted) => onVoteChanged(suggestion.id, voted)}
              />
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

type StockSuggestionPanelProps = {
  suggestions: StockSuggestion[];
  currentUserId: string;
  isAdministrator: boolean;
};

export function StockSuggestionPanel({
  suggestions,
  currentUserId,
  isAdministrator,
}: StockSuggestionPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [researchSuggestion, setResearchSuggestion] =
    useState<StockSuggestion | null>(null);
  const [compositeScores, setCompositeScores] = useState<
    Record<string, number>
  >({});
  const [voteState, setVoteState] = useState<
    Record<string, { count: number; hasVoted: boolean }>
  >({});

  function getCompositeScore(suggestion: StockSuggestion) {
    return (
      compositeScores[suggestion.id] ?? suggestion.research_composite_score
    );
  }

  function getVoteCount(suggestion: StockSuggestion) {
    return voteState[suggestion.id]?.count ?? suggestion.vote_count;
  }

  function getHasVoted(suggestion: StockSuggestion) {
    return voteState[suggestion.id]?.hasVoted ?? suggestion.current_user_has_voted;
  }

  function handleVoteChanged(suggestionId: string, voted: boolean) {
    setVoteState((current) => {
      const suggestion = suggestions.find((item) => item.id === suggestionId);
      const previous = current[suggestionId];
      const baseCount = previous?.count ?? suggestion?.vote_count ?? 0;

      return {
        ...current,
        [suggestionId]: {
          count: voted ? baseCount + 1 : Math.max(0, baseCount - 1),
          hasVoted: voted,
        },
      };
    });
  }

  function handleResearchCaptured(suggestionId: string, compositeScore: number) {
    setCompositeScores((current) => ({
      ...current,
      [suggestionId]: compositeScore,
    }));
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await addStockSuggestion(formData);

      if (result.success) {
        (
          document.getElementById("stock-suggestion-form") as HTMLFormElement
        )?.reset();
        return;
      }

      setError(result.error);
    });
  }

  function handleRemove(suggestion: StockSuggestion) {
    if (!confirm(`Remove ${suggestion.ticker} from stock suggestions?`)) {
      return;
    }

    startTransition(async () => {
      const result = await removeStockSuggestion(suggestion.id);
      if (!result.success) {
        alert(result.error);
      }
    });
  }

  function canDelete(suggestion: StockSuggestion) {
    return isAdministrator || suggestion.suggested_by === currentUserId;
  }

  return (
    <>
      {researchSuggestion ? (
        <ResearchModal
          suggestion={{
            ...researchSuggestion,
            research_composite_score: getCompositeScore(researchSuggestion),
          }}
          onClose={() => setResearchSuggestion(null)}
          onResearchCaptured={handleResearchCaptured}
        />
      ) : null}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative border-b border-white/10 bg-brand-navy px-4 py-3 text-white lg:px-5">
          <div className="brand-gradient-glow absolute inset-0" aria-hidden="true" />
          <div className="relative z-10">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-brand-teal-light transition-colors hover:text-teal-200"
            >
              ← Back to dashboard
            </Link>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-300/90">
                  Member collaboration
                </p>
                <h1 className="text-xl font-semibold tracking-tight">
                  Equity Selection
                </h1>
              </div>
              {suggestions.length > 0 ? (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-slate-200">
                  {suggestions.length}{" "}
                  {suggestions.length === 1 ? "suggestion" : "suggestions"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-300">
              Submit a ticker with your recommendation, then review club theses
              and launch research.
            </p>
          </div>
        </div>

        <form
          id="stock-suggestion-form"
          action={handleSubmit}
          className="grid gap-3 border-b border-zinc-200 bg-zinc-50/80 px-4 py-4 lg:grid-cols-[minmax(0,10rem)_1fr_auto] lg:items-end lg:gap-4 lg:px-5 dark:border-zinc-800 dark:bg-zinc-950/40"
        >
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Stock symbol
            </span>
            <input
              name="ticker"
              type="text"
              required
              placeholder="AAPL"
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 uppercase text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Member recommendation reason
            </span>
            <textarea
              name="recommendationReason"
              required
              rows={2}
              maxLength={500}
              placeholder="Why should the club consider this stock?"
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60 lg:mb-0.5"
          >
            {isPending ? "Submitting..." : "Submit suggestion"}
          </button>
        </form>

        {error ? (
          <p className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300 lg:mx-5">
            {error}
          </p>
        ) : null}

        {suggestions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400 lg:px-5">
            No stock suggestions yet. Submit a ticker above to start the list.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2 xl:gap-5 lg:p-5">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                compositeScore={getCompositeScore(suggestion)}
                voteCount={getVoteCount(suggestion)}
                hasVoted={getHasVoted(suggestion)}
                canDelete={canDelete(suggestion)}
                isPending={isPending}
                accentIndex={index}
                onRemove={handleRemove}
                onLaunchResearch={setResearchSuggestion}
                onVoteChanged={handleVoteChanged}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

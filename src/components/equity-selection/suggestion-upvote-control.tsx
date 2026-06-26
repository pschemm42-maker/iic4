"use client";

import { useState, useTransition } from "react";
import { VoteListDialog } from "@/components/equity-selection/vote-list-dialog";
import {
  removeStockSuggestionVote,
  upvoteStockSuggestion,
} from "@/lib/equity-selection/actions";

type SuggestionUpvoteControlProps = {
  suggestionId: string;
  ticker: string;
  voteCount: number;
  hasVoted: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: "live" | "meeting";
  onVoteChanged?: (voted: boolean) => void;
};

function ThumbsUpOutlineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 11.5V20h9l-1.5-6.5h3.5L17 6h-6.5l1.25-4.5H7.5v10z"
      />
    </svg>
  );
}

function ThumbsUpFilledIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M9 22h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2h-5.93l.92-4.65A2 2 0 0015.32 2h-1.64c-.56 0-1.1.24-1.48.65L7 8.5V20c0 1.1.9 2 2 2zM4 9H2v11h2V9z" />
    </svg>
  );
}

export function SuggestionUpvoteControl({
  suggestionId,
  ticker,
  voteCount,
  hasVoted,
  disabled = false,
  readOnly = false,
  mode = "live",
  onVoteChanged,
}: SuggestionUpvoteControlProps) {
  const [error, setError] = useState<string | null>(null);
  const [showVoteList, setShowVoteList] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggleVote() {
    if (disabled || isPending || readOnly) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = hasVoted
        ? await removeStockSuggestionVote(suggestionId)
        : await upvoteStockSuggestion(suggestionId);

      if (result.success) {
        onVoteChanged?.(!hasVoted);
        return;
      }

      setError(result.error);
    });
  }

  return (
    <>
      {showVoteList ? (
        <VoteListDialog
          suggestionId={suggestionId}
          ticker={ticker}
          mode={mode}
          onClose={() => setShowVoteList(false)}
        />
      ) : null}
      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Upvotes
        </p>
        <div className="flex items-center gap-2">
          {readOnly ? (
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/50"
              aria-hidden="true"
            >
              <ThumbsUpOutlineIcon />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleToggleVote}
              disabled={disabled || isPending}
              aria-label={
                hasVoted ? `Remove upvote for ${ticker}` : `Upvote ${ticker}`
              }
              title={
                hasVoted
                  ? "Click to remove your upvote"
                  : "Upvote this suggestion"
              }
              className={`rounded-lg border p-2 transition-colors disabled:cursor-not-allowed ${
                hasVoted
                  ? "border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-950/50"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              } disabled:opacity-60`}
            >
              {hasVoted ? <ThumbsUpFilledIcon /> : <ThumbsUpOutlineIcon />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowVoteList(true)}
            disabled={voteCount === 0}
            aria-label={`View ${voteCount} upvotes for ${ticker}`}
            className="min-w-[1.75rem] rounded-lg px-1 py-1 text-lg font-semibold tabular-nums text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-teal-700 hover:decoration-teal-500 disabled:cursor-default disabled:no-underline disabled:opacity-50 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-teal-400 dark:hover:decoration-teal-600"
          >
            {voteCount}
          </button>
        </div>
        {error ? (
          <p className="max-w-[10rem] text-center text-[11px] text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}

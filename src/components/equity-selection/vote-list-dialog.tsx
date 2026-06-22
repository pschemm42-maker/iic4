"use client";

import { useEffect, useState } from "react";
import { listVotesForSuggestion } from "@/lib/equity-selection/actions";
import type { StockSuggestionVote } from "@/lib/types/equity-selection";

type VoteListDialogProps = {
  suggestionId: string;
  ticker: string;
  onClose: () => void;
};

function formatVoteDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function VoteListDialog({
  suggestionId,
  ticker,
  onClose,
}: VoteListDialogProps) {
  const [votes, setVotes] = useState<StockSuggestionVote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadVotes() {
      setIsLoading(true);
      setError(null);

      const result = await listVotesForSuggestion(suggestionId);

      if (cancelled) {
        return;
      }

      if (result.success && result.data) {
        setVotes(result.data);
      } else {
        setError(result.success ? "No upvotes yet." : result.error);
      }

      setIsLoading(false);
    }

    void loadVotes();

    return () => {
      cancelled = true;
    };
  }, [suggestionId]);

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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close upvote list dialog"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-list-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="vote-list-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              {ticker} upvotes
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Members who upvoted this stock suggestion.
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

        <div className="max-h-[min(50vh,20rem)] overflow-auto px-6 py-4">
          {isLoading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading upvotes…
            </p>
          ) : error ? (
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          ) : votes && votes.length > 0 ? (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {votes.map((vote) => (
                <li
                  key={vote.id}
                  className="flex items-baseline justify-between gap-3 py-2.5"
                >
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {vote.voter_name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatVoteDate(vote.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No upvotes yet for this suggestion.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

type EquitySelectionHistoryLinkProps = {
  onDark?: boolean;
};

export function EquitySelectionHistoryLink({
  onDark = false,
}: EquitySelectionHistoryLinkProps) {
  return (
    <Link
      href="/equity-selection/history"
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        onDark
          ? "border-white/20 text-white hover:bg-white/10"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      Equity selection history
    </Link>
  );
}

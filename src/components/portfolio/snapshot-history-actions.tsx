"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateHistoricSnapshotDialog } from "@/components/portfolio/create-historic-snapshot-dialog";

type CreateHistoricSnapshotButtonProps = {
  onDark?: boolean;
};

export function CreateHistoricSnapshotButton({
  onDark = false,
}: CreateHistoricSnapshotButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen ? (
        <CreateHistoricSnapshotDialog onClose={() => setIsOpen(false)} />
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
          onDark
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        Create historic snapshot
      </button>
    </>
  );
}

type ClubPortfolioHistoryLinkProps = {
  onDark?: boolean;
};

export function ClubPortfolioHistoryLink({
  onDark = false,
}: ClubPortfolioHistoryLinkProps) {
  return (
    <Link
      href="/portfolio/history"
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
        onDark
          ? "border-white/20 text-white hover:bg-white/10"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      Club portfolio history
    </Link>
  );
}

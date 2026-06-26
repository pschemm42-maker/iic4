"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMeeting } from "@/lib/equity-selection/meeting-actions";

type SaveMeetingButtonProps = {
  onDark?: boolean;
  disabled?: boolean;
};

export function SaveMeetingButton({
  onDark = false,
  disabled = false,
}: SaveMeetingButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (
      !confirm(
        "Save this meeting to history? All current stock suggestions, research, and votes will be archived and the equity selection page will be cleared.",
      )
    ) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await saveMeeting();

      if (result.success) {
        setMessage(result.message ?? "Meeting saved.");
        router.refresh();
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
        disabled={disabled || isPending}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          onDark
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        {isPending ? "Saving meeting..." : "Save meeting"}
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

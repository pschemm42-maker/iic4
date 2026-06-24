"use client";

import { useEffect, useState, useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import {
  addDashboardMessage,
  deleteDashboardMessage,
  updateDashboardMessage,
} from "@/lib/dashboard/actions";
import type { DashboardMessage } from "@/lib/types/dashboard-message";

type MessagePanelProps = {
  messages: DashboardMessage[];
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MessageItem({ message }: { message: DashboardMessage }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const wasEdited = message.updated_at !== message.created_at;

  function handleEdit() {
    setDraft(message.body);
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setError(null);
  }

  function handleSave() {
    setError(null);
    const formData = new FormData();
    formData.set("body", draft);

    startTransition(async () => {
      const result = await updateDashboardMessage(message.id, formData);
      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this message?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDashboardMessage(message.id);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <li className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-brand-navy dark:text-zinc-100">
            {message.author_name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatTimestamp(message.created_at)}
            {wasEdited ? " · edited" : ""}
          </p>
        </div>
        {!isEditing && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleEdit}
              disabled={isPending}
              className="rounded px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-white hover:text-zinc-700 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={isPending}
            autoFocus
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 disabled:opacity-60"
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {message.body}
        </p>
      )}

      {!isEditing && error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </li>
  );
}

function AddMessageDialog({ onClose }: { onClose: () => void }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("body", body);

    startTransition(async () => {
      const result = await addDashboardMessage(formData);
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close add message dialog"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
        disabled={isPending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-message-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="add-message-title"
              className="text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Add message
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Share an update or note with fellow members.
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

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Message
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a message…"
              rows={5}
              maxLength={2000}
              disabled={isPending}
              autoFocus
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 disabled:opacity-60"
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !body.trim()}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Posting…" : "Post message"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MessagePanel({ messages }: MessagePanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <BrandCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-brand-navy dark:text-zinc-50">
            Club messages
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Share updates and notes with fellow members.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="shrink-0 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          Add message
        </button>
      </div>

      {messages.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No messages yet. Select Add message to post the first one.
        </p>
      )}

      {isAddOpen ? (
        <AddMessageDialog onClose={() => setIsAddOpen(false)} />
      ) : null}
    </BrandCard>
  );
}

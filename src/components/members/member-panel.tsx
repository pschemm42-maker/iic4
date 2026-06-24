"use client";

import { useState, useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import { updateAbout, updateMemberProfile } from "@/lib/members/actions";
import { formatUserRole, type UserProfile } from "@/lib/types/user";

type MemberPanelProps = {
  member: UserProfile;
  isCurrentUser: boolean;
  isAdmin: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDollars(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type FieldEditorProps = {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
  onSave: (value: string) => Promise<void>;
};

function FieldEditor({
  label,
  value,
  placeholder,
  multiline = false,
  disabled = false,
  onSave,
}: FieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      setError(null);
      await onSave(draft);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        {multiline ? (
          <textarea
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            disabled={isPending}
          />
        ) : (
          <input
            type="text"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            disabled={isPending}
          />
        )}
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-brand-teal px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-400 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/field space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
          {value || (
            <span className="italic text-zinc-400 dark:text-zinc-500">
              {placeholder ?? "—"}
            </span>
          )}
        </p>
        {!disabled ? (
          <button
            type="button"
            onClick={handleEdit}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 group-hover/field:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

type BasisEditorProps = {
  value: number | null;
  disabled?: boolean;
  onSave: (value: string) => Promise<void>;
};

function BasisEditor({ value, disabled = false, onSave }: BasisEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value !== null ? String(value) : "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const displayValue = formatDollars(value);

  function handleEdit() {
    setDraft(value !== null ? String(value) : "");
    setError(null);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      setError(null);
      await onSave(draft);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Basis
        </p>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500 dark:text-zinc-400">
            $
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-7 pr-3 text-sm text-zinc-900 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="0.00"
            disabled={isPending}
          />
        </div>
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-brand-teal px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-400 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/field space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Basis
      </p>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
          {displayValue ?? (
            <span className="font-normal italic text-zinc-400 dark:text-zinc-500">
              Not set
            </span>
          )}
        </p>
        {!disabled ? (
          <button
            type="button"
            onClick={handleEdit}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 group-hover/field:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function MemberPanel({ member, isCurrentUser, isAdmin }: MemberPanelProps) {
  const [aboutError, setAboutError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  async function handleSaveAbout(value: string) {
    setAboutError(null);
    const result = await updateAbout(value);
    if (!result.success) {
      setAboutError(result.error);
    }
  }

  async function handleSavePosition(value: string) {
    setMemberError(null);
    const result = await updateMemberProfile(member.id, { position: value });
    if (!result.success) {
      setMemberError(result.error);
    }
  }

  async function handleSaveBasis(value: string) {
    setMemberError(null);
    const result = await updateMemberProfile(member.id, { basis: value });
    if (!result.success) {
      setMemberError(result.error);
    }
  }

  return (
    <BrandCard className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-brand-navy dark:text-zinc-50">
            {member.full_name || "—"}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {member.email}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {formatUserRole(member.role)}
        </span>
      </div>

      {(aboutError || memberError) ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {aboutError ?? memberError}
        </p>
      ) : null}

      <FieldEditor
        label="About"
        value={member.about}
        placeholder="No bio yet."
        multiline
        disabled={!isCurrentUser}
        onSave={handleSaveAbout}
      />

      <FieldEditor
        label="Position"
        value={member.position}
        placeholder="No position set."
        disabled={!isAdmin}
        onSave={handleSavePosition}
      />

      <div className="space-y-1">
        <BasisEditor
          value={member.basis}
          disabled={!isAdmin}
          onSave={handleSaveBasis}
        />
        {member.basis_last_edited ? (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Last updated {formatDate(member.basis_last_edited)}
          </p>
        ) : null}
      </div>
    </BrandCard>
  );
}

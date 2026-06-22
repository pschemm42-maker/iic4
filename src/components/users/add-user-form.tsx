"use client";

import { useState, useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import { createUser, inviteUser } from "@/lib/users/actions";
import { USER_ROLES, formatUserRole, type UserRole } from "@/lib/types/user";

type AddUserAction = "save" | "save-invite";

export function AddUserForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<AddUserAction | null>(null);

  function handleSubmit(action: AddUserAction, formData: FormData) {
    setMessage(null);
    setError(null);
    setPendingAction(action);

    startTransition(async () => {
      const result =
        action === "save"
          ? await createUser(formData)
          : await inviteUser(formData);

      setPendingAction(null);

      if (result.success) {
        setMessage(
          action === "save"
            ? `${result.data?.email} saved as Pending. Use Invite in the users list when you are ready to send email.`
            : `Invite sent to ${result.data?.email}.`,
        );
        (document.getElementById("add-user-form") as HTMLFormElement)?.reset();
        return;
      }

      setError(result.error);
    });
  }

  return (
    <BrandCard accent className="p-6">
      <div className="mb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-400/90">
          Member access
        </p>
        <h2 className="mt-1 text-xl font-semibold text-brand-navy dark:text-zinc-50">
          Add user
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Use <strong>Save user</strong> to add members without sending email.
          Invite them individually from the users list below, or all at once
          with <strong>Invite all pending</strong>.
        </p>
      </div>

      <form id="add-user-form" className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Full name
            </span>
            <input
              name="fullName"
              type="text"
              required
              disabled={isPending}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-emerald-500 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="Jane Doe"
            />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              disabled={isPending}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-emerald-500 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="jane@example.com"
            />
          </label>
        </div>

        <label className="grid max-w-xs gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Role
          </span>
          <select
            name="role"
            defaultValue="user"
            disabled={isPending}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-emerald-500 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {formatUserRole(role as UserRole)}
              </option>
            ))}
          </select>
        </label>

        {message ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isPending}
            formAction={(formData) => handleSubmit("save", formData)}
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "save" ? "Saving..." : "Save user"}
          </button>
          <button
            type="submit"
            disabled={isPending}
            formAction={(formData) => handleSubmit("save-invite", formData)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {pendingAction === "save-invite" ? "Saving & inviting..." : "Save & invite"}
          </button>
        </div>
      </form>
    </BrandCard>
  );
}

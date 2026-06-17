"use client";

import { useState, useTransition } from "react";
import { inviteUser } from "@/lib/users/actions";
import { USER_ROLES, formatUserRole, type UserRole } from "@/lib/types/user";

export function InviteUserForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await inviteUser(formData);

      if (result.success) {
        setMessage(`Invite sent to ${result.data?.email}.`);
        (document.getElementById("invite-user-form") as HTMLFormElement)?.reset();
        return;
      }

      setError(result.error);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Invite user
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Send an email invite so the user can set their password and join the
          application.
        </p>
      </div>

      <form id="invite-user-form" action={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Full name
            </span>
            <input
              name="fullName"
              type="text"
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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

        <div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Sending invite..." : "Send invite"}
          </button>
        </div>
      </form>
    </section>
  );
}

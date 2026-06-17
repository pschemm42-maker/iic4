"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateUser } from "@/lib/users/actions";
import {
  USER_ROLES,
  formatUserRole,
  type UserProfile,
  type UserRole,
} from "@/lib/types/user";

type EditUserFormProps = {
  user: UserProfile;
};

export function EditUserForm({ user }: EditUserFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await updateUser(user.id, formData);

      if (result.success) {
        setMessage("User updated.");
        return;
      }

      setError(result.error);
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Edit user
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Update profile details and role assignment.
          </p>
        </div>
        <Link
          href="/users"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
        >
          Back to users
        </Link>
      </div>

      <form action={handleSubmit} className="grid max-w-xl gap-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </span>
          <input
            type="email"
            value={user.email}
            disabled
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Full name
          </span>
          <input
            name="fullName"
            type="text"
            required
            defaultValue={user.full_name}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>

        <input type="hidden" name="email" value={user.email} />

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Role
          </span>
          <select
            name="role"
            defaultValue={user.role}
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
            {isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

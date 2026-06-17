"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  deleteUser,
  resendInvite,
  updateUserStatus,
} from "@/lib/users/actions";
import {
  formatUserRole,
  formatUserStatus,
  type UserProfile,
} from "@/lib/types/user";

type UserTableProps = {
  users: UserProfile[];
};

export function UserTable({ users }: UserTableProps) {
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success && result.error) {
        alert(result.error);
      }
    });
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No users yet. Send an invite to create the first account.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Users
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-zinc-200 dark:border-zinc-800"
              >
                <td className="px-6 py-4 font-medium text-zinc-950 dark:text-zinc-50">
                  {user.full_name || "—"}
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {formatUserRole(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : user.status === "invited"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {formatUserStatus(user.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/users/${user.id}/edit`}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Edit
                    </Link>
                    {user.status === "invited" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(async () => resendInvite(user.id))
                        }
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Resend
                      </button>
                    ) : null}
                    {user.status === "disabled" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(async () =>
                            updateUserStatus(user.id, "active"),
                          )
                        }
                        className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(async () =>
                            updateUserStatus(user.id, "disabled"),
                          )
                        }
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Disable
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          confirm(
                            `Delete ${user.email}? This cannot be undone.`,
                          )
                        ) {
                          runAction(async () => deleteUser(user.id));
                        }
                      }}
                      className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

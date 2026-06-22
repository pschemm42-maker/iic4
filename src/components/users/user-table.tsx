"use client";

import Link from "next/link";
import { useTransition } from "react";
import { BrandCard } from "@/components/brand/brand-card";
import {
  deleteUser,
  inviteAllPendingUsers,
  sendInvite,
  sendPasswordReset,
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
  const pendingUsers = users.filter((user) => user.status === "pending");
  const pendingCount = pendingUsers.length;

  function runAction(
    action: () => Promise<{ success: boolean; error?: string; data?: unknown }>,
    successMessage?: string | ((result: { invitedCount?: number }) => string),
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success && result.error) {
        alert(result.error);
        return;
      }

      if (successMessage) {
        const invitedCount =
          result.data &&
          typeof result.data === "object" &&
          "invitedCount" in result.data
            ? (result.data as { invitedCount?: number }).invitedCount
            : undefined;
        const message =
          typeof successMessage === "function"
            ? successMessage({ invitedCount })
            : successMessage;
        alert(message);
      }
    });
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No users yet. Use <strong>Save user</strong> to add members, then invite
          them from this list when you are ready.
        </p>
      </div>
    );
  }

  return (
    <BrandCard accent className="overflow-hidden">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-brand-navy dark:text-zinc-50">
              Users
            </h2>
            {pendingCount > 0 ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {pendingCount} saved member{pendingCount === 1 ? "" : "s"} waiting
                for an invite.
              </p>
            ) : null}
          </div>
          {pendingCount > 0 ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (
                  confirm(
                    `Send invite emails to ${pendingCount} pending member${pendingCount === 1 ? "" : "s"}?`,
                  )
                ) {
                  runAction(
                    async () => inviteAllPendingUsers(),
                    (result) =>
                      `${result.invitedCount ?? pendingCount} invite${(result.invitedCount ?? pendingCount) === 1 ? "" : "s"} sent.`,
                  );
                }
              }}
              className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Invite all pending
            </button>
          ) : null}
        </div>
      </div>

      {pendingCount > 0 ? (
        <div className="border-b border-sky-200 bg-sky-50 px-6 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          Saved members show as <strong>Pending</strong>. Use{" "}
          <strong>Invite</strong> on each row when you want to send their email,
          or invite everyone at once above.
        </div>
      ) : null}

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
                          : user.status === "pending"
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
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
                    {user.status === "pending" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(
                            async () => sendInvite(user.id),
                            `Invite sent to ${user.email}.`,
                          )
                        }
                        className="rounded-md bg-brand-teal px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-400 disabled:opacity-60"
                      >
                        Invite
                      </button>
                    ) : null}
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
                          runAction(
                            async () => sendInvite(user.id),
                            `Invite resent to ${user.email}.`,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Resend
                      </button>
                    ) : null}
                    {user.status === "active" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Send a password reset email to ${user.email}?`,
                            )
                          ) {
                            runAction(
                              async () => sendPasswordReset(user.id),
                              `Password reset email sent to ${user.email}.`,
                            );
                          }
                        }}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Reset password
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
    </BrandCard>
  );
}

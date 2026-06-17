import { InviteUserForm } from "@/components/users/invite-user-form";
import { UserTable } from "@/components/users/user-table";
import { requireAdministrator } from "@/lib/auth/session";
import { getSupabaseConfigError, hasAdminCredentials } from "@/lib/env";
import { listUsers } from "@/lib/users/actions";

export default async function UsersPage() {
  await requireAdministrator();
  const usersResult = await listUsers();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
          User management
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Users
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Invite members by email, assign administrator or user roles, and manage
          account status.
        </p>
      </div>

      {!hasAdminCredentials() ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="font-mono">.env.local</code> to enable invites and
          user management.
        </div>
      ) : null}

      {getSupabaseConfigError() ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {getSupabaseConfigError()}
        </div>
      ) : null}

      <InviteUserForm />

      {usersResult.success ? (
        <UserTable users={usersResult.data ?? []} />
      ) : (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {usersResult.error}
        </div>
      )}
    </div>
  );
}

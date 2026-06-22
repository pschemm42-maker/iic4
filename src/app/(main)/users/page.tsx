import { PageBanner } from "@/components/brand/page-banner";
import { AddUserForm } from "@/components/users/add-user-form";
import { UserTable } from "@/components/users/user-table";
import { requireAdministrator } from "@/lib/auth/session";
import { getSupabaseConfigError, hasAdminCredentials } from "@/lib/env";
import { listUsers } from "@/lib/users/actions";

export default async function UsersPage() {
  await requireAdministrator();
  const usersResult = await listUsers();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <PageBanner
        backHref="/dashboard"
        eyebrow="User management"
        title="Club members"
        description="Add members, send invites when ready, assign roles, and manage account access."
      />

      {!hasAdminCredentials() ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="font-mono">.env.local</code> to enable invites and
          user management.
        </div>
      ) : null}

      {getSupabaseConfigError() ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {getSupabaseConfigError()}
        </div>
      ) : null}

      <AddUserForm />

      {usersResult.success ? (
        <UserTable users={usersResult.data ?? []} />
      ) : (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {usersResult.error}
        </div>
      )}
    </div>
  );
}

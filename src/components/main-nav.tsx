import Link from "next/link";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";

export async function MainNav() {
  const profile = await getCurrentProfile();
  const showUsers = isAdministrator(profile);

  return (
    <>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        Dashboard
      </Link>
      {showUsers ? (
        <Link
          href="/users"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Users
        </Link>
      ) : null}
    </>
  );
}

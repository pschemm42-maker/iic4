import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";

export async function AuthNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="rounded-lg bg-[#0C1929] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#16263d]"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
        {user.email}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

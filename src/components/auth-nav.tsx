import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";

export async function AuthNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="rounded-lg bg-brand-teal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-400"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-slate-400 sm:inline">{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

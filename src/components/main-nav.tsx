import Link from "next/link";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";

export async function MainNav() {
  const profile = await getCurrentProfile();
  const showUsers = isAdministrator(profile);

  return (
    <>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
      >
        Dashboard
      </Link>
      <Link
        href="/members"
        className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
      >
        Members
      </Link>
      {showUsers ? (
        <Link
          href="/users"
          className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          Users
        </Link>
      ) : null}
    </>
  );
}

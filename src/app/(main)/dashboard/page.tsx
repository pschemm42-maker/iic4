import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getCurrentUser,
  isAdministrator,
} from "@/lib/auth/session";

const cards = [
  {
    title: "Portfolio",
    description: "Track stock holdings and performance.",
    href: "/portfolio",
    available: true,
  },
  {
    title: "Research",
    description: "Share investment ideas with members.",
    href: null,
    available: false,
  },
  {
    title: "Club admin",
    description: "Manage members and club settings.",
    href: null,
    available: false,
  },
] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getCurrentProfile();
  const showUsers = isAdministrator(profile);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
          Member dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Welcome back
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Signed in as {user.email}. Your Independent Investment Club IV workspace
          is ready for portfolio tracking and club management.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) =>
          card.available && card.href ? (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-teal-300 hover:bg-teal-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
            >
              <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {card.description}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">
                Open →
              </p>
            </Link>
          ) : (
            <div
              key={card.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {card.description}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Coming soon
              </p>
            </div>
          ),
        )}
      </div>

      {showUsers ? (
        <div>
          <Link
            href="/users"
            className="text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
          >
            Manage users →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

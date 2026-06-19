import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";

export default async function EquitySelectionPage() {
  await requireAuth();

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
        >
          ← Back to dashboard
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
          Member collaboration
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Equity Selection
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Propose and discuss stock ideas for Independent Investment Club IV.
          Share theses, compare candidates, and coordinate what the club should
          consider next.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Equity selection tools are coming soon. This is where members will
          submit and review investment ideas.
        </p>
      </div>
    </div>
  );
}

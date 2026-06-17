import Link from "next/link";
import { AddHoldingForm } from "@/components/portfolio/add-holding-form";
import { PortfolioSummaryCards } from "@/components/portfolio/portfolio-summary";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import { RefreshAllPricesButton } from "@/components/portfolio/refresh-all-prices-button";
import {
  getCurrentProfile,
  isAdministrator,
  requireAuth,
} from "@/lib/auth/session";
import { enrichHoldings } from "@/lib/portfolio/metrics";
import { listHoldings } from "@/lib/portfolio/actions";

export default async function PortfolioPage() {
  await requireAuth();
  const profile = await getCurrentProfile();
  const canManage = isAdministrator(profile);
  const holdingsResult = await listHoldings();

  const holdings =
    holdingsResult.success && holdingsResult.data
      ? enrichHoldings(holdingsResult.data)
      : [];

  const lastUpdatedAt =
    holdingsResult.success && holdingsResult.data && holdingsResult.data.length > 0
      ? holdingsResult.data.reduce((latest, holding) =>
          holding.updated_at > latest ? holding.updated_at : latest,
        holdingsResult.data[0].updated_at)
      : null;

  return (
    <div className="flex w-full flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
          >
            ← Back to dashboard
          </Link>
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            Portfolio tracking
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Club equity portfolio
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Track Independent Investment Club IV stock positions, cost basis,
            market value, and performance across the club portfolio.
          </p>
        </div>
        {canManage ? (
          <RefreshAllPricesButton lastUpdatedAt={lastUpdatedAt} />
        ) : null}
      </div>

      {!holdingsResult.success ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {holdingsResult.error}
        </div>
      ) : (
        <>
          <PortfolioSummaryCards holdings={holdings} />
          {canManage ? <AddHoldingForm /> : null}
          <PortfolioTable holdings={holdings} isAdministrator={canManage} />
        </>
      )}
    </div>
  );
}

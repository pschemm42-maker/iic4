import { notFound } from "next/navigation";
import { PageBanner } from "@/components/brand/page-banner";
import { PortfolioSummaryCards } from "@/components/portfolio/portfolio-summary";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import {
  getCurrentProfile,
  isAdministrator,
  requireAuth,
} from "@/lib/auth/session";
import { enrichHoldings } from "@/lib/portfolio/metrics";
import {
  getSnapshot,
  listSnapshotHoldings,
} from "@/lib/portfolio/snapshot-actions";

type PortfolioSnapshotPageProps = {
  params: Promise<{ id: string }>;
};

function formatSnapshotDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    dateStyle: "long",
    timeZone: "UTC",
  });
}

export default async function PortfolioSnapshotPage({
  params,
}: PortfolioSnapshotPageProps) {
  await requireAuth();
  const { id } = await params;
  const profile = await getCurrentProfile();
  const canManage = isAdministrator(profile);

  const [snapshotResult, holdingsResult] = await Promise.all([
    getSnapshot(id),
    listSnapshotHoldings(id),
  ]);

  if (!snapshotResult.success || !snapshotResult.data) {
    notFound();
  }

  const snapshot = snapshotResult.data;
  const holdings =
    holdingsResult.success && holdingsResult.data
      ? enrichHoldings(holdingsResult.data)
      : [];

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageBanner
        backHref="/portfolio/history"
        eyebrow="Historic portfolio"
        title={`Club equity portfolio — ${formatSnapshotDate(snapshot.snapshot_date)}`}
        description="Snapshot of club holdings, cost basis, market value, and performance as of this date."
      />

      {!holdingsResult.success ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {holdingsResult.error}
        </div>
      ) : (
        <>
          <PortfolioSummaryCards
            holdings={holdings}
            clubCash={Number(snapshot.club_cash ?? 0)}
          />
          <PortfolioTable
            holdings={holdings}
            isAdministrator={canManage}
            mode="snapshot"
          />
        </>
      )}
    </div>
  );
}

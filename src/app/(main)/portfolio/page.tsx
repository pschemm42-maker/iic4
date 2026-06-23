import { PageBanner } from "@/components/brand/page-banner";
import { AddHoldingForm } from "@/components/portfolio/add-holding-form";
import { ExportPortfolioButton } from "@/components/portfolio/export-portfolio-button";
import { PortfolioSummaryCards } from "@/components/portfolio/portfolio-summary";
import { PortfolioTable } from "@/components/portfolio/portfolio-table";
import { RefreshAllPricesButton } from "@/components/portfolio/refresh-all-prices-button";
import { ClubPortfolioHistoryLink } from "@/components/portfolio/snapshot-history-actions";
import { SaveSnapshotButton } from "@/components/portfolio/save-snapshot-button";
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
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageBanner
        backHref="/dashboard"
        eyebrow="Portfolio tracking"
        title="Club equity portfolio"
        description="Track Independent Investment Club IV stock positions, cost basis, market value, and performance across the club portfolio."
        actions={
          <div className="flex flex-wrap items-start justify-end gap-2">
            <ClubPortfolioHistoryLink onDark />
            <ExportPortfolioButton holdings={holdings} onDark />
            {canManage ? (
              <>
                <SaveSnapshotButton onDark />
                <RefreshAllPricesButton lastUpdatedAt={lastUpdatedAt} onDark />
              </>
            ) : null}
          </div>
        }
      />

      {!holdingsResult.success ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
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

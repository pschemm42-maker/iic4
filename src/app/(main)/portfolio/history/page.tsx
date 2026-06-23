import { PageBanner } from "@/components/brand/page-banner";
import { CreateHistoricSnapshotButton } from "@/components/portfolio/snapshot-history-actions";
import { SnapshotHistoryTable } from "@/components/portfolio/snapshot-history-table";
import {
  getCurrentProfile,
  isAdministrator,
  requireAuth,
} from "@/lib/auth/session";
import { listSnapshots } from "@/lib/portfolio/snapshot-actions";

export default async function PortfolioHistoryPage() {
  await requireAuth();
  const profile = await getCurrentProfile();
  const canManage = isAdministrator(profile);
  const snapshotsResult = await listSnapshots();

  const snapshots =
    snapshotsResult.success && snapshotsResult.data ? snapshotsResult.data : [];

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageBanner
        backHref="/portfolio"
        eyebrow="Portfolio history"
        title="Club portfolio history"
        description="Review saved snapshots of the club equity portfolio, including holdings, cost basis, market value, and returns as of each snapshot date."
        actions={
          canManage ? (
            <div className="flex flex-wrap items-start justify-end gap-2">
              <CreateHistoricSnapshotButton onDark />
            </div>
          ) : null
        }
      />

      {!snapshotsResult.success ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {snapshotsResult.error}
        </div>
      ) : (
        <SnapshotHistoryTable
          snapshots={snapshots}
          isAdministrator={canManage}
        />
      )}
    </div>
  );
}

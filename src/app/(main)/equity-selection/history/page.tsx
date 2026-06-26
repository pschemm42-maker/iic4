import { PageBanner } from "@/components/brand/page-banner";
import { MeetingHistoryTable } from "@/components/equity-selection/meeting-history-table";
import {
  getCurrentProfile,
  isAdministrator,
  requireAuth,
} from "@/lib/auth/session";
import { listMeetings } from "@/lib/equity-selection/meeting-actions";

export default async function EquitySelectionHistoryPage() {
  await requireAuth();
  const profile = await getCurrentProfile();
  const canManage = isAdministrator(profile);
  const meetingsResult = await listMeetings();

  const meetings =
    meetingsResult.success && meetingsResult.data ? meetingsResult.data : [];

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageBanner
        backHref="/equity-selection"
        eyebrow="Equity selection history"
        title="Club meeting history"
        description="Review saved equity selection meetings, including stock suggestions, research, and member votes as they appeared when each meeting was saved."
      />

      {!meetingsResult.success ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {meetingsResult.error}
        </div>
      ) : (
        <MeetingHistoryTable
          meetings={meetings}
          isAdministrator={canManage}
        />
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { PageBanner } from "@/components/brand/page-banner";
import { StockSuggestionPanel } from "@/components/equity-selection/stock-suggestion-panel";
import {
  getMeeting,
  listMeetingSuggestions,
} from "@/lib/equity-selection/meeting-actions";
import { requireAuth } from "@/lib/auth/session";

type EquitySelectionMeetingPageProps = {
  params: Promise<{ id: string }>;
};

function formatMeetingDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default async function EquitySelectionMeetingPage({
  params,
}: EquitySelectionMeetingPageProps) {
  await requireAuth();
  const { id } = await params;

  const [meetingResult, suggestionsResult] = await Promise.all([
    getMeeting(id),
    listMeetingSuggestions(id),
  ]);

  if (!meetingResult.success || !meetingResult.data) {
    notFound();
  }

  const meeting = meetingResult.data;
  const suggestions =
    suggestionsResult.success && suggestionsResult.data
      ? suggestionsResult.data
      : [];

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageBanner
        backHref="/equity-selection/history"
        eyebrow="Historic meeting"
        title={`Equity selection — ${formatMeetingDate(meeting.saved_at)}`}
        description={`Archived meeting with ${meeting.suggestion_count} ${meeting.suggestion_count === 1 ? "suggestion" : "suggestions"} and ${meeting.vote_count} ${meeting.vote_count === 1 ? "vote" : "votes"}. This view is read-only.`}
      />

      {!suggestionsResult.success ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {suggestionsResult.error}
        </div>
      ) : (
        <StockSuggestionPanel suggestions={suggestions} mode="meeting" />
      )}
    </div>
  );
}

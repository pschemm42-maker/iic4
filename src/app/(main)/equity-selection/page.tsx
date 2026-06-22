import { StockSuggestionPanel } from "@/components/equity-selection/stock-suggestion-panel";
import { listStockSuggestions } from "@/lib/equity-selection/actions";
import {
  getCurrentProfile,
  getCurrentUser,
  isAdministrator,
  requireAuth,
} from "@/lib/auth/session";

export default async function EquitySelectionPage() {
  await requireAuth();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const suggestionsResult = await listStockSuggestions();

  const suggestions =
    suggestionsResult.success && suggestionsResult.data
      ? suggestionsResult.data
      : [];

  if (!suggestionsResult.success) {
    return (
      <div className="flex w-full flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {suggestionsResult.error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
      <StockSuggestionPanel
        suggestions={suggestions}
        currentUserId={user!.id}
        isAdministrator={isAdministrator(profile)}
      />
    </div>
  );
}

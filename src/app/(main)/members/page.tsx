import { PageBanner } from "@/components/brand/page-banner";
import { MemberPanel } from "@/components/members/member-panel";
import { getCurrentProfile, isAdministrator, requireAuth } from "@/lib/auth/session";
import { listMembers } from "@/lib/members/actions";
import { getClubCash, listHoldings } from "@/lib/portfolio/actions";
import {
  calculatePortfolioSummary,
  enrichHoldings,
  formatCurrency,
} from "@/lib/portfolio/metrics";

export default async function MembersPage() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();
  const admin = isAdministrator(profile);

  const [membersResult, holdingsResult, clubCashResult] = await Promise.all([
    listMembers(),
    listHoldings(),
    getClubCash(),
  ]);

  const memberCount =
    membersResult.success && membersResult.data
      ? membersResult.data.length
      : 0;
  const clubCash = clubCashResult.success ? (clubCashResult.data ?? 0) : 0;
  const holdings =
    holdingsResult.success && holdingsResult.data
      ? enrichHoldings(holdingsResult.data)
      : [];
  const totalClubEquity = calculatePortfolioSummary(holdings, clubCash).totalClubEquity;
  const equityShare =
    totalClubEquity !== null && memberCount > 0
      ? totalClubEquity / memberCount
      : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <PageBanner
        backHref="/dashboard"
        eyebrow="Club members"
        title="Meet the team."
        description="Members of the investment club. Edit your own bio, and — if you're an admin — update each member's position and investment basis."
        actions={
          <div className="flex flex-col justify-center text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-300/90">
              Equity Share
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">
              {formatCurrency(equityShare)}
            </p>
          </div>
        }
      />

      {membersResult.success ? (
        membersResult.data && membersResult.data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {membersResult.data.map((member) => (
              <MemberPanel
                key={member.id}
                member={member}
                isCurrentUser={member.id === user.id}
                isAdmin={admin}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No members yet.
            </p>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {membersResult.error}
        </div>
      )}
    </div>
  );
}

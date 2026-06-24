import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandCard } from "@/components/brand/brand-card";
import { PageBanner } from "@/components/brand/page-banner";
import { MessagePanel } from "@/components/dashboard/message-panel";
import { listDashboardMessages } from "@/lib/dashboard/actions";
import { getCurrentUser } from "@/lib/auth/session";

const cards = [
  {
    title: "Portfolio",
    description: "Track stock holdings and performance.",
    href: "/portfolio",
    available: true,
  },
  {
    title: "Club Portfolio History",
    description: "Review saved snapshots of club holdings and performance.",
    href: "/portfolio/history",
    available: true,
  },
  {
    title: "Equity Selection",
    description: "Share investment ideas and stock theses with members.",
    href: "/equity-selection",
    available: true,
  },
  {
    title: "Club Members",
    description: "View member profiles, bios, positions, and investment bases.",
    href: "/members",
    available: true,
  },
] as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const messagesResult = await listDashboardMessages();
  const messages =
    messagesResult.success && messagesResult.data ? messagesResult.data : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <PageBanner
        eyebrow="Member dashboard"
        title="Welcome back."
        titleAccent="Your club workspace."
        description={`Signed in as ${user.email}. Track portfolio performance, review equity selections, and collaborate with fellow members.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) =>
          card.available && card.href ? (
            <Link key={card.title} href={card.href} className="group block">
              <BrandCard hover className="h-full p-5">
                <h2 className="font-semibold text-brand-navy dark:text-zinc-50">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {card.description}
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-brand-teal group-hover:text-teal-600 dark:text-teal-400">
                  Open →
                </p>
              </BrandCard>
            </Link>
          ) : (
            <BrandCard key={card.title} className="p-5 opacity-75">
              <h2 className="font-semibold text-brand-navy dark:text-zinc-50">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {card.description}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Coming soon
              </p>
            </BrandCard>
          ),
        )}
      </div>

      {messagesResult.success ? (
        <MessagePanel messages={messages} />
      ) : (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {messagesResult.error}
        </div>
      )}
    </div>
  );
}

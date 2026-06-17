import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-zinc-200 bg-[#0C1929] px-6 py-20 text-white dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <Logo
              size="lg"
              className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-amber-300/90"
            />
            <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">
              Invest with clarity.
              <span className="block text-teal-300">Manage as a club.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Independent Investment Club IV is a member platform for tracking
              stock investments, coordinating research, and growing club capital
              together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-400"
                >
                  Go to dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-400"
                >
                  Member sign in
                </Link>
              )}
            </div>
          </div>

          <div className="grid w-full max-w-md gap-3 sm:grid-cols-2 lg:max-w-sm">
            {[
              { label: "Asset class", value: "Equities" },
              { label: "Structure", value: "Investment club" },
              { label: "Members", value: "Invite only" },
              { label: "Horizon", value: "Long-term" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Portfolio tracking",
              description:
                "Monitor stock positions, cost basis, and club performance in one place.",
            },
            {
              title: "Member collaboration",
              description:
                "Share research and investment theses with fellow club members.",
            },
            {
              title: "Secure access",
              description:
                "Invite-only membership with role-based administration.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="font-semibold text-zinc-950 dark:text-zinc-50">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

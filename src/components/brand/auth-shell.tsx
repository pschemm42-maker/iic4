import { Logo } from "@/components/brand/logo";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  description: string;
};

export function AuthShell({ children, title, description }: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden w-1/2 overflow-hidden bg-[#0C1929] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.18),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(184,147,63,0.14),_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0C1929] to-transparent" />

        <div className="relative z-10">
          <Logo size="lg" className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-amber-300/90" />
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Invest together.
            <span className="block text-teal-300">Grow with discipline.</span>
          </h1>
          <p className="text-base leading-7 text-slate-300">
            Independent Investment Club IV helps members track stock investments,
            share research, and manage club portfolios with clarity and trust.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: "Equities", value: "Stocks" },
              { label: "Members", value: "Club" },
              { label: "Focus", value: "Long-term" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-slate-500">
          Member access only. Unauthorized use is prohibited.
        </p>
      </div>

      <div className="flex w-full flex-1 flex-col justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

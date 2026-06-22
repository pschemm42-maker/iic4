import Link from "next/link";
import type { ReactNode } from "react";

type PageBannerProps = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function PageBanner({
  eyebrow,
  title,
  titleAccent,
  description,
  backHref,
  backLabel = "Back to dashboard",
  actions,
}: PageBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/10 bg-brand-navy text-white shadow-sm">
      <div className="brand-gradient-glow absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="text-xs font-medium text-brand-teal-light transition-colors hover:text-teal-200"
            >
              ← {backLabel}
            </Link>
          ) : null}
          <p
            className={`text-[10px] font-medium uppercase tracking-[0.2em] text-amber-300/90 ${backHref ? "mt-1.5" : ""}`}
          >
            {eyebrow}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
            {titleAccent ? (
              <span className="text-brand-teal-light"> {titleAccent}</span>
            ) : null}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-300">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}

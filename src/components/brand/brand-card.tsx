import type { ReactNode } from "react";

type BrandCardProps = {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  hover?: boolean;
};

export function BrandCard({
  children,
  className = "",
  accent = true,
  hover = false,
}: BrandCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${
        hover
          ? "transition-all hover:border-teal-300 hover:shadow-md hover:shadow-teal-500/5 dark:hover:border-teal-800"
          : ""
      } ${className}`}
    >
      {accent ? (
        <div className="brand-accent-bar absolute inset-x-0 top-0 h-0.5" aria-hidden="true" />
      ) : null}
      {children}
    </div>
  );
}

type BrandStatCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
  variant?: "light" | "navy";
};

export function BrandStatCard({
  label,
  value,
  valueClassName = "",
  variant = "light",
}: BrandStatCardProps) {
  if (variant === "navy") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p
          className={`mt-1.5 text-lg font-semibold tabular-nums text-white ${valueClassName}`}
        >
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-teal-50/40 p-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-teal-950/20">
      <div className="brand-accent-bar absolute inset-x-0 top-0 h-0.5 opacity-60" aria-hidden="true" />
      <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700/80 dark:text-amber-400/90">
        {label}
      </p>
      <p
        className={`mt-1.5 text-lg font-semibold tabular-nums text-brand-navy dark:text-zinc-50 ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

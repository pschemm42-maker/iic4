"use client";

import { formatNumber } from "@/lib/portfolio/metrics";
import type { YahooInsights } from "@/lib/market/types";

function formatLargeUsd(value: number | null) {
  if (value === null) {
    return "—";
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `$${formatNumber(value / 1_000_000_000, 2)}B`;
  }
  if (abs >= 1_000_000) {
    return `$${formatNumber(value / 1_000_000, 2)}M`;
  }
  return `$${formatNumber(value, 0)}`;
}

function ratingLabel(key: string | null) {
  if (!key) return "—";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ratingTone(mean: number | null) {
  if (mean === null) return "text-zinc-700";
  if (mean <= 2) return "text-emerald-600";
  if (mean <= 3) return "text-amber-600";
  return "text-orange-600";
}

function formatNewsDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function YahooInsightsSection({
  insights,
}: {
  insights: YahooInsights | null;
}) {
  if (!insights || !insights.available) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-[11px] font-medium uppercase tracking-wider text-brand-teal">
          Yahoo Finance
        </p>
        <p className="mt-1 text-[12px] text-zinc-500">
          {insights?.note ?? "Recapture research to load Yahoo Finance data."}
        </p>
      </div>
    );
  }

  const { priceTarget: pt, trend, forwardEstimates, news } = insights;
  const nextYear =
    forwardEstimates.find((e) => e.label === "Next year") ??
    forwardEstimates[0] ??
    null;

  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-[11px] font-medium uppercase tracking-wider text-brand-teal">
        Yahoo Finance — targets, trend &amp; news
      </p>

      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Analyst rating
          </p>
          <p
            className={`text-base font-semibold ${ratingTone(pt?.recommendationMean ?? null)}`}
          >
            {ratingLabel(pt?.recommendationKey ?? null)}
          </p>
          <p className="text-[11px] text-zinc-500">
            {pt?.analystCount !== null && pt?.analystCount !== undefined
              ? `${pt.analystCount} analysts`
              : "—"}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Mean target
          </p>
          <p className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {pt?.mean !== null && pt?.mean !== undefined
              ? `$${formatNumber(pt.mean, 2)}`
              : "—"}
          </p>
          {pt?.upsidePct !== null && pt?.upsidePct !== undefined ? (
            <p
              className={`text-[11px] font-medium ${pt.upsidePct >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {pt.upsidePct >= 0 ? "+" : ""}
              {formatNumber(pt.upsidePct, 1)}% vs current
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500">
              {pt?.low !== null && pt?.high !== null && pt?.low !== undefined
                ? `$${formatNumber(pt.low, 0)}–$${formatNumber(pt.high, 0)}`
                : "—"}
            </p>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            52-wk range
          </p>
          <p className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {trend?.rangePositionPct !== null &&
            trend?.rangePositionPct !== undefined
              ? `${formatNumber(trend.rangePositionPct, 0)}%`
              : "—"}
          </p>
          <p className="text-[11px] text-zinc-500">
            {trend?.return6moPct !== null && trend?.return6moPct !== undefined
              ? `6mo ${trend.return6moPct >= 0 ? "+" : ""}${formatNumber(trend.return6moPct, 1)}%`
              : "—"}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            {nextYear ? `Est. ${nextYear.label.toLowerCase()}` : "Forward est."}
          </p>
          <p className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {nextYear?.epsAvg !== null && nextYear?.epsAvg !== undefined
              ? `$${formatNumber(nextYear.epsAvg, 2)} EPS`
              : "—"}
          </p>
          <p className="text-[11px] text-zinc-500">
            {nextYear?.revenueAvg !== null && nextYear?.revenueAvg !== undefined
              ? `Rev ${formatLargeUsd(nextYear.revenueAvg)}`
              : "—"}
            {nextYear?.growthPct !== null && nextYear?.growthPct !== undefined
              ? ` · ${nextYear.growthPct >= 0 ? "+" : ""}${formatNumber(nextYear.growthPct, 1)}%`
              : ""}
          </p>
        </div>
      </div>

      {news.length > 0 ? (
        <div className="mt-2 border-t border-zinc-200 pt-1.5 dark:border-zinc-700">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Recent news
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {news.slice(0, 3).map((item) => (
              <li
                key={item.link}
                className="flex items-baseline justify-between gap-2"
              >
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-[12px] text-zinc-700 hover:text-brand-teal dark:text-zinc-300"
                  title={item.title}
                >
                  {item.title}
                </a>
                <span className="shrink-0 text-[11px] text-zinc-500">
                  {item.publisher}
                  {item.publishedAt
                    ? ` · ${formatNewsDate(item.publishedAt)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

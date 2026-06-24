import { formatNumber } from "@/lib/portfolio/metrics";
import type { ScoreComponent } from "@/lib/equity-selection/scoring";
import {
  RESEARCH_SCORE_CATEGORIES,
  type StockSuggestionResearch,
} from "@/lib/types/equity-selection";

function scoreColor(score: number) {
  if (score >= 70) return "text-brand-teal";
  if (score >= 50) return "text-amber-600";
  if (score >= 35) return "text-orange-600";
  return "text-red-600";
}

function scoreBarColor(score: number) {
  if (score >= 70) return "bg-brand-teal";
  if (score >= 50) return "bg-amber-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
}

function formatComponentValue(component: ScoreComponent) {
  if (component.value === null) {
    return "n/a";
  }

  switch (component.unit) {
    case "percent":
      return `${formatNumber(component.value, 1)}%`;
    case "x":
      return `${formatNumber(component.value, 1)}x`;
    case "ratio":
      return formatNumber(component.value, 2);
    case "score":
      return formatNumber(component.value, 0);
    case "currency":
      return `$${formatNumber(component.value, 2)}`;
    case "currencyM": {
      const millions = component.value;
      if (millions >= 1_000_000) {
        return `$${formatNumber(millions / 1_000_000, 2)}T`;
      }
      if (millions >= 1_000) {
        return `$${formatNumber(millions / 1_000, 1)}B`;
      }
      return `$${formatNumber(millions, 0)}M`;
    }
    default:
      return formatNumber(component.value, 2);
  }
}

function ComponentRow({ component }: { component: ScoreComponent }) {
  const missing = component.score === null;

  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[10px]">
      <span
        className={
          missing
            ? "text-zinc-400 dark:text-zinc-600"
            : "text-zinc-600 dark:text-zinc-400"
        }
        title={component.note}
      >
        {component.label}
      </span>
      <span className="flex items-center gap-1.5 tabular-nums">
        <span className="text-zinc-500">{formatComponentValue(component)}</span>
        {missing ? (
          <span className="w-7 text-right text-zinc-400">—</span>
        ) : (
          <span
            className={`w-7 text-right font-medium ${scoreColor(component.score ?? 0)}`}
          >
            {formatNumber(component.score ?? 0, 0)}
          </span>
        )}
      </span>
    </div>
  );
}

function CompactCategoryCard({
  label,
  score,
  rationale,
}: {
  label: string;
  score: number;
  rationale: string | null;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex items-baseline justify-between gap-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <p className={`text-base font-semibold tabular-nums ${scoreColor(score)}`}>
          {formatNumber(score, 0)}
        </p>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${scoreBarColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {rationale ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
          {rationale}
        </p>
      ) : null}
    </div>
  );
}

export function ResearchScorecard({
  research,
  compact = false,
}: {
  research: StockSuggestionResearch;
  compact?: boolean;
}) {
  const detail = research.analysis_detail;
  const coveragePct =
    research.data_coverage !== null
      ? Math.round(research.data_coverage * 100)
      : null;

  if (compact) {
    return (
      <section className="grid grid-cols-3 gap-2">
        {RESEARCH_SCORE_CATEGORIES.map((category) => {
          const score = research[category.key];
          const categoryDetail = detail?.categories.find(
            (c) => c.key === category.key,
          );

          return (
            <CompactCategoryCard
              key={category.key}
              label={category.label}
              score={score}
              rationale={categoryDetail?.rationale ?? null}
            />
          );
        })}
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Category scores
        </h3>
        {coveragePct !== null ? (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {coveragePct}% data coverage
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Scores are computed statistically from financial metrics. Higher is
        always better — including Risk, where a higher score means lower risk.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {RESEARCH_SCORE_CATEGORIES.map((category) => {
          const score = research[category.key];
          const categoryDetail = detail?.categories.find(
            (c) => c.key === category.key,
          );

          return (
            <div
              key={category.key}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {category.label}
                </p>
                <p
                  className={`text-2xl font-semibold tabular-nums ${scoreColor(score)}`}
                >
                  {formatNumber(score, 1)}
                </p>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${scoreBarColor(score)}`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>

              {categoryDetail?.rationale ? (
                <p className="mt-2 text-xs leading-5 text-zinc-700 dark:text-zinc-300">
                  {categoryDetail.rationale}
                </p>
              ) : null}

              <p className="mt-1 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">
                {category.description}
              </p>

              {categoryDetail && categoryDetail.components.length > 0 ? (
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-[11px] font-medium text-brand-teal hover:text-teal-600">
                    Metric breakdown
                  </summary>
                  <div className="mt-1 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
                    {categoryDetail.components.map((component, index) => (
                      <ComponentRow
                        key={`${component.key}-${index}`}
                        component={component}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

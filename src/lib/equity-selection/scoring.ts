import type { FinancialMetrics } from "@/lib/market/types";

/**
 * Statistical equity scorecard engine.
 *
 * Every category is scored 0-100 where HIGHER IS ALWAYS BETTER for a long-term
 * club investor. This keeps directionality consistent across categories and
 * companies. Scores are derived from real Finnhub financial metrics via fixed,
 * documented piecewise-linear scoring functions — no model "guessing".
 *
 * Thresholds below are deliberately sector-agnostic and subjective, but they are
 * fixed, transparent, and applied identically to every company, so results are
 * comparable and defensible.
 */

export type ScoreDirection = "higher-better" | "lower-better" | "band";

export type ScoreComponent = {
  key: string;
  label: string;
  /** Raw metric value (percent, ratio, etc.) or null when unavailable. */
  value: number | null;
  unit: "percent" | "ratio" | "x" | "currency" | "currencyM" | "score";
  /** 0-100 sub-score, or null when the underlying metric is missing. */
  score: number | null;
  direction: ScoreDirection;
  note: string;
};

export type CategoryKey =
  | "score_value"
  | "score_revenue"
  | "score_growth"
  | "score_profitability"
  | "score_balance_sheet"
  | "score_risk";

export type CategoryResult = {
  key: CategoryKey;
  label: string;
  score: number;
  /** Share of components that had data (0-1). */
  coverage: number;
  /** Company-specific explanation grounded in this company's metric values. */
  rationale: string;
  components: ScoreComponent[];
};

export type AnalysisDetail = {
  categories: CategoryResult[];
  /** Overall share of all components with data (0-1). */
  coverage: number;
  weights: Record<CategoryKey, number>;
  generatedAt: string;
};

export type Scorecard = {
  score_value: number;
  score_revenue: number;
  score_growth: number;
  score_profitability: number;
  score_balance_sheet: number;
  score_risk: number;
  composite_score: number;
  detail: AnalysisDetail;
};

const NEUTRAL_SCORE = 50;

/** Equal weighting keeps the composite simple and defensible. */
export const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  score_value: 1 / 6,
  score_revenue: 1 / 6,
  score_growth: 1 / 6,
  score_profitability: 1 / 6,
  score_balance_sheet: 1 / 6,
  score_risk: 1 / 6,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** Linear map: value <= worst -> 0, value >= best -> 100. */
function scoreHigherBetter(value: number, worst: number, best: number) {
  if (best === worst) {
    return NEUTRAL_SCORE;
  }
  return clamp(((value - worst) / (best - worst)) * 100);
}

/** Linear map: value <= best -> 100, value >= worst -> 0. */
function scoreLowerBetter(value: number, best: number, worst: number) {
  if (best === worst) {
    return NEUTRAL_SCORE;
  }
  return clamp(((worst - value) / (worst - best)) * 100);
}

/**
 * Band scorer for metrics with an ideal range (e.g. beta near/below 1).
 * Full score at or below `idealMax`; decays linearly to 0 at `worst`.
 */
function scoreBandLowSide(value: number, idealMax: number, worst: number) {
  if (value <= idealMax) {
    return 100;
  }
  if (value >= worst) {
    return 0;
  }
  return clamp(((worst - value) / (worst - idealMax)) * 100);
}

function buildComponent(
  key: string,
  label: string,
  value: number | null,
  unit: ScoreComponent["unit"],
  direction: ScoreDirection,
  note: string,
  scorer: (value: number) => number,
): ScoreComponent {
  return {
    key,
    label,
    value,
    unit,
    direction,
    note,
    score: value === null ? null : round1(scorer(value)),
  };
}

function formatValueText(component: ScoreComponent): string {
  if (component.value === null) {
    return "n/a";
  }

  const v = component.value;
  switch (component.unit) {
    case "percent":
      return `${round1(v)}%`;
    case "x":
      return `${round1(v)}x`;
    case "ratio":
      return `${Math.round(v * 100) / 100}`;
    case "score":
      return `${Math.round(v)}`;
    case "currency":
      return `$${round1(v)}`;
    case "currencyM":
      if (v >= 1_000_000) return `$${Math.round((v / 1_000_000) * 100) / 100}T`;
      if (v >= 1_000) return `$${Math.round((v / 1_000) * 10) / 10}B`;
      return `$${Math.round(v)}M`;
    default:
      return `${v}`;
  }
}

/**
 * Build a company-specific explanation from the actual scored components:
 * which metrics lifted the score and which dragged it down, with real values.
 */
function buildCategoryRationale(
  label: string,
  score: number,
  scored: ScoreComponent[],
): string {
  if (scored.length === 0) {
    return `${label} could not be scored — no underlying metrics were available, so a neutral ${NEUTRAL_SCORE} is used.`;
  }

  const sorted = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strengths = sorted.filter((c) => (c.score ?? 0) >= 60);
  const weaknesses = sorted.filter((c) => (c.score ?? 0) < 40);

  const describe = (c: ScoreComponent) =>
    `${c.label.toLowerCase()} ${formatValueText(c)} (${Math.round(c.score ?? 0)}/100)`;

  const band =
    score >= 70
      ? "strong"
      : score >= 50
        ? "moderate"
        : score >= 35
          ? "soft"
          : "weak";

  const parts: string[] = [
    `${label} is ${band} at ${score.toFixed(1)}.`,
  ];

  if (strengths.length > 0) {
    parts.push(
      `Lifted by ${strengths.slice(0, 2).map(describe).join(" and ")}.`,
    );
  }

  if (weaknesses.length > 0) {
    parts.push(
      `Held back by ${weaknesses.slice(0, 2).map(describe).join(" and ")}.`,
    );
  }

  if (strengths.length === 0 && weaknesses.length === 0) {
    parts.push(
      `Driven by middling readings such as ${sorted.slice(0, 2).map(describe).join(" and ")}.`,
    );
  }

  return parts.join(" ");
}

function summarizeCategory(
  key: CategoryKey,
  label: string,
  components: ScoreComponent[],
): CategoryResult {
  const scored = components.filter((c) => c.score !== null);
  const coverage = components.length === 0 ? 0 : scored.length / components.length;
  const score =
    scored.length === 0
      ? NEUTRAL_SCORE
      : round1(
          scored.reduce((sum, c) => sum + (c.score ?? 0), 0) / scored.length,
        );

  return {
    key,
    label,
    score,
    coverage,
    rationale: buildCategoryRationale(label, score, scored),
    components,
  };
}

function scoreValueCategory(m: FinancialMetrics): CategoryResult {
  const components: ScoreComponent[] = [
    buildComponent(
      "peTTM",
      "P/E (TTM)",
      // Negative P/E means no earnings — not a valuation signal; exclude it.
      m.peTTM !== null && m.peTTM > 0 ? m.peTTM : null,
      "x",
      "lower-better",
      "Cheaper earnings multiple scores higher. Excluded when unprofitable.",
      (v) => scoreLowerBetter(v, 12, 45),
    ),
    buildComponent(
      "psTTM",
      "P/S (TTM)",
      m.psTTM,
      "x",
      "lower-better",
      "Lower price-to-sales is cheaper relative to revenue.",
      (v) => scoreLowerBetter(v, 1, 12),
    ),
    buildComponent(
      "pbRatio",
      "P/B",
      m.pbRatio,
      "x",
      "lower-better",
      "Lower price-to-book is cheaper relative to net assets.",
      (v) => scoreLowerBetter(v, 1.5, 10),
    ),
    buildComponent(
      "pfcfShareTTM",
      "P/FCF (TTM)",
      m.pfcfShareTTM !== null && m.pfcfShareTTM > 0 ? m.pfcfShareTTM : null,
      "x",
      "lower-better",
      "Lower price-to-free-cash-flow is cheaper. Excluded when negative.",
      (v) => scoreLowerBetter(v, 15, 50),
    ),
  ];

  return summarizeCategory("score_value", "Value", components);
}

function scoreRevenueCategory(m: FinancialMetrics): CategoryResult {
  // Revenue measures top-line MAGNITUDE (scale), not margin quality — those
  // belong in Profitability. A high-revenue, low-margin company (e.g. an
  // automaker) should score high here and low on Profitability.
  const components: ScoreComponent[] = [
    buildComponent(
      "revenueTTM",
      "Annual revenue",
      m.revenueTTM,
      "currencyM",
      "higher-better",
      "Absolute trailing-twelve-month revenue. Bigger top line scores higher.",
      (v) => {
        if (v < 500) return 25;
        if (v < 2000) return 45;
        if (v < 10000) return 60;
        if (v < 30000) return 72;
        if (v < 75000) return 82;
        if (v < 150000) return 90;
        return 96;
      },
    ),
    buildComponent(
      "revenuePerShareTTM",
      "Revenue per share",
      m.revenuePerShareTTM,
      "currency",
      "higher-better",
      "Sales generated per share, a size signal independent of share count.",
      (v) => {
        if (v < 3) return 30;
        if (v < 10) return 48;
        if (v < 25) return 62;
        if (v < 60) return 76;
        if (v < 120) return 86;
        return 93;
      },
    ),
    buildComponent(
      "marketCapitalization",
      "Company scale (market cap)",
      m.marketCapitalization,
      "currencyM",
      "higher-better",
      "Overall company size as a secondary scale signal.",
      (v) => {
        if (v < 300) return 25;
        if (v < 2000) return 45;
        if (v < 10000) return 65;
        if (v < 50000) return 78;
        if (v < 200000) return 88;
        return 95;
      },
    ),
  ];

  return summarizeCategory("score_revenue", "Revenue", components);
}

function scoreGrowthCategory(m: FinancialMetrics): CategoryResult {
  const components: ScoreComponent[] = [
    buildComponent(
      "revenueGrowthTTMYoy",
      "Revenue growth (TTM YoY)",
      m.revenueGrowthTTMYoy,
      "percent",
      "higher-better",
      "Recent top-line growth. Declines score low.",
      (v) => scoreHigherBetter(v, -10, 25),
    ),
    buildComponent(
      "revenueGrowth5Y",
      "Revenue growth (5Y)",
      m.revenueGrowth5Y,
      "percent",
      "higher-better",
      "Sustained multi-year revenue growth.",
      (v) => scoreHigherBetter(v, -5, 20),
    ),
    buildComponent(
      "epsGrowthTTMYoy",
      "EPS growth (TTM YoY)",
      m.epsGrowthTTMYoy,
      "percent",
      "higher-better",
      "Recent earnings-per-share growth.",
      (v) => scoreHigherBetter(v, -20, 25),
    ),
    buildComponent(
      "epsGrowth5Y",
      "EPS growth (5Y)",
      m.epsGrowth5Y,
      "percent",
      "higher-better",
      "Sustained multi-year earnings growth.",
      (v) => scoreHigherBetter(v, -10, 20),
    ),
  ];

  return summarizeCategory("score_growth", "Growth", components);
}

function scoreProfitabilityCategory(m: FinancialMetrics): CategoryResult {
  const components: ScoreComponent[] = [
    buildComponent(
      "netProfitMarginTTM",
      "Net profit margin",
      m.netProfitMarginTTM,
      "percent",
      "higher-better",
      "Bottom-line profitability. Negative margins score near zero.",
      (v) => scoreHigherBetter(v, -10, 25),
    ),
    buildComponent(
      "operatingMarginTTM",
      "Operating margin",
      m.operatingMarginTTM,
      "percent",
      "higher-better",
      "Core operating profitability.",
      (v) => scoreHigherBetter(v, -10, 30),
    ),
    buildComponent(
      "roeTTM",
      "Return on equity",
      m.roeTTM,
      "percent",
      "higher-better",
      "Profit generated on shareholder equity. Negative ROE scores low.",
      (v) => scoreHigherBetter(v, -10, 25),
    ),
    buildComponent(
      "roaTTM",
      "Return on assets",
      m.roaTTM,
      "percent",
      "higher-better",
      "Profit generated on total assets.",
      (v) => scoreHigherBetter(v, -5, 12),
    ),
  ];

  return summarizeCategory("score_profitability", "Profitability", components);
}

function scoreBalanceSheetCategory(m: FinancialMetrics): CategoryResult {
  const components: ScoreComponent[] = [
    buildComponent(
      "currentRatio",
      "Current ratio",
      m.currentRatio,
      "ratio",
      "higher-better",
      "Short-term liquidity. Below ~1 signals strain.",
      (v) => scoreHigherBetter(v, 0.8, 2.5),
    ),
    buildComponent(
      "debtToEquity",
      "Debt / equity",
      m.debtToEquity,
      "ratio",
      "lower-better",
      "Leverage. Lower is safer; negative equity is penalized.",
      (v) => (v < 0 ? 5 : scoreLowerBetter(v, 0.3, 2.5)),
    ),
    buildComponent(
      "netInterestCoverageTTM",
      "Interest coverage",
      m.netInterestCoverageTTM,
      "x",
      "higher-better",
      "How easily operating profit covers interest. Higher is safer.",
      (v) => scoreHigherBetter(v, 1, 10),
    ),
  ];

  return summarizeCategory("score_balance_sheet", "Balance Sheet", components);
}

function scoreRiskCategory(m: FinancialMetrics): CategoryResult {
  const profitabilityStability =
    m.netProfitMarginTTM === null
      ? null
      : // Profitable, durable earnings reduce risk; losses raise it.
        scoreHigherBetter(m.netProfitMarginTTM, -15, 15);

  const components: ScoreComponent[] = [
    buildComponent(
      "beta",
      "Beta vs market",
      m.beta,
      "ratio",
      "band",
      "Volatility relative to the market. Near or below 1.0 is more stable.",
      (v) => scoreBandLowSide(Math.abs(v), 0.8, 2.0),
    ),
    buildComponent(
      "debtToEquity",
      "Leverage (debt / equity)",
      m.debtToEquity,
      "ratio",
      "lower-better",
      "High leverage increases downside risk.",
      (v) => (v < 0 ? 5 : scoreLowerBetter(v, 0.3, 2.5)),
    ),
    buildComponent(
      "netProfitMarginTTM",
      "Earnings stability",
      profitabilityStability === null ? null : m.netProfitMarginTTM,
      "percent",
      "higher-better",
      "Consistent profits make a stock less risky; losses make it riskier.",
      () => profitabilityStability ?? NEUTRAL_SCORE,
    ),
    buildComponent(
      "dividendYieldIndicatedAnnual",
      "Dividend support",
      m.dividendYieldIndicatedAnnual,
      "percent",
      "higher-better",
      "A sustainable dividend is a modest stability signal.",
      (v) => (v > 0 ? clamp(60 + v * 5) : 45),
    ),
  ];

  return summarizeCategory("score_risk", "Risk", components);
}

export function buildScorecard(metrics: FinancialMetrics): Scorecard {
  const categories: CategoryResult[] = [
    scoreValueCategory(metrics),
    scoreRevenueCategory(metrics),
    scoreGrowthCategory(metrics),
    scoreProfitabilityCategory(metrics),
    scoreBalanceSheetCategory(metrics),
    scoreRiskCategory(metrics),
  ];

  const byKey = (key: CategoryKey) =>
    categories.find((c) => c.key === key)?.score ?? NEUTRAL_SCORE;

  const composite = round1(
    categories.reduce(
      (sum, c) => sum + c.score * CATEGORY_WEIGHTS[c.key],
      0,
    ),
  );

  const totalComponents = categories.reduce(
    (sum, c) => sum + c.components.length,
    0,
  );
  const coveredComponents = categories.reduce(
    (sum, c) => sum + c.components.filter((comp) => comp.score !== null).length,
    0,
  );

  return {
    score_value: byKey("score_value"),
    score_revenue: byKey("score_revenue"),
    score_growth: byKey("score_growth"),
    score_profitability: byKey("score_profitability"),
    score_balance_sheet: byKey("score_balance_sheet"),
    score_risk: byKey("score_risk"),
    composite_score: composite,
    detail: {
      categories,
      coverage:
        totalComponents === 0 ? 0 : coveredComponents / totalComponents,
      weights: CATEGORY_WEIGHTS,
      generatedAt: new Date().toISOString(),
    },
  };
}

function describeScore(score: number) {
  if (score >= 75) return "strong";
  if (score >= 60) return "solid";
  if (score >= 45) return "mixed";
  if (score >= 30) return "weak";
  return "poor";
}

/**
 * Deterministic narrative built purely from the computed scorecard, used when
 * Gemini is unavailable so analysis still works offline/free.
 */
export function buildTemplateConclusion(
  ticker: string,
  companyName: string,
  scorecard: Scorecard,
): string {
  const name = companyName || ticker;
  const ranked = [...scorecard.detail.categories].sort(
    (a, b) => b.score - a.score,
  );
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const coveragePct = Math.round(scorecard.detail.coverage * 100);

  return [
    `${name} earns a composite score of ${scorecard.composite_score.toFixed(1)}/100,`,
    `a ${describeScore(scorecard.composite_score)} overall profile.`,
    `Its strongest area is ${best.label} (${best.score.toFixed(0)}) and its weakest is ${worst.label} (${worst.score.toFixed(0)}).`,
    `Scores are computed statistically from ${coveragePct}% available financial metrics; lower coverage means more uncertainty.`,
  ].join(" ");
}

import { generateGeminiContent } from "@/lib/gemini/client";
import {
  parseBrokerRecommendation,
  serializeBrokerRating,
  type BrokerResearchRating,
} from "@/lib/equity-selection/broker-ratings";
import {
  buildScorecard,
  buildTemplateConclusion,
  type AnalysisDetail,
} from "@/lib/equity-selection/scoring";
import {
  fetchFinancialMetrics,
  fetchRecommendationTrends,
} from "@/lib/market/finnhub";
import { fetchYahooInsights } from "@/lib/market/yahoo";
import type {
  FinancialMetrics,
  RecommendationTrendPeriod,
  YahooInsights,
} from "@/lib/market/types";
import type { StockSuggestion } from "@/lib/types/equity-selection";

export type CapturedStockResearch = {
  score_value: number;
  score_revenue: number;
  score_growth: number;
  score_profitability: number;
  score_balance_sheet: number;
  score_risk: number;
  composite_score: number;
  data_coverage: number;
  analysis_detail: AnalysisDetail;
  robinhood_recommendation: string;
  schwab_recommendation: string;
  fidelity_recommendation: string;
  conclusion: string;
  analyst_trends: RecommendationTrendPeriod[] | null;
  yahoo_insights: YahooInsights | null;
};

function buildRobinhoodGradeFromFinnhub(
  trends: RecommendationTrendPeriod[],
): BrokerResearchRating | null {
  const latest = trends[0];
  if (!latest) {
    return null;
  }

  const buyCount = latest.strongBuy + latest.buy;
  const holdCount = latest.hold;
  const sellCount = latest.sell + latest.strongSell;
  const total = buyCount + holdCount + sellCount;

  if (total === 0) {
    return null;
  }

  const buyPercent = Math.round((buyCount / total) * 1000) / 10;

  return {
    grade: `${buyPercent}% Buy`,
    takeaway: `Finnhub sell-side consensus for ${latest.period}: ${buyCount} buy, ${holdCount} hold, ${sellCount} sell across ${total} analysts.`,
  };
}

function buildUnavailableBrokerRating(
  platform: "Schwab" | "Fidelity",
  metric: string,
): BrokerResearchRating {
  return {
    grade: "Unavailable",
    takeaway: `${platform} ${metric} is shown inside a ${platform} client login and is not published on the open web per ticker. Gemini web search cannot retrieve it reliably.`,
  };
}

async function resolveBrokerRecommendations(
  suggestion: StockSuggestion,
): Promise<{
  robinhood: BrokerResearchRating;
  schwab: BrokerResearchRating;
  fidelity: BrokerResearchRating;
  analystTrends: RecommendationTrendPeriod[] | null;
}> {
  const finnhubTrends = await fetchRecommendationTrends(suggestion.ticker);

  const analystTrends =
    finnhubTrends.success && finnhubTrends.data.length > 0
      ? finnhubTrends.data
      : null;

  const robinhoodFromFinnhub = analystTrends
    ? buildRobinhoodGradeFromFinnhub(analystTrends)
    : null;

  const robinhood =
    robinhoodFromFinnhub ??
    ({
      grade: "Unavailable",
      takeaway:
        "Finnhub analyst recommendation data was not available for this ticker.",
    } satisfies BrokerResearchRating);

  return {
    robinhood,
    schwab: buildUnavailableBrokerRating("Schwab", "Schwab Equity Rating"),
    fidelity: buildUnavailableBrokerRating("Fidelity", "Equity Summary Score"),
    analystTrends,
  };
}

function formatMetricForPrompt(
  label: string,
  value: number | null,
  suffix = "",
) {
  return `- ${label}: ${value === null ? "n/a" : `${value}${suffix}`}`;
}

function formatLargeUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return `$${value.toFixed(2)}`;
}

function buildYahooContext(yahoo: YahooInsights | null): string {
  if (!yahoo || !yahoo.available) {
    return "Yahoo Finance market context: not available for this ticker.";
  }

  const lines: string[] = ["Yahoo Finance market context:"];

  const pt = yahoo.priceTarget;
  if (pt) {
    const parts: string[] = [];
    if (pt.recommendationKey) {
      parts.push(`analyst rating ${pt.recommendationKey.replace(/_/g, " ")}`);
    }
    if (pt.analystCount !== null) {
      parts.push(`${pt.analystCount} analysts`);
    }
    if (pt.mean !== null) {
      parts.push(`mean target $${pt.mean.toFixed(2)}`);
    }
    if (pt.upsidePct !== null) {
      parts.push(`${pt.upsidePct >= 0 ? "+" : ""}${pt.upsidePct}% vs current`);
    }
    if (parts.length > 0) {
      lines.push(`- Price target: ${parts.join(", ")}.`);
    }
  }

  const trend = yahoo.trend;
  if (trend) {
    const parts: string[] = [];
    if (trend.rangePositionPct !== null) {
      parts.push(`${trend.rangePositionPct}% of 52-week range`);
    }
    if (trend.return1moPct !== null) {
      parts.push(`1mo ${trend.return1moPct >= 0 ? "+" : ""}${trend.return1moPct}%`);
    }
    if (trend.return6moPct !== null) {
      parts.push(`6mo ${trend.return6moPct >= 0 ? "+" : ""}${trend.return6moPct}%`);
    }
    if (parts.length > 0) {
      lines.push(`- Price trend: ${parts.join(", ")}.`);
    }
  }

  const nextYear = yahoo.forwardEstimates.find((e) => e.label === "Next year");
  const estimate = nextYear ?? yahoo.forwardEstimates[0];
  if (estimate) {
    lines.push(
      `- Forward estimate (${estimate.label}): EPS ${estimate.epsAvg !== null ? `$${estimate.epsAvg.toFixed(2)}` : "n/a"}, revenue ${formatLargeUsd(estimate.revenueAvg)}${estimate.growthPct !== null ? `, growth ${estimate.growthPct}%` : ""}.`,
    );
  }

  if (yahoo.news.length > 0) {
    lines.push("- Recent headlines:");
    for (const item of yahoo.news.slice(0, 3)) {
      lines.push(`  • ${item.title} (${item.publisher})`);
    }
  }

  return lines.join("\n");
}

function buildConclusionContext(
  suggestion: StockSuggestion,
  metrics: FinancialMetrics,
  detail: AnalysisDetail,
  composite: number,
  yahoo: YahooInsights | null,
) {
  const categoryLines = detail.categories.map(
    (c) =>
      `- ${c.label}: ${c.score.toFixed(1)} (data coverage ${Math.round(c.coverage * 100)}%)`,
  );

  return [
    `Ticker: ${suggestion.ticker}${suggestion.company_name ? ` (${suggestion.company_name})` : ""}`,
    `Sector: ${suggestion.sector || "unknown"}`,
    "",
    "Computed category scores (0-100, higher is better):",
    ...categoryLines,
    `- Composite: ${composite.toFixed(1)}`,
    "",
    "Key financial metrics:",
    formatMetricForPrompt("Net profit margin", metrics.netProfitMarginTTM, "%"),
    formatMetricForPrompt("Revenue growth (TTM YoY)", metrics.revenueGrowthTTMYoy, "%"),
    formatMetricForPrompt("Return on equity", metrics.roeTTM, "%"),
    formatMetricForPrompt("P/E (TTM)", metrics.peTTM),
    formatMetricForPrompt("Debt/equity", metrics.debtToEquity),
    formatMetricForPrompt("Beta", metrics.beta),
    "",
    buildYahooContext(yahoo),
  ].join("\n");
}

async function buildConclusion(
  suggestion: StockSuggestion,
  metrics: FinancialMetrics,
  detail: AnalysisDetail,
  composite: number,
  yahoo: YahooInsights | null,
  fallback: string,
): Promise<string> {
  const context = buildConclusionContext(
    suggestion,
    metrics,
    detail,
    composite,
    yahoo,
  );

  const result = await generateGeminiContent({
    model: "flash",
    systemInstruction: [
      "You are an equity research assistant for a private investment club.",
      "You are given statistically-computed category scores, key metrics, and Yahoo Finance market context (analyst targets, price trend, forward estimates, recent news).",
      "Do NOT invent or contradict the numbers. Summarize them faithfully.",
      "Respond with 3-4 plain-text sentences. No markdown, no headings.",
    ].join(" "),
    prompt: [
      "Write a short, defensible conclusion for club members that ties the scorecard to current market context.",
      "Cover: the overall takeaway and strongest/weakest categories; the analyst price target and rating; the recent price trend; and any notable theme from the headlines.",
      "If a piece of context is unavailable, simply omit it rather than mentioning its absence.",
      "",
      context,
    ].join("\n"),
  });

  if (!result.success) {
    return fallback;
  }

  const text = result.data.text.trim();
  return text.length > 0 ? text : fallback;
}

export async function captureStockResearchWithGemini(
  suggestion: StockSuggestion,
): Promise<
  | { success: true; data: CapturedStockResearch }
  | { success: false; error: string }
> {
  const [metricsResult, brokerRecommendations, yahooInsights] =
    await Promise.all([
      fetchFinancialMetrics(suggestion.ticker),
      resolveBrokerRecommendations(suggestion),
      fetchYahooInsights(suggestion.ticker),
    ]);

  if (!metricsResult.success) {
    return {
      success: false,
      error: `Could not load financial metrics for ${suggestion.ticker}: ${metricsResult.error}`,
    };
  }

  const metrics = metricsResult.data;
  const scorecard = buildScorecard(metrics);

  const fallbackConclusion = buildTemplateConclusion(
    suggestion.ticker,
    suggestion.company_name,
    scorecard,
  );

  const conclusion = await buildConclusion(
    suggestion,
    metrics,
    scorecard.detail,
    scorecard.composite_score,
    yahooInsights.available ? yahooInsights : null,
    fallbackConclusion,
  );

  return {
    success: true,
    data: {
      score_value: scorecard.score_value,
      score_revenue: scorecard.score_revenue,
      score_growth: scorecard.score_growth,
      score_profitability: scorecard.score_profitability,
      score_balance_sheet: scorecard.score_balance_sheet,
      score_risk: scorecard.score_risk,
      composite_score: scorecard.composite_score,
      data_coverage: scorecard.detail.coverage,
      analysis_detail: scorecard.detail,
      robinhood_recommendation: serializeBrokerRating(
        brokerRecommendations.robinhood,
      ),
      schwab_recommendation: serializeBrokerRating(brokerRecommendations.schwab),
      fidelity_recommendation: serializeBrokerRating(
        brokerRecommendations.fidelity,
      ),
      conclusion,
      analyst_trends: brokerRecommendations.analystTrends,
      yahoo_insights: yahooInsights.available ? yahooInsights : null,
    },
  };
}

export { parseBrokerRecommendation };

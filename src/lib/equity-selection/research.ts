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
import type {
  FinancialMetrics,
  RecommendationTrendPeriod,
} from "@/lib/market/types";
import type { StockSuggestion } from "@/lib/types/equity-selection";

type GeminiBrokerPayload = {
  grade: string;
  takeaway: string;
};

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
};

function parseText(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Missing ${label} from Gemini.`);
  }

  return text;
}

function parseBrokerPayload(
  value: unknown,
  platform: string,
): BrokerResearchRating {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing ${platform} broker rating from Gemini.`);
  }

  const payload = value as GeminiBrokerPayload;

  return {
    grade: parseText(payload.grade, `${platform} grade`),
    takeaway: parseText(payload.takeaway, `${platform} takeaway`),
  };
}

function extractJsonFromText(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("Gemini returned data in an invalid format.");
}

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

async function fetchBrokerGradeFromSearch(
  ticker: string,
  platform: "schwab" | "fidelity",
): Promise<BrokerResearchRating> {
  const config =
    platform === "schwab"
      ? {
          name: "Charles Schwab",
          metric: "Schwab Equity Rating (A-F)",
          fallback: buildUnavailableBrokerRating(
            "Schwab",
            "Schwab Equity Rating",
          ),
        }
      : {
          name: "Fidelity",
          metric: "Equity Summary Score",
          fallback: buildUnavailableBrokerRating(
            "Fidelity",
            "Equity Summary Score",
          ),
        };

  const result = await generateGeminiContent({
    model: "flash",
    useGoogleSearch: true,
    systemInstruction:
      "Use Google Search. Respond with valid JSON only. Do not guess proprietary broker grades.",
    prompt: [
      `Find the current ${config.metric} for ${ticker} on ${config.name}.`,
      "",
      "Important:",
      `- ${config.name} usually shows this rating only after client login.`,
      "- Only return a numeric or letter grade if you find a current public page that states it for this exact ticker.",
      '- If you cannot verify a current public grade, return grade "Unavailable".',
      "",
      'Return JSON only: {"grade":"...","takeaway":"..."}',
    ].join("\n"),
  });

  if (!result.success) {
    return config.fallback;
  }

  try {
    const parsed = parseGeminiPayloadBrokerOnly(result.data.text, config.name);
    if (parsed.grade.toLowerCase() === "unavailable") {
      return config.fallback;
    }

    return parsed;
  } catch {
    return config.fallback;
  }
}

function parseGeminiPayloadBrokerOnly(raw: string, platform: string) {
  const payload = JSON.parse(extractJsonFromText(raw)) as GeminiBrokerPayload;
  return parseBrokerPayload(payload, platform);
}

async function resolveBrokerRecommendations(
  suggestion: StockSuggestion,
): Promise<{
  robinhood: BrokerResearchRating;
  schwab: BrokerResearchRating;
  fidelity: BrokerResearchRating;
}> {
  const [finnhubTrends, schwab, fidelity] = await Promise.all([
    fetchRecommendationTrends(suggestion.ticker),
    fetchBrokerGradeFromSearch(suggestion.ticker, "schwab"),
    fetchBrokerGradeFromSearch(suggestion.ticker, "fidelity"),
  ]);

  const robinhoodFromFinnhub =
    finnhubTrends.success && finnhubTrends.data
      ? buildRobinhoodGradeFromFinnhub(finnhubTrends.data)
      : null;

  const robinhood =
    robinhoodFromFinnhub ??
    ({
      grade: "Unavailable",
      takeaway:
        "Finnhub analyst recommendation data was not available for this ticker.",
    } satisfies BrokerResearchRating);

  return { robinhood, schwab, fidelity };
}

function formatMetricForPrompt(
  label: string,
  value: number | null,
  suffix = "",
) {
  return `- ${label}: ${value === null ? "n/a" : `${value}${suffix}`}`;
}

function buildConclusionContext(
  suggestion: StockSuggestion,
  metrics: FinancialMetrics,
  detail: AnalysisDetail,
  composite: number,
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
  ].join("\n");
}

async function buildConclusion(
  suggestion: StockSuggestion,
  metrics: FinancialMetrics,
  detail: AnalysisDetail,
  composite: number,
  fallback: string,
): Promise<string> {
  const context = buildConclusionContext(suggestion, metrics, detail, composite);

  const result = await generateGeminiContent({
    model: "flash",
    systemInstruction: [
      "You are an equity research assistant for a private investment club.",
      "You are given category scores and metrics that were computed statistically.",
      "Do NOT invent or contradict the numbers. Summarize them faithfully.",
      "Respond with 2-3 plain-text sentences. No markdown, no headings.",
    ].join(" "),
    prompt: [
      "Write a short, defensible conclusion that summarizes this scorecard for club members.",
      "Explain the overall takeaway and call out the strongest and weakest categories.",
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
  const [metricsResult, brokerRecommendations] = await Promise.all([
    fetchFinancialMetrics(suggestion.ticker),
    resolveBrokerRecommendations(suggestion),
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
    },
  };
}

export { parseBrokerRecommendation };

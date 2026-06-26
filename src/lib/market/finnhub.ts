import { getFinnhubApiKey } from "@/lib/env";
import { acquireFinnhubSlot } from "@/lib/market/finnhub-rate-limiter";
import { fetchYahooDailyClose } from "@/lib/market/yahoo";
import type {
  BatchMetricsResult,
  BatchQuoteResult,
  FinancialMetrics,
  FinnhubResult,
  HoldingMarketData,
  MetricsResult,
  QuoteResult,
  RecommendationTrendPeriod,
} from "@/lib/market/types";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

const MISSING_API_KEY_ERROR =
  "Finnhub API key not configured. Add FINNHUB_API_KEY to .env.local.";

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function finnhubFetch(
  path: string,
  retryOn429 = true,
): Promise<FinnhubResult<Response>> {
  const token = getFinnhubApiKey();
  if (!token) {
    return { success: false, error: MISSING_API_KEY_ERROR };
  }

  const url = `${FINNHUB_BASE}${path}${path.includes("?") ? "&" : "?"}token=${token}`;

  try {
    await acquireFinnhubSlot();
    const response = await fetch(url, { cache: "no-store" });

    if (response.status === 429 && retryOn429) {
      await sleep(2000);
      return finnhubFetch(path, false);
    }

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: body || `Finnhub request failed (${response.status})`,
      };
    }

    return { success: true, data: response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Finnhub request failed",
    };
  }
}

export async function fetchQuote(
  ticker: string,
): Promise<FinnhubResult<number>> {
  const symbol = normalizeTicker(ticker);
  const response = await finnhubFetch(`/quote?symbol=${encodeURIComponent(symbol)}`);

  if (!response.success) {
    return response;
  }

  const data = (await response.data.json()) as { c?: number };
  const currentPrice = data.c;

  if (typeof currentPrice !== "number" || currentPrice <= 0) {
    return {
      success: false,
      error: `No quote data found for ${symbol}.`,
    };
  }

  return { success: true, data: currentPrice };
}

export async function fetchProfile(
  ticker: string,
): Promise<FinnhubResult<{ companyName: string; sector: string }>> {
  const symbol = normalizeTicker(ticker);
  const response = await finnhubFetch(
    `/stock/profile2?symbol=${encodeURIComponent(symbol)}`,
  );

  if (!response.success) {
    return response;
  }

  const data = (await response.data.json()) as {
    name?: string;
    finnhubIndustry?: string;
  };

  const companyName = data.name?.trim() || "";
  const sector = data.finnhubIndustry?.trim() || "";

  if (!companyName) {
    return {
      success: false,
      error: `No profile data found for ${symbol}.`,
    };
  }

  return { success: true, data: { companyName, sector } };
}

export async function fetchMetrics(
  ticker: string,
): Promise<
  FinnhubResult<{ peRatio: number | null; dividendYield: number | null }>
> {
  const symbol = normalizeTicker(ticker);
  const response = await finnhubFetch(
    `/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`,
  );

  if (!response.success) {
    return response;
  }

  const data = (await response.data.json()) as {
    metric?: {
      peBasicExclExtraTTM?: number;
      dividendYieldIndicatedAnnual?: number;
    };
  };

  const peRatio =
    typeof data.metric?.peBasicExclExtraTTM === "number" &&
    Number.isFinite(data.metric.peBasicExclExtraTTM) &&
    data.metric.peBasicExclExtraTTM >= 0
      ? data.metric.peBasicExclExtraTTM
      : null;

  const dividendYield =
    typeof data.metric?.dividendYieldIndicatedAnnual === "number" &&
    Number.isFinite(data.metric.dividendYieldIndicatedAnnual) &&
    data.metric.dividendYieldIndicatedAnnual >= 0
      ? data.metric.dividendYieldIndicatedAnnual
      : null;

  return { success: true, data: { peRatio, dividendYield } };
}

type FinnhubMetricRecord = Record<string, number | string | null | undefined>;

function readMetric(
  metric: FinnhubMetricRecord,
  keys: string[],
  options: { min?: number; max?: number } = {},
): number | null {
  for (const key of keys) {
    const raw = metric[key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      continue;
    }

    if (options.min !== undefined && raw < options.min) {
      continue;
    }

    if (options.max !== undefined && raw > options.max) {
      continue;
    }

    return raw;
  }

  return null;
}

async function fetchSharesOutstanding(symbol: string): Promise<number | null> {
  const response = await finnhubFetch(
    `/stock/profile2?symbol=${encodeURIComponent(symbol)}`,
  );

  if (!response.success) {
    return null;
  }

  const data = (await response.data.json()) as { shareOutstanding?: number };
  return typeof data.shareOutstanding === "number" &&
    Number.isFinite(data.shareOutstanding) &&
    data.shareOutstanding > 0
    ? data.shareOutstanding
    : null;
}

export async function fetchFinancialMetrics(
  ticker: string,
): Promise<FinnhubResult<FinancialMetrics>> {
  const symbol = normalizeTicker(ticker);
  const [response, sharesOutstanding] = await Promise.all([
    finnhubFetch(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`),
    fetchSharesOutstanding(symbol),
  ]);

  if (!response.success) {
    return response;
  }

  const data = (await response.data.json()) as { metric?: FinnhubMetricRecord };
  const metric = data.metric ?? {};

  const revenuePerShareTTM = readMetric(metric, [
    "revenuePerShareTTM",
    "revenuePerShareAnnual",
  ]);

  // Absolute revenue (millions USD): rev/share ($) x shares (millions).
  const revenueTTM =
    revenuePerShareTTM !== null && sharesOutstanding !== null
      ? revenuePerShareTTM * sharesOutstanding
      : null;

  const metrics: FinancialMetrics = {
    marketCapitalization: readMetric(metric, ["marketCapitalization"], {
      min: 0,
    }),
    revenueTTM,
    revenuePerShareTTM,
    peTTM: readMetric(metric, ["peTTM", "peBasicExclExtraTTM", "peAnnual"]),
    psTTM: readMetric(metric, ["psTTM", "psAnnual"], { min: 0 }),
    pbRatio: readMetric(metric, ["pbQuarterly", "pbAnnual", "pb"], { min: 0 }),
    pfcfShareTTM: readMetric(metric, ["pfcfShareTTM", "pfcfShareAnnual"]),
    grossMarginTTM: readMetric(metric, ["grossMarginTTM", "grossMarginAnnual"]),
    operatingMarginTTM: readMetric(metric, [
      "operatingMarginTTM",
      "operatingMarginAnnual",
    ]),
    netProfitMarginTTM: readMetric(metric, [
      "netProfitMarginTTM",
      "netProfitMarginAnnual",
    ]),
    roeTTM: readMetric(metric, ["roeTTM", "roeRfy", "roeAnnual"]),
    roaTTM: readMetric(metric, ["roaTTM", "roaRfy", "roaAnnual"]),
    revenueGrowthTTMYoy: readMetric(metric, [
      "revenueGrowthTTMYoy",
      "revenueGrowthQuarterlyYoy",
    ]),
    revenueGrowth5Y: readMetric(metric, ["revenueGrowth5Y", "revenueGrowth3Y"]),
    epsGrowthTTMYoy: readMetric(metric, [
      "epsGrowthTTMYoy",
      "epsGrowthQuarterlyYoy",
    ]),
    epsGrowth5Y: readMetric(metric, ["epsGrowth5Y", "epsGrowth3Y"]),
    currentRatio: readMetric(metric, [
      "currentRatioQuarterly",
      "currentRatioAnnual",
    ], { min: 0 }),
    debtToEquity: readMetric(metric, [
      "totalDebt/totalEquityQuarterly",
      "totalDebt/totalEquityAnnual",
      "longTermDebt/equityQuarterly",
      "longTermDebt/equityAnnual",
    ]),
    netInterestCoverageTTM: readMetric(metric, [
      "netInterestCoverageTTM",
      "netInterestCoverageAnnual",
    ]),
    beta: readMetric(metric, ["beta"]),
    priceReturn52Week: readMetric(metric, [
      "52WeekPriceReturnDaily",
      "yearToDatePriceReturnDaily",
    ]),
    dividendYieldIndicatedAnnual: readMetric(
      metric,
      ["dividendYieldIndicatedAnnual", "currentDividendYieldTTM"],
      { min: 0 },
    ),
    payoutRatioTTM: readMetric(metric, ["payoutRatioTTM", "payoutRatioAnnual"], {
      min: 0,
    }),
  };

  return { success: true, data: metrics };
}

export async function fetchHoldingStats(
  ticker: string,
): Promise<FinnhubResult<HoldingMarketData>> {
  const symbol = normalizeTicker(ticker);
  const [quoteResult, profileResult, metricsResult] = await Promise.all([
    fetchQuote(symbol),
    fetchProfile(symbol),
    fetchMetrics(symbol),
  ]);

  if (!quoteResult.success && !profileResult.success && !metricsResult.success) {
    return {
      success: false,
      error: quoteResult.error,
    };
  }

  return {
    success: true,
    data: {
      currentPrice: quoteResult.success ? quoteResult.data : null,
      companyName: profileResult.success ? profileResult.data.companyName : null,
      sector: profileResult.success ? profileResult.data.sector : null,
      peRatio: metricsResult.success ? metricsResult.data.peRatio : null,
      dividendYield: metricsResult.success
        ? metricsResult.data.dividendYield
        : null,
    },
  };
}

export async function fetchQuotesBatched(
  tickers: string[],
  batchSize = 10,
): Promise<FinnhubResult<BatchQuoteResult>> {
  if (!getFinnhubApiKey()) {
    return { success: false, error: MISSING_API_KEY_ERROR };
  }

  const uniqueTickers = [...new Set(tickers.map(normalizeTicker))];
  const succeeded: BatchQuoteResult["succeeded"] = [];
  const failed: BatchQuoteResult["failed"] = [];

  for (let index = 0; index < uniqueTickers.length; index += batchSize) {
    const batch = uniqueTickers.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (symbol): Promise<QuoteResult> => {
        const result = await fetchQuote(symbol);
        if (!result.success) {
          return { success: false, ticker: symbol, error: result.error };
        }

        return {
          success: true,
          ticker: symbol,
          currentPrice: result.data,
        };
      }),
    );

    for (const result of results) {
      if (result.success) {
        succeeded.push({
          ticker: result.ticker,
          currentPrice: result.currentPrice,
        });
      } else {
        failed.push({ ticker: result.ticker, error: result.error });
      }
    }
  }

  return { success: true, data: { succeeded, failed } };
}

export async function fetchMetricsBatched(
  tickers: string[],
  batchSize = 10,
): Promise<FinnhubResult<BatchMetricsResult>> {
  if (!getFinnhubApiKey()) {
    return { success: false, error: MISSING_API_KEY_ERROR };
  }

  const uniqueTickers = [...new Set(tickers.map(normalizeTicker))];
  const succeeded: BatchMetricsResult["succeeded"] = [];
  const failed: BatchMetricsResult["failed"] = [];

  for (let index = 0; index < uniqueTickers.length; index += batchSize) {
    const batch = uniqueTickers.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (symbol): Promise<MetricsResult> => {
        const result = await fetchMetrics(symbol);
        if (!result.success) {
          return { success: false, ticker: symbol, error: result.error };
        }

        return {
          success: true,
          ticker: symbol,
          peRatio: result.data.peRatio,
          dividendYield: result.data.dividendYield,
        };
      }),
    );

    for (const result of results) {
      if (result.success) {
        succeeded.push({
          ticker: result.ticker,
          peRatio: result.peRatio,
          dividendYield: result.dividendYield,
        });
      } else {
        failed.push({ ticker: result.ticker, error: result.error });
      }
    }
  }

  return { success: true, data: { succeeded, failed } };
}


function toTradingDateString(unix: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unix * 1000));
}

function dateToUnixStart(date: string) {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

function pickCloseOnOrBefore(
  timestamps: number[],
  closes: number[],
  targetDate: string,
  toDateString: (unix: number) => string,
) {
  let bestClose: number | null = null;
  let bestDate = "";

  for (let index = 0; index < timestamps.length; index += 1) {
    const tradingDate = toDateString(timestamps[index]);
    const close = closes[index];

    if (
      tradingDate <= targetDate &&
      typeof close === "number" &&
      Number.isFinite(close) &&
      close > 0 &&
      tradingDate >= bestDate
    ) {
      bestDate = tradingDate;
      bestClose = close;
    }
  }

  return bestClose;
}

async function fetchFinnhubDailyClose(
  ticker: string,
  date: string,
): Promise<FinnhubResult<number>> {
  const symbol = normalizeTicker(ticker);
  const targetUnix = dateToUnixStart(date);
  const from = targetUnix - 14 * 86_400;
  const to = targetUnix + 5 * 86_400;

  const response = await finnhubFetch(
    `/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}`,
  );

  if (!response.success) {
    return response;
  }

  const data = (await response.data.json()) as {
    error?: string;
    s?: string;
    t?: number[];
    c?: number[];
  };

  if (data.error) {
    return { success: false, error: data.error };
  }

  if (data.s === "no_data" || !data.t?.length || !data.c?.length) {
    return {
      success: false,
      error: `No historical price found for ${symbol} on ${date}.`,
    };
  }

  const bestClose = pickCloseOnOrBefore(
    data.t,
    data.c,
    date,
    toTradingDateString,
  );

  if (bestClose === null) {
    return {
      success: false,
      error: `No historical price found for ${symbol} on or before ${date}.`,
    };
  }

  return { success: true, data: bestClose };
}

export async function fetchDailyClose(
  ticker: string,
  date: string,
): Promise<FinnhubResult<number>> {
  if (getFinnhubApiKey()) {
    const finnhubResult = await fetchFinnhubDailyClose(ticker, date);
    if (finnhubResult.success) {
      return finnhubResult;
    }

    const finnhubError = finnhubResult.error.toLowerCase();
    const shouldFallback =
      finnhubError.includes("don't have access") ||
      finnhubError.includes("no historical price");

    if (!shouldFallback) {
      return finnhubResult;
    }
  }

  return fetchYahooDailyClose(ticker, date);
}

export async function fetchDailyClosesBatched(
  requests: Array<{ ticker: string; date: string }>,
  batchSize = 3,
): Promise<
  FinnhubResult<{
    succeeded: Array<{ ticker: string; date: string; closePrice: number }>;
    failed: Array<{ ticker: string; date: string; error: string }>;
  }>
> {
  if (!getFinnhubApiKey()) {
    return { success: false, error: MISSING_API_KEY_ERROR };
  }

  const succeeded: Array<{
    ticker: string;
    date: string;
    closePrice: number;
  }> = [];
  const failed: Array<{ ticker: string; date: string; error: string }> = [];

  for (let index = 0; index < requests.length; index += batchSize) {
    const batch = requests.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (request) => {
        const result = await fetchDailyClose(request.ticker, request.date);
        if (!result.success) {
          return {
            success: false as const,
            ticker: normalizeTicker(request.ticker),
            date: request.date,
            error: result.error,
          };
        }

        return {
          success: true as const,
          ticker: normalizeTicker(request.ticker),
          date: request.date,
          closePrice: result.data,
        };
      }),
    );

    for (const result of results) {
      if (result.success) {
        succeeded.push({
          ticker: result.ticker,
          date: result.date,
          closePrice: result.closePrice,
        });
      } else {
        failed.push({
          ticker: result.ticker,
          date: result.date,
          error: result.error,
        });
      }
    }

    if (index + batchSize < requests.length) {
      await sleep(500);
    }
  }

  return { success: true, data: { succeeded, failed } };
}

export async function fetchRecommendationTrends(
  ticker: string,
): Promise<FinnhubResult<RecommendationTrendPeriod[]>> {
  const symbol = normalizeTicker(ticker);
  const response = await finnhubFetch(
    `/stock/recommendation?symbol=${encodeURIComponent(symbol)}`,
  );

  if (!response.success) {
    return response;
  }

  const data = (await response.data.json()) as RecommendationTrendPeriod[];

  if (!Array.isArray(data) || data.length === 0) {
    return {
      success: false,
      error: `No analyst recommendation trends found for ${symbol}.`,
    };
  }

  return { success: true, data };
}

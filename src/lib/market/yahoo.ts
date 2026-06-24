import type {
  FinnhubResult,
  YahooForwardEstimate,
  YahooInsights,
  YahooNewsItem,
  YahooPriceTarget,
  YahooTrend,
} from "@/lib/market/types";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function dateToUnixStart(date: string) {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
}

function toTradingDateString(unix: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unix * 1000));
}

function pickCloseOnOrBefore(
  timestamps: number[],
  closes: Array<number | null>,
  targetDate: string,
) {
  let bestClose: number | null = null;
  let bestDate = "";

  for (let index = 0; index < timestamps.length; index += 1) {
    const tradingDate = toTradingDateString(timestamps[index]);
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

export async function fetchYahooDailyClose(
  ticker: string,
  date: string,
): Promise<FinnhubResult<number>> {
  const symbol = normalizeTicker(ticker);
  const targetUnix = dateToUnixStart(date);
  const period1 = targetUnix - 14 * 86_400;
  const period2 = targetUnix + 5 * 86_400;

  const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": YAHOO_USER_AGENT,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Yahoo Finance request failed for ${symbol} (${response.status}).`,
      };
    }

    const data = (await response.json()) as {
      chart?: {
        error?: { description?: string };
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{ close?: Array<number | null> }>;
          };
        }>;
      };
    };

    if (data.chart?.error) {
      return {
        success: false,
        error:
          data.chart.error.description ??
          `Yahoo Finance returned an error for ${symbol}.`,
      };
    }

    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];

    if (timestamps.length === 0 || closes.length === 0) {
      return {
        success: false,
        error: `No historical price found for ${symbol} on ${date}.`,
      };
    }

    const bestClose = pickCloseOnOrBefore(timestamps, closes, date);

    if (bestClose === null) {
      return {
        success: false,
        error: `No historical price found for ${symbol} on or before ${date}.`,
      };
    }

    return { success: true, data: bestClose };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : `Yahoo Finance request failed for ${symbol}.`,
    };
  }
}

// ---------------------------------------------------------------------------
// Yahoo Finance display-only insights (price targets, estimates, news, trend)
// ---------------------------------------------------------------------------

const YAHOO_QUOTE_SUMMARY_BASE =
  "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const YAHOO_SEARCH_BASE = "https://query1.finance.yahoo.com/v1/finance/search";
const YAHOO_CRUMB_URL = "https://query1.finance.yahoo.com/v1/test/getcrumb";
const YAHOO_COOKIE_URL = "https://fc.yahoo.com/";

/** Yahoo wraps numbers as `{ raw, fmt }`; pull the numeric `raw`. */
function rawNumber(value: unknown): number | null {
  if (value && typeof value === "object" && "raw" in value) {
    const raw = (value as { raw?: unknown }).raw;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function pctFromFraction(value: unknown): number | null {
  const raw = rawNumber(value);
  return raw === null ? null : Math.round(raw * 1000) / 10;
}

type YahooCredentials = { cookie: string; crumb: string };

let cachedCredentials: YahooCredentials | null = null;

async function getYahooCredentials(): Promise<YahooCredentials | null> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  try {
    const cookieResponse = await fetch(YAHOO_COOKIE_URL, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
      redirect: "manual",
      cache: "no-store",
    });
    const cookie = cookieResponse.headers.get("set-cookie");
    if (!cookie) {
      return null;
    }

    const crumbResponse = await fetch(YAHOO_CRUMB_URL, {
      headers: { "User-Agent": YAHOO_USER_AGENT, Cookie: cookie },
      cache: "no-store",
    });
    if (!crumbResponse.ok) {
      return null;
    }
    const crumb = (await crumbResponse.text()).trim();
    if (!crumb || crumb.includes("{")) {
      return null;
    }

    cachedCredentials = { cookie, crumb };
    return cachedCredentials;
  } catch {
    return null;
  }
}

type QuoteSummaryResult = {
  financialData?: Record<string, unknown>;
  earningsTrend?: { trend?: Array<Record<string, unknown>> };
};

async function fetchYahooQuoteSummary(
  symbol: string,
): Promise<QuoteSummaryResult | null> {
  const credentials = await getYahooCredentials();
  if (!credentials) {
    return null;
  }

  const modules = "financialData,earningsTrend";
  const url = `${YAHOO_QUOTE_SUMMARY_BASE}/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(credentials.crumb)}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT, Cookie: credentials.cookie },
      cache: "no-store",
    });

    if (response.status === 401) {
      // Crumb likely expired; reset cache so the next capture re-auths.
      cachedCredentials = null;
      return null;
    }
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as {
      quoteSummary?: { result?: QuoteSummaryResult[] };
    };
    return json.quoteSummary?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

function buildPriceTarget(
  financialData: Record<string, unknown> | undefined,
): YahooPriceTarget | null {
  if (!financialData) {
    return null;
  }

  const current = rawNumber(financialData.currentPrice);
  const mean = rawNumber(financialData.targetMeanPrice);
  const high = rawNumber(financialData.targetHighPrice);
  const low = rawNumber(financialData.targetLowPrice);
  const recommendationMean = rawNumber(financialData.recommendationMean);
  const analystCount = rawNumber(financialData.numberOfAnalystOpinions);
  const recommendationKey =
    typeof financialData.recommendationKey === "string"
      ? financialData.recommendationKey
      : null;

  const upsidePct =
    current !== null && current > 0 && mean !== null
      ? Math.round(((mean - current) / current) * 1000) / 10
      : null;

  if (
    mean === null &&
    high === null &&
    low === null &&
    recommendationKey === null
  ) {
    return null;
  }

  return {
    current,
    mean,
    high,
    low,
    upsidePct,
    recommendationKey,
    recommendationMean,
    analystCount: analystCount === null ? null : Math.round(analystCount),
  };
}

const EARNINGS_PERIOD_LABELS: Record<string, string> = {
  "0q": "Current quarter",
  "+1q": "Next quarter",
  "0y": "Current year",
  "+1y": "Next year",
};

function buildForwardEstimates(
  earningsTrend: QuoteSummaryResult["earningsTrend"],
): YahooForwardEstimate[] {
  const trend = earningsTrend?.trend ?? [];
  const wanted = new Set(Object.keys(EARNINGS_PERIOD_LABELS));
  const estimates: YahooForwardEstimate[] = [];

  for (const entry of trend) {
    const period = typeof entry.period === "string" ? entry.period : "";
    if (!wanted.has(period)) {
      continue;
    }

    const earningsEstimate = entry.earningsEstimate as
      | Record<string, unknown>
      | undefined;
    const revenueEstimate = entry.revenueEstimate as
      | Record<string, unknown>
      | undefined;

    const epsAvg = rawNumber(earningsEstimate?.avg);
    const revenueAvg = rawNumber(revenueEstimate?.avg);
    const growthPct = pctFromFraction(entry.growth);

    if (epsAvg === null && revenueAvg === null) {
      continue;
    }

    estimates.push({
      label: EARNINGS_PERIOD_LABELS[period],
      endDate: typeof entry.endDate === "string" ? entry.endDate : null,
      epsAvg,
      revenueAvg,
      growthPct,
    });
  }

  return estimates;
}

type ChartMeta = {
  regularMarketPrice?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

async function fetchYahooTrend(symbol: string): Promise<YahooTrend | null> {
  const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=1y`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as {
      chart?: {
        result?: Array<{
          meta?: ChartMeta;
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };

    const result = json.chart?.result?.[0];
    if (!result) {
      return null;
    }

    const meta = result.meta ?? {};
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => typeof c === "number" && Number.isFinite(c),
    );

    const price =
      meta.regularMarketPrice ?? closes[closes.length - 1] ?? null;
    const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh ?? null;
    const fiftyTwoWeekLow = meta.fiftyTwoWeekLow ?? null;

    const rangePositionPct =
      price !== null &&
      fiftyTwoWeekHigh !== null &&
      fiftyTwoWeekLow !== null &&
      fiftyTwoWeekHigh > fiftyTwoWeekLow
        ? Math.round(
            ((price - fiftyTwoWeekLow) /
              (fiftyTwoWeekHigh - fiftyTwoWeekLow)) *
              1000,
          ) / 10
        : null;

    const returnOver = (tradingDays: number): number | null => {
      if (closes.length <= tradingDays || price === null) {
        return null;
      }
      const past = closes[closes.length - 1 - tradingDays];
      if (typeof past !== "number" || past <= 0) {
        return null;
      }
      return Math.round(((price - past) / past) * 1000) / 10;
    };

    return {
      price,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      rangePositionPct,
      return1moPct: returnOver(21),
      return6moPct: returnOver(126),
    };
  } catch {
    return null;
  }
}

async function fetchYahooNews(symbol: string): Promise<YahooNewsItem[]> {
  const url = `${YAHOO_SEARCH_BASE}?q=${encodeURIComponent(symbol)}&newsCount=6&quotesCount=0`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as {
      news?: Array<{
        title?: string;
        publisher?: string;
        link?: string;
        providerPublishTime?: number;
      }>;
    };

    const items = json.news ?? [];
    const news: YahooNewsItem[] = [];
    for (const item of items.slice(0, 5)) {
      if (!item.title || !item.link) {
        continue;
      }
      news.push({
        title: item.title,
        publisher: item.publisher ?? "—",
        link: item.link,
        publishedAt: item.providerPublishTime
          ? new Date(item.providerPublishTime * 1000).toISOString()
          : null,
      });
    }
    return news;
  } catch {
    return [];
  }
}

function emptyInsights(note: string): YahooInsights {
  return {
    fetchedAt: new Date().toISOString(),
    available: false,
    note,
    priceTarget: null,
    forwardEstimates: [],
    trend: null,
    news: [],
  };
}

/**
 * Fetches Yahoo Finance display-only insights: analyst price targets and
 * rating, forward EPS/revenue estimates, 52-week momentum, and recent news.
 * Best-effort — any failure resolves to an unavailable object so research
 * capture never breaks. News and trend work without auth; price targets and
 * estimates require the Yahoo cookie+crumb handshake.
 */
export async function fetchYahooInsights(
  ticker: string,
): Promise<YahooInsights> {
  const symbol = normalizeTicker(ticker);

  try {
    const [summary, trend, news] = await Promise.all([
      fetchYahooQuoteSummary(symbol),
      fetchYahooTrend(symbol),
      fetchYahooNews(symbol),
    ]);

    const priceTarget = buildPriceTarget(summary?.financialData);
    const forwardEstimates = buildForwardEstimates(summary?.earningsTrend);

    const available =
      priceTarget !== null ||
      forwardEstimates.length > 0 ||
      trend !== null ||
      news.length > 0;

    return {
      fetchedAt: new Date().toISOString(),
      available,
      note: available ? "" : `No Yahoo Finance data found for ${symbol}.`,
      priceTarget,
      forwardEstimates,
      trend,
      news,
    };
  } catch {
    return emptyInsights(`Yahoo Finance request failed for ${symbol}.`);
  }
}

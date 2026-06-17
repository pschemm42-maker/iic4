import { getFinnhubApiKey } from "@/lib/env";
import type {
  BatchQuoteResult,
  FinnhubResult,
  HoldingMarketData,
  QuoteResult,
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

    if (index + batchSize < uniqueTickers.length) {
      await sleep(200);
    }
  }

  return { success: true, data: { succeeded, failed } };
}

import type { FinnhubResult } from "@/lib/market/types";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_USER_AGENT =
  "Mozilla/5.0 (compatible; IIC4/1.0; +https://github.com/iic4)";

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

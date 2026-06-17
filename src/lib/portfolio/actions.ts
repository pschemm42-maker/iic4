"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";
import { formatSupabaseNetworkError } from "@/lib/env";
import { fetchHoldingStats, fetchQuotesBatched } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import type {
  PortfolioHolding,
  PortfolioHoldingInput,
} from "@/lib/types/portfolio";

export type PortfolioActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

async function assertAdministrator(): Promise<PortfolioActionResult | null> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!isAdministrator(profile)) {
    return { success: false, error: "Administrator access required." };
  }

  return null;
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseHoldingInput(formData: FormData): PortfolioHoldingInput | null {
  const ticker = String(formData.get("ticker") ?? "")
    .trim()
    .toUpperCase();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const shares = Number(formData.get("shares"));
  const averageCostPerShare = Number(formData.get("averageCostPerShare"));
  const currentPrice = parseOptionalNumber(formData.get("currentPrice"));
  const sector = String(formData.get("sector") ?? "").trim();
  const purchaseDateRaw = String(formData.get("purchaseDate") ?? "").trim();
  const dividendYield = parseOptionalNumber(formData.get("dividendYield"));
  const peRatio = parseOptionalNumber(formData.get("peRatio"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!ticker || !companyName) {
    return null;
  }

  if (!Number.isFinite(shares) || shares <= 0) {
    return null;
  }

  if (!Number.isFinite(averageCostPerShare) || averageCostPerShare < 0) {
    return null;
  }

  return {
    ticker,
    companyName,
    shares,
    averageCostPerShare,
    currentPrice,
    sector,
    purchaseDate: purchaseDateRaw || null,
    dividendYield,
    peRatio,
    notes,
  };
}

export async function listHoldings(): Promise<
  PortfolioActionResult<PortfolioHolding[]>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .order("ticker", { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true, data: data as PortfolioHolding[] };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function addHolding(
  formData: FormData,
): Promise<PortfolioActionResult<PortfolioHolding>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  const input = parseHoldingInput(formData);
  if (!input) {
    return {
      success: false,
      error:
        "Ticker, company name, shares, and average cost per share are required.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_holdings")
      .insert({
        ticker: input.ticker,
        company_name: input.companyName,
        shares: input.shares,
        average_cost_per_share: input.averageCostPerShare,
        current_price: input.currentPrice,
        sector: input.sector,
        purchase_date: input.purchaseDate,
        dividend_yield: input.dividendYield,
        pe_ratio: input.peRatio,
        notes: input.notes,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: `${input.ticker} is already in the portfolio.`,
        };
      }

      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/portfolio");
    return { success: true, data: data as PortfolioHolding };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function removeHolding(
  holdingId: string,
): Promise<PortfolioActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("portfolio_holdings")
      .delete()
      .eq("id", holdingId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/portfolio");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function refreshAllQuotes(): Promise<PortfolioActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  const holdingsResult = await listHoldings();
  if (!holdingsResult.success || !holdingsResult.data) {
    return {
      success: false,
      error: holdingsResult.success
        ? "No holdings to refresh."
        : holdingsResult.error,
    };
  }

  if (holdingsResult.data.length === 0) {
    return { success: false, error: "No holdings to refresh." };
  }

  const quotesResult = await fetchQuotesBatched(
    holdingsResult.data.map((holding) => holding.ticker),
  );

  if (!quotesResult.success) {
    return { success: false, error: quotesResult.error };
  }

  const priceByTicker = new Map(
    quotesResult.data.succeeded.map((quote) => [quote.ticker, quote.currentPrice]),
  );

  try {
    const supabase = await createClient();

    for (const holding of holdingsResult.data) {
      const currentPrice = priceByTicker.get(holding.ticker);
      if (currentPrice === undefined) {
        continue;
      }

      const { error } = await supabase
        .from("portfolio_holdings")
        .update({ current_price: currentPrice })
        .eq("id", holding.id);

      if (error) {
        return { success: false, error: formatSupabaseNetworkError(error) };
      }
    }

    revalidatePath("/portfolio");

    const updatedCount = quotesResult.data.succeeded.length;
    const totalCount = holdingsResult.data.length;

    if (quotesResult.data.failed.length > 0) {
      const failedTickers = quotesResult.data.failed
        .map((failure) => failure.ticker)
        .join(", ");

      return {
        success: true,
        message: `Updated ${updatedCount} of ${totalCount} prices. Failed: ${failedTickers}.`,
      };
    }

    return {
      success: true,
      message: `Updated prices for all ${updatedCount} holdings.`,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function refreshHoldingStats(
  holdingId: string,
): Promise<PortfolioActionResult<PortfolioHolding>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  try {
    const supabase = await createClient();
    const { data: holding, error: loadError } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .eq("id", holdingId)
      .single();

    if (loadError) {
      return { success: false, error: formatSupabaseNetworkError(loadError) };
    }

    const statsResult = await fetchHoldingStats(holding.ticker);
    if (!statsResult.success) {
      return { success: false, error: statsResult.error };
    }

    const stats = statsResult.data;
    const updates: Record<string, string | number | null> = {};

    if (stats.currentPrice !== null) {
      updates.current_price = stats.currentPrice;
    }

    if (stats.companyName) {
      updates.company_name = stats.companyName;
    }

    if (stats.sector) {
      updates.sector = stats.sector;
    }

    if (stats.peRatio !== null) {
      updates.pe_ratio = stats.peRatio;
    }

    if (stats.dividendYield !== null) {
      updates.dividend_yield = stats.dividendYield;
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: `No market data returned for ${holding.ticker}.`,
      };
    }

    const { data, error } = await supabase
      .from("portfolio_holdings")
      .update(updates)
      .eq("id", holdingId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/portfolio");

    return {
      success: true,
      data: data as PortfolioHolding,
      message: `${holding.ticker} stats refreshed.`,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";
import {
  calculateWeightedAverageCost,
  earliestPurchaseDate,
} from "@/lib/portfolio/aggregate";
import { formatSupabaseNetworkError } from "@/lib/env";
import { fetchQuotesBatched } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import type {
  PortfolioHolding,
  PortfolioHoldingInput,
} from "@/lib/types/portfolio";

export type PortfolioActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

type HoldingRow = Omit<PortfolioHolding, "purchase_count"> & {
  portfolio_purchases?: Array<{ count: number }>;
};

function mapHoldingRow(row: HoldingRow): PortfolioHolding {
  const { portfolio_purchases, ...holding } = row;

  return {
    ...holding,
    purchase_count: portfolio_purchases?.[0]?.count ?? 0,
  };
}

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
  const costPerShare = Number(
    formData.get("costPerShare") ?? formData.get("averageCostPerShare"),
  );
  const currentPrice = parseOptionalNumber(formData.get("currentPrice"));
  const sector = String(formData.get("sector") ?? "").trim();
  const purchaseDateRaw = String(formData.get("purchaseDate") ?? "").trim();
  const dividendYield = parseOptionalNumber(formData.get("dividendYield"));
  const peRatio = parseOptionalNumber(formData.get("peRatio"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!ticker) {
    return null;
  }

  if (!Number.isFinite(shares) || shares <= 0) {
    return null;
  }

  if (!Number.isFinite(costPerShare) || costPerShare < 0) {
    return null;
  }

  return {
    ticker,
    companyName,
    shares,
    costPerShare,
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
      .select("*, portfolio_purchases(count)")
      .order("ticker", { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return {
      success: true,
      data: (data as HoldingRow[]).map(mapHoldingRow),
    };
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
      error: "Ticker, shares, and cost per share are required.",
    };
  }

  try {
    const supabase = await createClient();
    const { data: existingHolding, error: lookupError } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .eq("ticker", input.ticker)
      .maybeSingle();

    if (lookupError) {
      return { success: false, error: formatSupabaseNetworkError(lookupError) };
    }

    if (!existingHolding) {
      if (!input.companyName) {
        return {
          success: false,
          error: "Company name is required when adding a new ticker.",
        };
      }

      const { data: createdHolding, error: createError } = await supabase
        .from("portfolio_holdings")
        .insert({
          ticker: input.ticker,
          company_name: input.companyName,
          shares: input.shares,
          average_cost_per_share: input.costPerShare,
          current_price: input.currentPrice,
          sector: input.sector,
          purchase_date: input.purchaseDate,
          dividend_yield: input.dividendYield,
          pe_ratio: input.peRatio,
          notes: input.notes,
        })
        .select("*")
        .single();

      if (createError) {
        return { success: false, error: formatSupabaseNetworkError(createError) };
      }

      const { error: purchaseError } = await supabase
        .from("portfolio_purchases")
        .insert({
          holding_id: createdHolding.id,
          shares: input.shares,
          cost_per_share: input.costPerShare,
          purchase_date: input.purchaseDate,
          notes: input.notes,
        });

      if (purchaseError) {
        return {
          success: false,
          error: formatSupabaseNetworkError(purchaseError),
        };
      }

      revalidatePath("/portfolio");

      return {
        success: true,
        data: { ...createdHolding, purchase_count: 1 } as PortfolioHolding,
        message: `${input.ticker} added to the portfolio.`,
      };
    }

    const nextShares = Number(existingHolding.shares) + input.shares;
    const nextAverageCost = calculateWeightedAverageCost(
      Number(existingHolding.shares),
      Number(existingHolding.average_cost_per_share),
      input.shares,
      input.costPerShare,
    );

    const holdingUpdates: Record<string, string | number | null> = {
      shares: nextShares,
      average_cost_per_share: nextAverageCost,
      purchase_date: earliestPurchaseDate(
        existingHolding.purchase_date,
        input.purchaseDate,
      ),
    };

    if (input.currentPrice !== null) {
      holdingUpdates.current_price = input.currentPrice;
    }

    if (input.companyName) {
      holdingUpdates.company_name = input.companyName;
    }

    if (input.sector) {
      holdingUpdates.sector = input.sector;
    }

    if (input.dividendYield !== null) {
      holdingUpdates.dividend_yield = input.dividendYield;
    }

    if (input.peRatio !== null) {
      holdingUpdates.pe_ratio = input.peRatio;
    }

    const { error: updateError } = await supabase
      .from("portfolio_holdings")
      .update(holdingUpdates)
      .eq("id", existingHolding.id);

    if (updateError) {
      return { success: false, error: formatSupabaseNetworkError(updateError) };
    }

    const { error: purchaseError } = await supabase
      .from("portfolio_purchases")
      .insert({
        holding_id: existingHolding.id,
        shares: input.shares,
        cost_per_share: input.costPerShare,
        purchase_date: input.purchaseDate,
        notes: input.notes,
      });

    if (purchaseError) {
      return { success: false, error: formatSupabaseNetworkError(purchaseError) };
    }

    const { data: finalHolding, error: finalError } = await supabase
      .from("portfolio_holdings")
      .select("*, portfolio_purchases(count)")
      .eq("id", existingHolding.id)
      .single();

    if (finalError) {
      return { success: false, error: formatSupabaseNetworkError(finalError) };
    }

    revalidatePath("/portfolio");

    return {
      success: true,
      data: mapHoldingRow(finalHolding as HoldingRow),
      message: `Purchase added to ${input.ticker}. Position now ${nextShares} shares at $${nextAverageCost.toFixed(2)} avg cost.`,
    };
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

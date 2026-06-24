"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";
import { formatSupabaseNetworkError } from "@/lib/env";
import { fetchDailyClosesBatched } from "@/lib/market/finnhub";
import {
  aggregateHoldingsFromPurchases,
  filterPurchasesAsOf,
} from "@/lib/portfolio/aggregate";
import {
  calculateHoldingMetrics,
  calculatePortfolioSummary,
} from "@/lib/portfolio/metrics";
import { createClient } from "@/lib/supabase/server";
import { getClubCash } from "@/lib/portfolio/actions";
import type { PortfolioHolding } from "@/lib/types/portfolio";
import type {
  PortfolioSnapshot,
  PortfolioSnapshotHolding,
  PortfolioSnapshotHoldingUpdateInput,
  PortfolioSnapshotPurchase,
  PortfolioSnapshotPurchaseUpdateInput,
  PortfolioSnapshotSummary,
} from "@/lib/types/portfolio-snapshot";
import { snapshotHoldingToPortfolioHolding } from "@/lib/types/portfolio-snapshot";

export type SnapshotActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

type SnapshotHoldingRow = PortfolioSnapshotHolding & {
  portfolio_snapshot_purchases?: Array<{ count: number }>;
};

type LivePurchaseRow = {
  id: string;
  holding_id: string;
  shares: number;
  cost_per_share: number;
  purchase_date: string | null;
  notes: string;
  created_at: string;
};

type LiveHoldingRow = {
  id: string;
  ticker: string;
  company_name: string;
  shares: number;
  average_cost_per_share: number;
  current_price: number | null;
  sector: string;
  purchase_date: string | null;
  dividend_yield: number | null;
  pe_ratio: number | null;
  notes: string;
  portfolio_purchases: LivePurchaseRow[];
};

type SnapshotHoldingSeed = {
  ticker: string;
  companyName: string;
  shares: number;
  averageCostPerShare: number;
  closePrice: number | null;
  sector: string;
  purchaseDate: string | null;
  dividendYield: number | null;
  peRatio: number | null;
  notes: string;
  purchases: Array<{
    shares: number;
    costPerShare: number;
    purchaseDate: string | null;
    notes: string;
  }>;
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function mapSnapshotHoldingRow(row: SnapshotHoldingRow): PortfolioSnapshotHolding {
  const { portfolio_snapshot_purchases, ...holding } = row;
  return holding;
}

function getSnapshotPurchaseCount(row: SnapshotHoldingRow) {
  return row.portfolio_snapshot_purchases?.[0]?.count ?? 0;
}

async function assertAdministrator(): Promise<SnapshotActionResult | null> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!isAdministrator(profile)) {
    return { success: false, error: "Administrator access required." };
  }

  return null;
}

function revalidateSnapshotPaths(snapshotId?: string) {
  revalidatePath("/portfolio");
  revalidatePath("/portfolio/history");

  if (snapshotId) {
    revalidatePath(`/portfolio/history/${snapshotId}`);
  }
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSnapshotHoldingUpdateInput(
  formData: FormData,
): PortfolioSnapshotHoldingUpdateInput | null {
  const ticker = String(formData.get("ticker") ?? "")
    .trim()
    .toUpperCase();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const closePrice = parseOptionalNumber(formData.get("currentPrice"));
  const sector = String(formData.get("sector") ?? "").trim();
  const purchaseDateRaw = String(formData.get("purchaseDate") ?? "").trim();
  const dividendYield = parseOptionalNumber(formData.get("dividendYield"));
  const peRatio = parseOptionalNumber(formData.get("peRatio"));
  const notes = String(formData.get("notes") ?? "").trim();
  const editPosition = formData.get("editPosition") === "true";

  if (!ticker || !companyName) {
    return null;
  }

  const input: PortfolioSnapshotHoldingUpdateInput = {
    ticker,
    companyName,
    closePrice,
    sector,
    dividendYield,
    peRatio,
    notes,
  };

  if (editPosition) {
    const shares = Number(formData.get("shares"));
    const costPerShare = Number(formData.get("costPerShare"));

    if (!Number.isFinite(shares) || shares <= 0) {
      return null;
    }

    if (!Number.isFinite(costPerShare) || costPerShare < 0) {
      return null;
    }

    input.shares = shares;
    input.costPerShare = costPerShare;
    input.purchaseDate = purchaseDateRaw || null;
  }

  return input;
}

function parseSnapshotPurchaseUpdateInput(
  formData: FormData,
): PortfolioSnapshotPurchaseUpdateInput | null {
  const shares = Number(formData.get("shares"));
  const costPerShare = Number(formData.get("costPerShare"));
  const purchaseDateRaw = String(formData.get("purchaseDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!Number.isFinite(shares) || shares <= 0) {
    return null;
  }

  if (!Number.isFinite(costPerShare) || costPerShare < 0) {
    return null;
  }

  return {
    shares,
    costPerShare,
    purchaseDate: purchaseDateRaw || null,
    notes,
  };
}

function buildSnapshotSummary(
  snapshot: PortfolioSnapshot,
  holdings: PortfolioSnapshotHolding[],
): PortfolioSnapshotSummary {
  const portfolioHoldings = holdings.map((holding) =>
    snapshotHoldingToPortfolioHolding(holding, 1),
  );
  const metrics = portfolioHoldings.map((holding) =>
    calculateHoldingMetrics(holding, null),
  );
  const totalMarketValue = metrics.every((holding) => holding.marketValue !== null)
    ? metrics.reduce((sum, holding) => sum + (holding.marketValue ?? 0), 0)
    : null;
  const enriched = portfolioHoldings.map((holding) =>
    calculateHoldingMetrics(holding, totalMarketValue),
  );
  const summary = calculatePortfolioSummary(enriched, Number(snapshot.club_cash ?? 0));

  return {
    ...snapshot,
    ...summary,
  };
}

async function loadLiveHoldingsWithPurchases(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SnapshotActionResult<LiveHoldingRow[]>> {
  const { data, error } = await supabase
    .from("portfolio_holdings")
    .select("*, portfolio_purchases(*)")
    .order("ticker", { ascending: true });

  if (error) {
    return { success: false, error: formatSupabaseNetworkError(error) };
  }

  return { success: true, data: (data ?? []) as LiveHoldingRow[] };
}

async function replaceSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  snapshotDate: string,
  createdBy: string | null,
  holdings: SnapshotHoldingSeed[],
  clubCash = 0,
): Promise<SnapshotActionResult<PortfolioSnapshot>> {
  const { error: deleteError } = await supabase
    .from("portfolio_snapshots")
    .delete()
    .eq("snapshot_date", snapshotDate);

  if (deleteError) {
    return { success: false, error: formatSupabaseNetworkError(deleteError) };
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("portfolio_snapshots")
    .insert({
      snapshot_date: snapshotDate,
      created_by: createdBy,
      club_cash: clubCash,
    })
    .select("*")
    .single();

  if (snapshotError) {
    return { success: false, error: formatSupabaseNetworkError(snapshotError) };
  }

  for (const holding of holdings) {
    const { data: snapshotHolding, error: holdingError } = await supabase
      .from("portfolio_snapshot_holdings")
      .insert({
        snapshot_id: snapshot.id,
        ticker: holding.ticker,
        company_name: holding.companyName,
        shares: holding.shares,
        average_cost_per_share: holding.averageCostPerShare,
        close_price: holding.closePrice,
        sector: holding.sector,
        purchase_date: holding.purchaseDate,
        dividend_yield: holding.dividendYield,
        pe_ratio: holding.peRatio,
        notes: holding.notes,
      })
      .select("*")
      .single();

    if (holdingError) {
      return { success: false, error: formatSupabaseNetworkError(holdingError) };
    }

    if (holding.purchases.length > 0) {
      const { error: purchasesError } = await supabase
        .from("portfolio_snapshot_purchases")
        .insert(
          holding.purchases.map((purchase) => ({
            snapshot_holding_id: snapshotHolding.id,
            shares: purchase.shares,
            cost_per_share: purchase.costPerShare,
            purchase_date: purchase.purchaseDate,
            notes: purchase.notes,
          })),
        );

      if (purchasesError) {
        return {
          success: false,
          error: formatSupabaseNetworkError(purchasesError),
        };
      }
    }
  }

  return { success: true, data: snapshot as PortfolioSnapshot };
}

async function syncSnapshotHoldingFromPurchases(
  supabase: Awaited<ReturnType<typeof createClient>>,
  snapshotHoldingId: string,
): Promise<SnapshotActionResult> {
  const { data: purchases, error: purchasesError } = await supabase
    .from("portfolio_snapshot_purchases")
    .select("shares, cost_per_share, purchase_date")
    .eq("snapshot_holding_id", snapshotHoldingId)
    .order("created_at", { ascending: true });

  if (purchasesError) {
    return { success: false, error: formatSupabaseNetworkError(purchasesError) };
  }

  if (!purchases || purchases.length === 0) {
    return {
      success: false,
      error: "No purchase lots found for this snapshot holding.",
    };
  }

  const aggregated = aggregateHoldingsFromPurchases(
    purchases.map((purchase) => ({
      shares: Number(purchase.shares),
      cost_per_share: Number(purchase.cost_per_share),
      purchase_date: purchase.purchase_date,
    })),
  );

  const { error: updateError } = await supabase
    .from("portfolio_snapshot_holdings")
    .update({
      shares: aggregated.shares,
      average_cost_per_share: aggregated.averageCostPerShare,
      purchase_date: aggregated.purchaseDate,
    })
    .eq("id", snapshotHoldingId);

  if (updateError) {
    return { success: false, error: formatSupabaseNetworkError(updateError) };
  }

  return { success: true };
}

export async function listSnapshots(): Promise<
  SnapshotActionResult<PortfolioSnapshotSummary[]>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_snapshots")
      .select("*, portfolio_snapshot_holdings(*)")
      .order("snapshot_date", { ascending: false });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    const summaries = (data ?? []).map((row) => {
      const { portfolio_snapshot_holdings, ...snapshot } = row as PortfolioSnapshot & {
        portfolio_snapshot_holdings: PortfolioSnapshotHolding[];
      };

      return buildSnapshotSummary(
        snapshot,
        portfolio_snapshot_holdings ?? [],
      );
    });

    return { success: true, data: summaries };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function getSnapshot(
  snapshotId: string,
): Promise<SnapshotActionResult<PortfolioSnapshot>> {
  if (!snapshotId) {
    return { success: false, error: "Snapshot is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .maybeSingle();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    if (!data) {
      return { success: false, error: "Snapshot not found." };
    }

    return { success: true, data: data as PortfolioSnapshot };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function listSnapshotHoldings(
  snapshotId: string,
): Promise<SnapshotActionResult<PortfolioHolding[]>> {
  if (!snapshotId) {
    return { success: false, error: "Snapshot is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_snapshot_holdings")
      .select("*, portfolio_snapshot_purchases(count)")
      .eq("snapshot_id", snapshotId)
      .order("ticker", { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return {
      success: true,
      data: (data as SnapshotHoldingRow[]).map((row) =>
        snapshotHoldingToPortfolioHolding(
          mapSnapshotHoldingRow(row),
          getSnapshotPurchaseCount(row),
        ),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function listSnapshotPurchases(
  snapshotHoldingId: string,
): Promise<SnapshotActionResult<PortfolioSnapshotPurchase[]>> {
  if (!snapshotHoldingId) {
    return { success: false, error: "Snapshot holding is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_snapshot_purchases")
      .select("*")
      .eq("snapshot_holding_id", snapshotHoldingId)
      .order("purchase_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true, data: data as PortfolioSnapshotPurchase[] };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function saveCurrentSnapshot(): Promise<SnapshotActionResult<PortfolioSnapshot>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  try {
    const supabase = await createClient();
    const profile = await getCurrentProfile();
    const [holdingsResult, clubCashResult] = await Promise.all([
      loadLiveHoldingsWithPurchases(supabase),
      getClubCash(),
    ]);

    if (!holdingsResult.success || !holdingsResult.data) {
      return {
        success: false,
        error: holdingsResult.success
          ? "No holdings to snapshot."
          : holdingsResult.error,
      };
    }

    if (holdingsResult.data.length === 0) {
      return { success: false, error: "No holdings to snapshot." };
    }

    const clubCash = clubCashResult.success ? (clubCashResult.data ?? 0) : 0;
    const snapshotDate = todayDateString();
    const seeds: SnapshotHoldingSeed[] = holdingsResult.data.map((holding) => ({
      ticker: holding.ticker,
      companyName: holding.company_name,
      shares: Number(holding.shares),
      averageCostPerShare: Number(holding.average_cost_per_share),
      closePrice:
        holding.current_price !== null ? Number(holding.current_price) : null,
      sector: holding.sector,
      purchaseDate: holding.purchase_date,
      dividendYield: holding.dividend_yield,
      peRatio: holding.pe_ratio,
      notes: holding.notes,
      purchases: holding.portfolio_purchases.map((purchase) => ({
        shares: Number(purchase.shares),
        costPerShare: Number(purchase.cost_per_share),
        purchaseDate: purchase.purchase_date,
        notes: purchase.notes,
      })),
    }));

    const result = await replaceSnapshot(
      supabase,
      snapshotDate,
      profile?.id ?? null,
      seeds,
      clubCash,
    );

    if (!result.success) {
      return result;
    }

    revalidateSnapshotPaths(result.data?.id);

    return {
      success: true,
      data: result.data,
      message: `Snapshot saved for ${snapshotDate}.`,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function createHistoricSnapshot(
  snapshotDate: string,
): Promise<SnapshotActionResult<PortfolioSnapshot>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  const normalizedDate = snapshotDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return { success: false, error: "A valid snapshot date is required." };
  }

  if (normalizedDate > todayDateString()) {
    return {
      success: false,
      error: "Historic snapshot date cannot be in the future.",
    };
  }

  try {
    const supabase = await createClient();
    const profile = await getCurrentProfile();
    const holdingsResult = await loadLiveHoldingsWithPurchases(supabase);

    if (!holdingsResult.success || !holdingsResult.data) {
      return {
        success: false,
        error: holdingsResult.success
          ? "No holdings available for historic snapshot."
          : holdingsResult.error,
      };
    }

    const preparedHoldings: Array<{
      seed: SnapshotHoldingSeed;
      ticker: string;
    }> = [];

    for (const holding of holdingsResult.data) {
      const filteredPurchases = filterPurchasesAsOf(
        holding.portfolio_purchases.map((purchase) => ({
          shares: Number(purchase.shares),
          cost_per_share: Number(purchase.cost_per_share),
          purchase_date: purchase.purchase_date,
        })),
        normalizedDate,
      );

      const aggregated = aggregateHoldingsFromPurchases(filteredPurchases);
      if (aggregated.shares <= 0) {
        continue;
      }

      preparedHoldings.push({
        ticker: holding.ticker,
        seed: {
          ticker: holding.ticker,
          companyName: holding.company_name,
          shares: aggregated.shares,
          averageCostPerShare: aggregated.averageCostPerShare,
          closePrice: null,
          sector: holding.sector,
          purchaseDate: aggregated.purchaseDate,
          dividendYield: holding.dividend_yield,
          peRatio: holding.pe_ratio,
          notes: holding.notes,
          purchases: holding.portfolio_purchases
            .filter(
              (purchase) =>
                !purchase.purchase_date ||
                purchase.purchase_date <= normalizedDate,
            )
            .map((purchase) => ({
              shares: Number(purchase.shares),
              costPerShare: Number(purchase.cost_per_share),
              purchaseDate: purchase.purchase_date,
              notes: purchase.notes,
            })),
        },
      });
    }

    if (preparedHoldings.length === 0) {
      return {
        success: false,
        error: "No holdings qualified for the selected snapshot date.",
      };
    }

    const quotesResult = await fetchDailyClosesBatched(
      preparedHoldings.map((holding) => ({
        ticker: holding.ticker,
        date: normalizedDate,
      })),
    );

    if (!quotesResult.success) {
      return { success: false, error: quotesResult.error };
    }

    const closeByTicker = new Map(
      quotesResult.data.succeeded.map((quote) => [quote.ticker, quote.closePrice]),
    );

    const seeds: SnapshotHoldingSeed[] = [];
    const failedTickers: string[] = [];

    for (const holding of preparedHoldings) {
      const closePrice = closeByTicker.get(holding.ticker);
      if (closePrice === undefined) {
        failedTickers.push(holding.ticker);
        continue;
      }

      seeds.push({
        ...holding.seed,
        closePrice,
      });
    }

    if (seeds.length === 0) {
      return {
        success: false,
        error: `Could not fetch historical prices for: ${failedTickers.join(", ")}.`,
      };
    }

    const result = await replaceSnapshot(
      supabase,
      normalizedDate,
      profile?.id ?? null,
      seeds,
    );

    if (!result.success) {
      return result;
    }

    revalidateSnapshotPaths(result.data?.id);

    const message =
      failedTickers.length > 0
        ? `Historic snapshot saved for ${normalizedDate}. Skipped tickers without prices: ${failedTickers.join(", ")}.`
        : `Historic snapshot saved for ${normalizedDate}.`;

    return {
      success: true,
      data: result.data,
      message,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function updateSnapshotHolding(
  snapshotHoldingId: string,
  formData: FormData,
): Promise<SnapshotActionResult<PortfolioSnapshotHolding>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!snapshotHoldingId) {
    return { success: false, error: "Snapshot holding is required." };
  }

  const input = parseSnapshotHoldingUpdateInput(formData);
  if (!input) {
    return {
      success: false,
      error: "Ticker, company name, and valid position values are required.",
    };
  }

  try {
    const supabase = await createClient();
    const { data: existingHolding, error: lookupError } = await supabase
      .from("portfolio_snapshot_holdings")
      .select("*, portfolio_snapshot_purchases(count)")
      .eq("id", snapshotHoldingId)
      .maybeSingle();

    if (lookupError) {
      return { success: false, error: formatSupabaseNetworkError(lookupError) };
    }

    if (!existingHolding) {
      return { success: false, error: "Snapshot holding not found." };
    }

    const existing = mapSnapshotHoldingRow(existingHolding as SnapshotHoldingRow);

    if (input.ticker !== existing.ticker) {
      const { data: conflictingHolding, error: conflictError } = await supabase
        .from("portfolio_snapshot_holdings")
        .select("id")
        .eq("snapshot_id", existing.snapshot_id)
        .eq("ticker", input.ticker)
        .neq("id", snapshotHoldingId)
        .maybeSingle();

      if (conflictError) {
        return { success: false, error: formatSupabaseNetworkError(conflictError) };
      }

      if (conflictingHolding) {
        return {
          success: false,
          error: `${input.ticker} already exists in this snapshot.`,
        };
      }
    }

    const holdingUpdates: Record<string, string | number | null> = {
      ticker: input.ticker,
      company_name: input.companyName,
      sector: input.sector,
      close_price: input.closePrice,
      dividend_yield: input.dividendYield,
      pe_ratio: input.peRatio,
      notes: input.notes,
    };

    if (input.shares !== undefined && input.costPerShare !== undefined) {
      holdingUpdates.shares = input.shares;
      holdingUpdates.average_cost_per_share = input.costPerShare;
      holdingUpdates.purchase_date = input.purchaseDate ?? null;
    }

    const { error: updateError } = await supabase
      .from("portfolio_snapshot_holdings")
      .update(holdingUpdates)
      .eq("id", snapshotHoldingId);

    if (updateError) {
      return { success: false, error: formatSupabaseNetworkError(updateError) };
    }

    if (input.shares !== undefined && input.costPerShare !== undefined) {
      const { data: purchases, error: purchasesError } = await supabase
        .from("portfolio_snapshot_purchases")
        .select("id")
        .eq("snapshot_holding_id", snapshotHoldingId)
        .order("created_at", { ascending: true });

      if (purchasesError) {
        return {
          success: false,
          error: formatSupabaseNetworkError(purchasesError),
        };
      }

      if (purchases && purchases.length === 1) {
        const { error: purchaseUpdateError } = await supabase
          .from("portfolio_snapshot_purchases")
          .update({
            shares: input.shares,
            cost_per_share: input.costPerShare,
            purchase_date: input.purchaseDate ?? null,
            notes: input.notes,
          })
          .eq("id", purchases[0].id);

        if (purchaseUpdateError) {
          return {
            success: false,
            error: formatSupabaseNetworkError(purchaseUpdateError),
          };
        }
      }
    }

    const { data: finalHolding, error: finalError } = await supabase
      .from("portfolio_snapshot_holdings")
      .select("*")
      .eq("id", snapshotHoldingId)
      .single();

    if (finalError) {
      return { success: false, error: formatSupabaseNetworkError(finalError) };
    }

    revalidateSnapshotPaths(existing.snapshot_id);

    return {
      success: true,
      data: finalHolding as PortfolioSnapshotHolding,
      message: `${input.ticker} updated.`,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function updateSnapshotPurchase(
  purchaseId: string,
  formData: FormData,
): Promise<SnapshotActionResult<PortfolioSnapshotPurchase>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!purchaseId) {
    return { success: false, error: "Purchase lot is required." };
  }

  const input = parseSnapshotPurchaseUpdateInput(formData);
  if (!input) {
    return {
      success: false,
      error: "Shares and cost per share are required and must be valid.",
    };
  }

  try {
    const supabase = await createClient();
    const { data: existingPurchase, error: lookupError } = await supabase
      .from("portfolio_snapshot_purchases")
      .select("*")
      .eq("id", purchaseId)
      .maybeSingle();

    if (lookupError) {
      return { success: false, error: formatSupabaseNetworkError(lookupError) };
    }

    if (!existingPurchase) {
      return { success: false, error: "Purchase lot not found." };
    }

    const { data: updatedPurchase, error: updateError } = await supabase
      .from("portfolio_snapshot_purchases")
      .update({
        shares: input.shares,
        cost_per_share: input.costPerShare,
        purchase_date: input.purchaseDate,
        notes: input.notes,
      })
      .eq("id", purchaseId)
      .select("*")
      .single();

    if (updateError) {
      return { success: false, error: formatSupabaseNetworkError(updateError) };
    }

    const syncResult = await syncSnapshotHoldingFromPurchases(
      supabase,
      existingPurchase.snapshot_holding_id,
    );

    if (!syncResult.success) {
      return syncResult;
    }

    const { data: snapshotHolding, error: holdingError } = await supabase
      .from("portfolio_snapshot_holdings")
      .select("snapshot_id")
      .eq("id", existingPurchase.snapshot_holding_id)
      .single();

    if (!holdingError && snapshotHolding) {
      revalidateSnapshotPaths(snapshotHolding.snapshot_id);
    }

    return {
      success: true,
      data: updatedPurchase as PortfolioSnapshotPurchase,
      message: "Purchase lot updated.",
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function removeSnapshotHolding(
  snapshotHoldingId: string,
): Promise<SnapshotActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  try {
    const supabase = await createClient();
    const { data: existingHolding, error: lookupError } = await supabase
      .from("portfolio_snapshot_holdings")
      .select("snapshot_id")
      .eq("id", snapshotHoldingId)
      .maybeSingle();

    if (lookupError) {
      return { success: false, error: formatSupabaseNetworkError(lookupError) };
    }

    const { error } = await supabase
      .from("portfolio_snapshot_holdings")
      .delete()
      .eq("id", snapshotHoldingId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    if (existingHolding) {
      revalidateSnapshotPaths(existingHolding.snapshot_id);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function updateSnapshotClubCash(
  snapshotId: string,
  value: number,
): Promise<SnapshotActionResult<number>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!snapshotId) {
    return { success: false, error: "Snapshot is required." };
  }

  if (!Number.isFinite(value) || value < 0) {
    return {
      success: false,
      error: "Club cash must be a valid non-negative amount.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_snapshots")
      .update({ club_cash: value })
      .eq("id", snapshotId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    if (!data) {
      return { success: false, error: "Snapshot not found." };
    }

    revalidateSnapshotPaths(snapshotId);

    return { success: true, data: value, message: "Club cash updated." };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function deleteSnapshot(
  snapshotId: string,
): Promise<SnapshotActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("portfolio_snapshots")
      .delete()
      .eq("id", snapshotId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidateSnapshotPaths(snapshotId);

    return { success: true, message: "Snapshot deleted." };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

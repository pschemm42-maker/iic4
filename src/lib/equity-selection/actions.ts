"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";
import { captureStockResearchWithGemini } from "@/lib/equity-selection/research";
import { formatSupabaseNetworkError } from "@/lib/env";
import { fetchHoldingStats } from "@/lib/market/finnhub";
import { createClient } from "@/lib/supabase/server";
import type {
  StockSuggestion,
  StockSuggestionResearch,
  StockSuggestionVote,
} from "@/lib/types/equity-selection";

export type EquitySelectionActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

type StockSuggestionRow = Omit<
  StockSuggestion,
  "vote_count" | "current_user_has_voted"
> & {
  stock_suggestion_research?:
    | { composite_score: number }
    | Array<{ composite_score: number }>
    | null;
  stock_suggestion_votes?: Array<{ count: number }> | null;
};

function mapStockSuggestion(
  row: StockSuggestionRow,
  options?: {
    voteCount?: number;
    currentUserHasVoted?: boolean;
  },
): StockSuggestion {
  const { stock_suggestion_research, stock_suggestion_votes, ...suggestion } =
    row;
  const researchScore = Array.isArray(stock_suggestion_research)
    ? stock_suggestion_research[0]?.composite_score
    : stock_suggestion_research?.composite_score;
  const voteCount =
    options?.voteCount ??
    stock_suggestion_votes?.[0]?.count ??
    0;

  return {
    ...suggestion,
    research_composite_score:
      suggestion.research_composite_score ?? researchScore ?? null,
    vote_count: voteCount,
    current_user_has_voted: options?.currentUserHasVoted ?? false,
  };
}

function displayName(fullName: string, email: string) {
  const trimmed = fullName.trim();
  if (trimmed) {
    return trimmed;
  }

  return email.split("@")[0] || email;
}

function parseRecommendationReason(value: FormDataEntryValue | null) {
  const recommendationReason = String(value ?? "").trim();

  if (!recommendationReason) {
    return {
      success: false as const,
      error: "Member recommendation reason is required.",
    };
  }

  if (recommendationReason.length > 500) {
    return {
      success: false as const,
      error: "Recommendation reason must be 500 characters or fewer.",
    };
  }

  return { success: true as const, data: recommendationReason };
}

export async function listStockSuggestions(): Promise<
  EquitySelectionActionResult<StockSuggestion[]>
> {
  try {
    const profile = await getCurrentProfile();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stock_suggestions")
      .select("*, stock_suggestion_research(composite_score), stock_suggestion_votes(count)")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    let userVotedSuggestionIds = new Set<string>();

    if (profile) {
      const { data: userVotes, error: votesError } = await supabase
        .from("stock_suggestion_votes")
        .select("suggestion_id")
        .eq("voter_id", profile.id);

      if (votesError) {
        return { success: false, error: formatSupabaseNetworkError(votesError) };
      }

      userVotedSuggestionIds = new Set(
        userVotes?.map((vote) => vote.suggestion_id) ?? [],
      );
    }

    return {
      success: true,
      data: (data as StockSuggestionRow[]).map((row) =>
        mapStockSuggestion(row, {
          currentUserHasVoted: userVotedSuggestionIds.has(row.id),
        }),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function addStockSuggestion(
  formData: FormData,
): Promise<EquitySelectionActionResult<StockSuggestion>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  const ticker = String(formData.get("ticker") ?? "")
    .trim()
    .toUpperCase();

  if (!ticker) {
    return { success: false, error: "Stock symbol is required." };
  }

  const parsedReason = parseRecommendationReason(
    formData.get("recommendationReason"),
  );

  if (!parsedReason.success) {
    return { success: false, error: parsedReason.error };
  }

  const recommendationReason = parsedReason.data;

  const marketResult = await fetchHoldingStats(ticker);
  if (!marketResult.success) {
    return { success: false, error: marketResult.error };
  }

  const market = marketResult.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stock_suggestions")
      .insert({
        ticker,
        company_name: market.companyName ?? "",
        sector: market.sector ?? "",
        current_price: market.currentPrice,
        pe_ratio: market.peRatio,
        dividend_yield: market.dividendYield,
        suggested_by: profile.id,
        suggester_name: displayName(profile.full_name, profile.email),
        recommendation_reason: recommendationReason,
      })
      .select("*")
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/equity-selection");

    return {
      success: true,
      data: mapStockSuggestion(data as StockSuggestionRow, {
        voteCount: 0,
        currentUserHasVoted: false,
      }),
      message: `${ticker} added to stock suggestions.`,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function updateStockSuggestionReason(
  suggestionId: string,
  recommendationReason: string,
): Promise<EquitySelectionActionResult<StockSuggestion>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!suggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  const parsedReason = parseRecommendationReason(recommendationReason);
  if (!parsedReason.success) {
    return { success: false, error: parsedReason.error };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "update_stock_suggestion_recommendation_reason",
      {
        p_suggestion_id: suggestionId,
        p_recommendation_reason: parsedReason.data,
      },
    );

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/equity-selection");

    return {
      success: true,
      data: mapStockSuggestion(data as StockSuggestionRow),
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function getStockSuggestionResearch(
  suggestionId: string,
): Promise<EquitySelectionActionResult<StockSuggestionResearch | null>> {
  if (!suggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stock_suggestion_research")
      .select("*")
      .eq("suggestion_id", suggestionId)
      .maybeSingle();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true, data: (data as StockSuggestionResearch | null) ?? null };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function captureStockResearch(
  suggestionId: string,
): Promise<EquitySelectionActionResult<StockSuggestionResearch>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!suggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();
    const { data: suggestion, error: suggestionError } = await supabase
      .from("stock_suggestions")
      .select("*")
      .eq("id", suggestionId)
      .maybeSingle();

    if (suggestionError) {
      return { success: false, error: formatSupabaseNetworkError(suggestionError) };
    }

    if (!suggestion) {
      return { success: false, error: "Suggestion not found." };
    }

    const researchResult = await captureStockResearchWithGemini(
      suggestion as StockSuggestion,
    );

    if (!researchResult.success) {
      return researchResult;
    }

    const captured = researchResult.data;
    const researcherName = displayName(profile.full_name, profile.email);

    const { data: savedResearch, error: saveError } = await supabase
      .from("stock_suggestion_research")
      .upsert(
        {
          suggestion_id: suggestionId,
          score_value: captured.score_value,
          score_revenue: captured.score_revenue,
          score_growth: captured.score_growth,
          score_profitability: captured.score_profitability,
          score_balance_sheet: captured.score_balance_sheet,
          score_risk: captured.score_risk,
          composite_score: captured.composite_score,
          data_coverage: captured.data_coverage,
          analysis_detail: captured.analysis_detail,
          robinhood_recommendation: captured.robinhood_recommendation,
          schwab_recommendation: captured.schwab_recommendation,
          fidelity_recommendation: captured.fidelity_recommendation,
          conclusion: captured.conclusion,
          researched_by: profile.id,
          researcher_name: researcherName,
        },
        { onConflict: "suggestion_id" },
      )
      .select("*")
      .single();

    if (saveError) {
      return { success: false, error: formatSupabaseNetworkError(saveError) };
    }

    const { error: suggestionUpdateError } = await supabase.rpc(
      "update_stock_suggestion_composite_score",
      {
        p_suggestion_id: suggestionId,
        p_composite_score: captured.composite_score,
      },
    );

    if (suggestionUpdateError) {
      return {
        success: false,
        error: formatSupabaseNetworkError(suggestionUpdateError),
      };
    }

    revalidatePath("/equity-selection");

    return {
      success: true,
      data: savedResearch as StockSuggestionResearch,
      message: `Research captured for ${suggestion.ticker}.`,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function upvoteStockSuggestion(
  suggestionId: string,
): Promise<EquitySelectionActionResult<StockSuggestionVote>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!suggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();
    const { data: existingVote, error: lookupError } = await supabase
      .from("stock_suggestion_votes")
      .select("id")
      .eq("suggestion_id", suggestionId)
      .eq("voter_id", profile.id)
      .maybeSingle();

    if (lookupError) {
      return { success: false, error: formatSupabaseNetworkError(lookupError) };
    }

    if (existingVote) {
      return {
        success: false,
        error: "You have already upvoted this stock suggestion.",
      };
    }

    const { data: suggestion, error: suggestionError } = await supabase
      .from("stock_suggestions")
      .select("id")
      .eq("id", suggestionId)
      .maybeSingle();

    if (suggestionError) {
      return { success: false, error: formatSupabaseNetworkError(suggestionError) };
    }

    if (!suggestion) {
      return { success: false, error: "Suggestion not found." };
    }

    const { data, error } = await supabase
      .from("stock_suggestion_votes")
      .insert({
        suggestion_id: suggestionId,
        voter_id: profile.id,
        voter_name: displayName(profile.full_name, profile.email),
      })
      .select("*")
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/equity-selection");

    return {
      success: true,
      data: data as StockSuggestionVote,
      message: "Upvote recorded.",
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function removeStockSuggestionVote(
  suggestionId: string,
): Promise<EquitySelectionActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!suggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();
    const { data: existingVote, error: lookupError } = await supabase
      .from("stock_suggestion_votes")
      .select("id")
      .eq("suggestion_id", suggestionId)
      .eq("voter_id", profile.id)
      .maybeSingle();

    if (lookupError) {
      return { success: false, error: formatSupabaseNetworkError(lookupError) };
    }

    if (!existingVote) {
      return {
        success: false,
        error: "You have not upvoted this stock suggestion.",
      };
    }

    const { error } = await supabase
      .from("stock_suggestion_votes")
      .delete()
      .eq("id", existingVote.id)
      .eq("voter_id", profile.id);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/equity-selection");

    return {
      success: true,
      message: "Upvote removed.",
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function listVotesForSuggestion(
  suggestionId: string,
): Promise<EquitySelectionActionResult<StockSuggestionVote[]>> {
  if (!suggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stock_suggestion_votes")
      .select("*")
      .eq("suggestion_id", suggestionId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true, data: data as StockSuggestionVote[] };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function removeStockSuggestion(
  suggestionId: string,
): Promise<EquitySelectionActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!suggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();

    if (!isAdministrator(profile)) {
      const { data: existing, error: lookupError } = await supabase
        .from("stock_suggestions")
        .select("suggested_by")
        .eq("id", suggestionId)
        .maybeSingle();

      if (lookupError) {
        return { success: false, error: formatSupabaseNetworkError(lookupError) };
      }

      if (!existing) {
        return { success: false, error: "Suggestion not found." };
      }

      if (existing.suggested_by !== profile.id) {
        return {
          success: false,
          error: "You can only remove suggestions you added.",
        };
      }
    }

    const { error } = await supabase
      .from("stock_suggestions")
      .delete()
      .eq("id", suggestionId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/equity-selection");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

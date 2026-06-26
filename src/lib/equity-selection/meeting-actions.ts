"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";
import { formatSupabaseNetworkError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  EquitySelectionMeeting,
  EquitySelectionMeetingResearch,
  EquitySelectionMeetingSummary,
  EquitySelectionMeetingVote,
} from "@/lib/types/equity-selection-meeting";
import {
  meetingResearchToStockSuggestionResearch,
  meetingSuggestionToStockSuggestion,
  meetingVoteToStockSuggestionVote,
} from "@/lib/types/equity-selection-meeting";
import type {
  StockSuggestion,
  StockSuggestionResearch,
  StockSuggestionVote,
} from "@/lib/types/equity-selection";

export type MeetingActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

type LiveSuggestionRow = {
  id: string;
  ticker: string;
  company_name: string;
  sector: string;
  current_price: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  suggested_by: string;
  suggester_name: string;
  recommendation_reason: string;
  research_composite_score: number | null;
  created_at: string;
  stock_suggestion_research:
    | StockSuggestionResearch
    | StockSuggestionResearch[]
    | null;
  stock_suggestion_votes:
    | Array<{
        id: string;
        suggestion_id: string;
        voter_id: string;
        voter_name: string;
        created_at: string;
      }>
    | null;
};

type MeetingSuggestionRow = {
  id: string;
  meeting_id: string;
  source_suggestion_id: string | null;
  ticker: string;
  company_name: string;
  sector: string;
  current_price: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  suggested_by: string;
  suggester_name: string;
  recommendation_reason: string;
  research_composite_score: number | null;
  created_at: string;
  equity_selection_meeting_votes?: Array<{ count: number }> | null;
};

async function assertAdministrator(): Promise<MeetingActionResult | null> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!isAdministrator(profile)) {
    return { success: false, error: "Administrator access required." };
  }

  return null;
}

function revalidateMeetingPaths(meetingId?: string) {
  revalidatePath("/equity-selection");
  revalidatePath("/equity-selection/history");

  if (meetingId) {
    revalidatePath(`/equity-selection/history/${meetingId}`);
  }
}

function normalizeResearch(
  research: LiveSuggestionRow["stock_suggestion_research"],
): StockSuggestionResearch | null {
  if (!research) {
    return null;
  }

  return Array.isArray(research) ? (research[0] ?? null) : research;
}

export async function saveMeeting(): Promise<
  MeetingActionResult<EquitySelectionMeeting>
> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    const supabase = await createClient();
    const { data: liveSuggestions, error: loadError } = await supabase
      .from("stock_suggestions")
      .select(
        "*, stock_suggestion_research(*), stock_suggestion_votes(id, suggestion_id, voter_id, voter_name, created_at)",
      )
      .order("created_at", { ascending: false });

    if (loadError) {
      return { success: false, error: formatSupabaseNetworkError(loadError) };
    }

    const suggestions = (liveSuggestions ?? []) as LiveSuggestionRow[];

    if (suggestions.length === 0) {
      return {
        success: false,
        error: "Add at least one stock suggestion before saving the meeting.",
      };
    }

    const totalVotes = suggestions.reduce(
      (sum, suggestion) => sum + (suggestion.stock_suggestion_votes?.length ?? 0),
      0,
    );

    const { data: meeting, error: meetingError } = await supabase
      .from("equity_selection_meetings")
      .insert({
        created_by: profile.id,
        suggestion_count: suggestions.length,
        vote_count: totalVotes,
      })
      .select("*")
      .single();

    if (meetingError || !meeting) {
      return {
        success: false,
        error: formatSupabaseNetworkError(meetingError),
      };
    }

    const meetingId = meeting.id as string;

    for (const suggestion of suggestions) {
      const { data: meetingSuggestion, error: suggestionError } = await supabase
        .from("equity_selection_meeting_suggestions")
        .insert({
          meeting_id: meetingId,
          source_suggestion_id: suggestion.id,
          ticker: suggestion.ticker,
          company_name: suggestion.company_name,
          sector: suggestion.sector,
          current_price: suggestion.current_price,
          pe_ratio: suggestion.pe_ratio,
          dividend_yield: suggestion.dividend_yield,
          suggested_by: suggestion.suggested_by,
          suggester_name: suggestion.suggester_name,
          recommendation_reason: suggestion.recommendation_reason,
          research_composite_score: suggestion.research_composite_score,
          created_at: suggestion.created_at,
        })
        .select("id")
        .single();

      if (suggestionError || !meetingSuggestion) {
        await supabase
          .from("equity_selection_meetings")
          .delete()
          .eq("id", meetingId);
        return {
          success: false,
          error: formatSupabaseNetworkError(suggestionError),
        };
      }

      const meetingSuggestionId = meetingSuggestion.id as string;
      const research = normalizeResearch(suggestion.stock_suggestion_research);

      if (research) {
        const { error: researchError } = await supabase
          .from("equity_selection_meeting_research")
          .insert({
            meeting_suggestion_id: meetingSuggestionId,
            score_value: research.score_value,
            score_revenue: research.score_revenue,
            score_growth: research.score_growth,
            score_profitability: research.score_profitability,
            score_balance_sheet: research.score_balance_sheet,
            score_risk: research.score_risk,
            composite_score: research.composite_score,
            data_coverage: research.data_coverage,
            analysis_detail: research.analysis_detail,
            analyst_trends: research.analyst_trends,
            yahoo_insights: research.yahoo_insights,
            robinhood_recommendation: research.robinhood_recommendation,
            schwab_recommendation: research.schwab_recommendation,
            fidelity_recommendation: research.fidelity_recommendation,
            conclusion: research.conclusion,
            researched_by: research.researched_by,
            researcher_name: research.researcher_name,
            created_at: research.created_at,
            updated_at: research.updated_at,
          });

        if (researchError) {
          await supabase
            .from("equity_selection_meetings")
            .delete()
            .eq("id", meetingId);
          return {
            success: false,
            error: formatSupabaseNetworkError(researchError),
          };
        }
      }

      const votes = suggestion.stock_suggestion_votes ?? [];

      if (votes.length > 0) {
        const { error: votesError } = await supabase
          .from("equity_selection_meeting_votes")
          .insert(
            votes.map((vote) => ({
              meeting_suggestion_id: meetingSuggestionId,
              voter_id: vote.voter_id,
              voter_name: vote.voter_name,
              created_at: vote.created_at,
            })),
          );

        if (votesError) {
          await supabase
            .from("equity_selection_meetings")
            .delete()
            .eq("id", meetingId);
          return {
            success: false,
            error: formatSupabaseNetworkError(votesError),
          };
        }
      }
    }

    const { error: clearError } = await supabase
      .from("stock_suggestions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (clearError) {
      await supabase
        .from("equity_selection_meetings")
        .delete()
        .eq("id", meetingId);
      return {
        success: false,
        error: formatSupabaseNetworkError(clearError),
      };
    }

    revalidateMeetingPaths(meetingId);

    return {
      success: true,
      data: meeting as EquitySelectionMeeting,
      message: "Meeting saved. Equity selections have been cleared for the next cycle.",
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function listMeetings(): Promise<
  MeetingActionResult<EquitySelectionMeetingSummary[]>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equity_selection_meetings")
      .select("*")
      .eq("is_active", true)
      .order("saved_at", { ascending: false });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return {
      success: true,
      data: (data ?? []) as EquitySelectionMeetingSummary[],
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function getMeeting(
  meetingId: string,
): Promise<MeetingActionResult<EquitySelectionMeeting>> {
  if (!meetingId) {
    return { success: false, error: "Meeting is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equity_selection_meetings")
      .select("*")
      .eq("id", meetingId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    if (!data) {
      return { success: false, error: "Meeting not found." };
    }

    return { success: true, data: data as EquitySelectionMeeting };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function listMeetingSuggestions(
  meetingId: string,
): Promise<MeetingActionResult<StockSuggestion[]>> {
  if (!meetingId) {
    return { success: false, error: "Meeting is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equity_selection_meeting_suggestions")
      .select("*, equity_selection_meeting_votes(count)")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return {
      success: true,
      data: ((data ?? []) as MeetingSuggestionRow[]).map((row) => {
        const { equity_selection_meeting_votes, ...suggestion } = row;
        const voteCount = equity_selection_meeting_votes?.[0]?.count ?? 0;
        return meetingSuggestionToStockSuggestion(suggestion, { voteCount });
      }),
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function getMeetingSuggestionResearch(
  meetingSuggestionId: string,
): Promise<MeetingActionResult<StockSuggestionResearch | null>> {
  if (!meetingSuggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equity_selection_meeting_research")
      .select("*")
      .eq("meeting_suggestion_id", meetingSuggestionId)
      .maybeSingle();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    if (!data) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: meetingResearchToStockSuggestionResearch(
        data as EquitySelectionMeetingResearch,
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function listVotesForMeetingSuggestion(
  meetingSuggestionId: string,
): Promise<MeetingActionResult<StockSuggestionVote[]>> {
  if (!meetingSuggestionId) {
    return { success: false, error: "Suggestion is required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equity_selection_meeting_votes")
      .select("*")
      .eq("meeting_suggestion_id", meetingSuggestionId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return {
      success: true,
      data: ((data ?? []) as EquitySelectionMeetingVote[]).map(
        meetingVoteToStockSuggestionVote,
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function inactivateMeeting(
  meetingId: string,
): Promise<MeetingActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!meetingId) {
    return { success: false, error: "Meeting is required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("equity_selection_meetings")
      .update({ is_active: false })
      .eq("id", meetingId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidateMeetingPaths(meetingId);

    return {
      success: true,
      message: "Meeting inactivated.",
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function deleteMeeting(
  meetingId: string,
): Promise<MeetingActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!meetingId) {
    return { success: false, error: "Meeting is required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("equity_selection_meetings")
      .delete()
      .eq("id", meetingId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidateMeetingPaths();

    return {
      success: true,
      message: "Meeting deleted.",
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

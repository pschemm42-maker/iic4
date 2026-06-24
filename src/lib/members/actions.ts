"use server";

import { revalidatePath } from "next/cache";
import { formatSupabaseNetworkError } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  isAdministrator,
  requireAuth,
} from "@/lib/auth/session";
import type { UserProfile } from "@/lib/types/user";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function listMembers(): Promise<ActionResult<UserProfile[]>> {
  await requireAuth();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("status", "disabled")
      .order("full_name", { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true, data: data as UserProfile[] };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function updateAbout(about: string): Promise<ActionResult> {
  const user = await requireAuth();

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ about: about.trim() })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update about.",
    };
  }
}

export async function updateMemberProfile(
  memberId: string,
  fields: { position?: string; basis?: string | null },
): Promise<ActionResult> {
  const profile = await getCurrentProfile();

  if (!isAdministrator(profile)) {
    return { success: false, error: "Administrator access required." };
  }

  try {
    const supabase = createAdminClient();
    const update: Record<string, unknown> = {};

    if (fields.position !== undefined) {
      update.position = fields.position.trim();
    }

    if (fields.basis !== undefined) {
      if (fields.basis === null || fields.basis === "") {
        update.basis = null;
      } else {
        const parsed = parseFloat(fields.basis.replace(/[^0-9.-]/g, ""));
        if (isNaN(parsed)) {
          return { success: false, error: "Basis must be a valid dollar amount." };
        }
        update.basis = parsed;
      }
      update.basis_last_edited = new Date().toISOString();
    }

    if (Object.keys(update).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", memberId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/members");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update member profile.",
    };
  }
}

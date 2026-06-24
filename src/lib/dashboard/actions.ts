"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { formatSupabaseNetworkError } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DashboardMessage } from "@/lib/types/dashboard-message";

export type DashboardActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const MAX_MESSAGE_LENGTH = 2000;

function displayName(fullName: string, email: string) {
  const trimmed = fullName.trim();
  if (trimmed) {
    return trimmed;
  }

  return email.split("@")[0] || email;
}

function parseMessageBody(value: FormDataEntryValue | null) {
  const body = String(value ?? "").trim();

  if (!body) {
    return { success: false as const, error: "Message cannot be empty." };
  }

  if (body.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false as const,
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  return { success: true as const, data: body };
}

export async function listDashboardMessages(): Promise<
  DashboardActionResult<DashboardMessage[]>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dashboard_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true, data: (data ?? []) as DashboardMessage[] };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function addDashboardMessage(
  formData: FormData,
): Promise<DashboardActionResult<DashboardMessage>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = parseMessageBody(formData.get("body"));
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dashboard_messages")
      .insert({
        body: parsed.data,
        author_id: profile.id,
        author_name: displayName(profile.full_name, profile.email),
      })
      .select("*")
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/dashboard");
    return { success: true, data: data as DashboardMessage };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function updateDashboardMessage(
  messageId: string,
  formData: FormData,
): Promise<DashboardActionResult<DashboardMessage>> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  const parsed = parseMessageBody(formData.get("body"));
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dashboard_messages")
      .update({ body: parsed.data })
      .eq("id", messageId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/dashboard");
    return { success: true, data: data as DashboardMessage };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function deleteDashboardMessage(
  messageId: string,
): Promise<DashboardActionResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("dashboard_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

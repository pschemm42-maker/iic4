"use server";

import { revalidatePath } from "next/cache";
import {
  formatSupabaseNetworkError,
  getSiteUrl,
  getSupabaseConfigError,
  hasAdminCredentials,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, isAdministrator } from "@/lib/auth/session";
import {
  USER_ROLES,
  type UserFormInput,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from "@/lib/types/user";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function getInviteRedirectUrl() {
  return `${getSiteUrl()}/auth/confirm?next=/auth/set-password`;
}

function parseUserForm(formData: FormData): UserFormInput | null {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "user") as UserRole;

  if (!email || !fullName) {
    return null;
  }

  if (!USER_ROLES.includes(role)) {
    return null;
  }

  return { email, fullName, role };
}

async function assertAdministrator(): Promise<ActionResult | null> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { success: false, error: "You must be signed in." };
  }

  if (!isAdministrator(profile)) {
    return { success: false, error: "Administrator access required." };
  }

  return null;
}

export async function listUsers(): Promise<ActionResult<UserProfile[]>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  const configError = getSupabaseConfigError();
  if (configError) {
    return { success: false, error: configError };
  }

  if (!hasAdminCredentials()) {
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to manage users.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

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

export async function inviteUser(
  formData: FormData,
): Promise<ActionResult<UserProfile>> {
  const input = parseUserForm(formData);

  if (!input) {
    return { success: false, error: "Email, name, and role are required." };
  }

  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  const configError = getSupabaseConfigError();
  if (configError) {
    return { success: false, error: configError };
  }

  if (!hasAdminCredentials()) {
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to invite users.",
    };
  }

  try {
    const supabase = createAdminClient();
    const redirectTo = getInviteRedirectUrl();

    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(input.email, {
        data: {
          full_name: input.fullName,
          role: input.role,
        },
        redirectTo,
      });

    if (inviteError) {
      return { success: false, error: inviteError.message };
    }

    const userId = inviteData.user?.id;

    if (!userId) {
      return { success: false, error: "Invite sent but user id was missing." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: input.email,
          full_name: input.fullName,
          role: input.role,
          status: "invited",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    revalidatePath("/users");

    return { success: true, data: profile as UserProfile };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseNetworkError(error),
    };
  }
}

export async function updateUser(
  userId: string,
  formData: FormData,
): Promise<ActionResult<UserProfile>> {
  const input = parseUserForm(formData);

  if (!input) {
    return { success: false, error: "Name and role are required." };
  }

  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!hasAdminCredentials()) {
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to update users.",
    };
  }

  try {
    const supabase = createAdminClient();

    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          full_name: input.fullName,
          role: input.role,
        },
      },
    );

    if (authError) {
      return { success: false, error: authError.message };
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: input.fullName,
        role: input.role,
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/users");
    revalidatePath(`/users/${userId}/edit`);

    return { success: true, data: data as UserProfile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user.",
    };
  }
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus,
): Promise<ActionResult<UserProfile>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!hasAdminCredentials()) {
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to update users.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/users");

    return { success: true, data: data as UserProfile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update user status.",
    };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!hasAdminCredentials()) {
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to delete users.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    revalidatePath("/users");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user.",
    };
  }
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!hasAdminCredentials()) {
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to resend invites.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "User not found." };
    }

    const { error } = await supabase.auth.admin.inviteUserByEmail(
      profile.email,
      {
        data: {
          full_name: profile.full_name,
          role: profile.role,
        },
        redirectTo: getInviteRedirectUrl(),
      },
    );

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    await supabase
      .from("profiles")
      .update({ status: "invited" })
      .eq("id", userId);

    revalidatePath("/users");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resend invite.",
    };
  }
}

export async function markUserActive(userId: string): Promise<ActionResult> {
  if (!hasAdminCredentials()) {
    return {
      success: false,
      error: "Missing admin credentials.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to activate user.",
    };
  }
}

export async function getUser(userId: string): Promise<ActionResult<UserProfile>> {
  const authError = await assertAdministrator();
  if (authError) {
    return authError;
  }

  if (!hasAdminCredentials()) {
    return {
      success: false,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to manage users.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true, data: data as UserProfile };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load user.",
    };
  }
}

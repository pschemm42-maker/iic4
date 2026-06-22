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

function getPasswordResetRedirectUrl() {
  return `${getSiteUrl()}/auth/confirm?next=/auth/set-password`;
}

async function assertAdminWithCredentials(): Promise<
  ActionResult | { supabase: ReturnType<typeof createAdminClient> }
> {
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

  return { supabase: createAdminClient() };
}

async function upsertUserProfile(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  input: UserFormInput,
  status: UserStatus,
) {
  return supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: input.email,
        full_name: input.fullName,
        role: input.role,
        status,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
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

export async function createUser(
  formData: FormData,
): Promise<ActionResult<UserProfile>> {
  const input = parseUserForm(formData);

  if (!input) {
    return { success: false, error: "Email, name, and role are required." };
  }

  const adminResult = await assertAdminWithCredentials();
  if ("success" in adminResult) {
    return adminResult;
  }

  try {
    const { supabase } = adminResult;
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email: input.email,
        email_confirm: false,
        user_metadata: {
          full_name: input.fullName,
          role: input.role,
        },
      });

    if (createError) {
      return { success: false, error: createError.message };
    }

    const userId = createData.user?.id;

    if (!userId) {
      return { success: false, error: "User was created but id was missing." };
    }

    const { data: profile, error: profileError } = await upsertUserProfile(
      supabase,
      userId,
      input,
      "pending",
    );

    if (profileError) {
      const message = profileError.message.includes("invalid input value for enum")
        ? "Database migration required: run supabase/migrations/013_user_status_pending.sql in Supabase."
        : profileError.message;
      return { success: false, error: message };
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

export async function inviteUser(
  formData: FormData,
): Promise<ActionResult<UserProfile>> {
  const input = parseUserForm(formData);

  if (!input) {
    return { success: false, error: "Email, name, and role are required." };
  }

  const adminResult = await assertAdminWithCredentials();
  if ("success" in adminResult) {
    return adminResult;
  }

  try {
    const { supabase } = adminResult;
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

    const { data: profile, error: profileError } = await upsertUserProfile(
      supabase,
      userId,
      input,
      "invited",
    );

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

export async function sendInvite(userId: string): Promise<ActionResult> {
  const adminResult = await assertAdminWithCredentials();
  if ("success" in adminResult) {
    return adminResult;
  }

  try {
    const { supabase } = adminResult;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, role, status")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "User not found." };
    }

    if (profile.status === "active") {
      return {
        success: false,
        error: "This user has already joined. Use reset password instead.",
      };
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
    revalidatePath(`/users/${userId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send invite.",
    };
  }
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  return sendInvite(userId);
}

export async function inviteAllPendingUsers(): Promise<
  ActionResult<{ invitedCount: number }>
> {
  const adminResult = await assertAdminWithCredentials();
  if ("success" in adminResult) {
    return adminResult;
  }

  try {
    const { supabase } = adminResult;
    const { data: pendingUsers, error: listError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (listError) {
      if (listError.message.includes("invalid input value for enum")) {
        return {
          success: false,
          error:
            "Database migration required: run supabase/migrations/013_user_status_pending.sql in Supabase.",
        };
      }

      return { success: false, error: formatSupabaseNetworkError(listError) };
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      return {
        success: false,
        error: "No pending members to invite.",
      };
    }

    let invitedCount = 0;
    const errors: string[] = [];

    for (const pendingUser of pendingUsers) {
      const result = await sendInvite(pendingUser.id);

      if (result.success) {
        invitedCount += 1;
        continue;
      }

      if (result.error) {
        errors.push(`${pendingUser.email}: ${result.error}`);
      }
    }

    revalidatePath("/users");

    if (invitedCount === 0) {
      return {
        success: false,
        error: errors[0] ?? "Failed to send invites.",
      };
    }

    return { success: true, data: { invitedCount } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to invite pending members.",
    };
  }
}

export async function sendPasswordReset(userId: string): Promise<ActionResult> {
  const adminResult = await assertAdminWithCredentials();
  if ("success" in adminResult) {
    return adminResult;
  }

  try {
    const { supabase } = adminResult;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, status")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "User not found." };
    }

    if (profile.status !== "active") {
      return {
        success: false,
        error: "Send an invite first so the user can set their password.",
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });

    if (error) {
      return { success: false, error: formatSupabaseNetworkError(error) };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send password reset.",
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

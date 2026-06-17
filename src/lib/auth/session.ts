import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/user";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as UserProfile | null;
}

export function isAdministrator(profile: UserProfile | null) {
  return profile?.role === "administrator";
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export async function requireAdministrator() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();

  if (!isAdministrator(profile)) {
    redirect("/dashboard");
  }

  return { user, profile: profile! };
}

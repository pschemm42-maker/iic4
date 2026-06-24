import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function getRedirectTarget(request: NextRequest, next: string) {
  const redirectTo = request.nextUrl.clone();
  const nextUrl = new URL(next, request.nextUrl.origin);
  redirectTo.pathname = nextUrl.pathname;
  redirectTo.search = nextUrl.search;
  return redirectTo;
}

function authErrorRedirect(request: NextRequest, next: string) {
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next.includes("reset-password")
    ? "/auth/reset-password"
    : "/auth/set-password";
  redirectTo.search = "error=auth";
  return NextResponse.redirect(redirectTo);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/auth/set-password";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(getRedirectTarget(request, next));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(getRedirectTarget(request, next));
    }
  }

  return authErrorRedirect(request, next);
}

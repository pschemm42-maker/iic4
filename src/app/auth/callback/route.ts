import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (!code) {
    const confirmUrl = request.nextUrl.clone();
    confirmUrl.pathname = "/auth/confirm";
    return NextResponse.redirect(confirmUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    const redirectTo = request.nextUrl.clone();
    redirectTo.pathname = next;
    redirectTo.searchParams.delete("code");
    redirectTo.searchParams.delete("next");
    return NextResponse.redirect(redirectTo);
  }

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/auth/set-password";
  redirectTo.search = "error=auth";
  return NextResponse.redirect(redirectTo);
}

export function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  // Ignore placeholder values copied from .env.example
  if (key === "your-service-role-key") {
    return "";
  }

  return key;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasAdminCredentials() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getFinnhubApiKey() {
  const key = process.env.FINNHUB_API_KEY?.trim() || "";

  if (key === "your-finnhub-api-key") {
    return "";
  }

  return key;
}

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function isPlaceholderSupabaseUrl(url: string) {
  return url.includes("your-project-ref.supabase.co");
}

export function getSupabaseConfigError(): string | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return "Missing Supabase URL or anon key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.";
  }

  if (isPlaceholderSupabaseUrl(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL still uses the placeholder value. Copy your real project URL from the Supabase dashboard.";
  }

  if (anonKey === "your-anon-key") {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY still uses the placeholder value. Copy your real anon key from the Supabase dashboard.";
  }

  return null;
}

export function formatSupabaseNetworkError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("Could not find the table")) {
    if (message.includes("portfolio_holdings")) {
      return 'The "portfolio_holdings" table is missing. Run supabase/migrations/002_portfolio_holdings.sql in the Supabase SQL Editor, then try again.';
    }

    return 'The "profiles" table is missing. Run supabase/migrations/001_user_profiles.sql in the Supabase SQL Editor, then try again.';
  }

  if (message.includes("fetch failed")) {
    return "Could not reach Supabase. Restart the dev server with `npm run dev` and confirm your Supabase URL and keys in .env.local.";
  }

  return message;
}

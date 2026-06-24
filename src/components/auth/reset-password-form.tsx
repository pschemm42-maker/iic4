"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthStatus = "verifying" | "ready" | "needs_link" | "error";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<AuthStatus>(
    searchParams.get("error") === "auth" ? "error" : "verifying",
  );
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth"
      ? "Your reset link is invalid or expired. Request a new one from the sign-in page."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    function markReady() {
      if (mounted) {
        setStatus("ready");
        setError(null);
      }
    }

    async function establishSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        markReady();
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeError) {
          markReady();
          window.history.replaceState({}, "", "/auth/reset-password");
          return;
        }
      }

      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!sessionError) {
            markReady();
            window.history.replaceState({}, "", "/auth/reset-password");
            return;
          }
        }
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (tokenHash && type) {
        const confirmUrl = new URL("/auth/confirm", window.location.origin);
        confirmUrl.searchParams.set("token_hash", tokenHash);
        confirmUrl.searchParams.set("type", type);
        confirmUrl.searchParams.set("next", "/auth/reset-password");
        window.location.href = confirmUrl.toString();
        return;
      }

      if (mounted) {
        setStatus("needs_link");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        markReady();
      }
    });

    establishSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Your session expired. Request a new reset link from the sign-in page.");
      setStatus("needs_link");
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/auth/login?reset=1");
  }

  if (status === "verifying") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Verifying your reset link...
      </p>
    );
  }

  if (status === "needs_link") {
    return (
      <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
        <p>We could not verify your reset link on this page.</p>
        <p>Request a new reset link from the sign-in page and try again.</p>
        <Link
          href="/auth/forgot-password"
          className="inline-block font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          New password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Confirm new password
        </span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-[#0C1929] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#16263d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

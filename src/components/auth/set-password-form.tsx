"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markUserActive } from "@/lib/users/actions";

type AuthStatus = "verifying" | "ready" | "needs_link" | "error";

export function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<AuthStatus>(
    searchParams.get("error") === "auth" ? "error" : "verifying",
  );
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth"
      ? "Your invite link is invalid or expired. Ask an administrator to resend it."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function establishSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        if (mounted) {
          setStatus("ready");
          setError(null);
        }
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeError) {
          if (mounted) {
            setStatus("ready");
            setError(null);
          }
          window.history.replaceState({}, "", "/auth/set-password");
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
            if (mounted) {
              setStatus("ready");
              setError(null);
            }
            window.history.replaceState({}, "", "/auth/set-password");
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
        confirmUrl.searchParams.set("next", "/auth/set-password");
        window.location.href = confirmUrl.toString();
        return;
      }

      if (mounted) {
        setStatus("needs_link");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) {
        setStatus("ready");
        setError(null);
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
    const userId = session?.user.id;

    if (!userId) {
      setError("Your session expired. Open the invite link from your email again.");
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

    await markUserActive(userId);
    await supabase.auth.signOut();
    router.push("/auth/login?welcome=1");
  }

  if (status === "verifying") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Verifying your invite...
      </p>
    );
  }

  if (status === "needs_link") {
    return (
      <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
        <p>We could not verify your invite on this page.</p>
        <p>
          Open the invite link from your email again, or ask an administrator to
          resend the invite.
        </p>
        <Link
          href="/auth/login"
          className="inline-block font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
        >
          Back to sign in
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
          href="/auth/login"
          className="inline-block text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Confirm password
        </span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
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
        {isSubmitting ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}

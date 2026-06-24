"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const redirectTo = new URL("/auth/confirm", window.location.origin);
      redirectTo.searchParams.set("next", "/auth/reset-password");

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: redirectTo.toString() },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          If an account exists for that email, a password reset link is on its
          way. Check your inbox and follow the link to set a new password.
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
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none ring-teal-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          placeholder="member@example.com"
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#0C1929] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#16263d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending..." : "Send reset link"}
      </button>

      <Link
        href="/auth/login"
        className="text-center text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
      >
        Back to sign in
      </Link>
    </form>
  );
}

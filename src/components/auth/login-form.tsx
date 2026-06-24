"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const welcome = searchParams.get("welcome") === "1";
  const reset = searchParams.get("reset") === "1";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Invalid email or password. If you were invited, make sure you set your password first."
            : signInError.message,
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {reset ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}

      {welcome ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Your password was saved. Sign in to access the club.
        </p>
      ) : null}

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

      <label className="grid gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Password</span>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-teal-700 hover:text-teal-600 dark:text-teal-400"
          >
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
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
        disabled={isPending}
        className="rounded-lg bg-[#0C1929] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#16263d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Invited members receive an email to set their password before signing in.
      </p>
    </form>
  );
}

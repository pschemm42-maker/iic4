import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

async function getSupabaseStatus() {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
    } as const;
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    return {
      configured: true,
      connected: !error,
    } as const;
  } catch {
    return {
      configured: true,
      connected: false,
    } as const;
  }
}

export default async function Home() {
  const supabase = await getSupabaseStatus();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <main className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
          Next.js + Supabase + Vercel
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          IIC4
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Your application foundation is ready. Connect Supabase, build your
          features, and deploy to Vercel when you are ready.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <dt className="text-sm text-zinc-500">Framework</dt>
            <dd className="mt-1 font-medium text-zinc-950 dark:text-zinc-50">
              Next.js App Router
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <dt className="text-sm text-zinc-500">Database</dt>
            <dd className="mt-1 font-medium text-zinc-950 dark:text-zinc-50">
              Supabase (Postgres)
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <dt className="text-sm text-zinc-500">Supabase env</dt>
            <dd className="mt-1 font-medium text-zinc-950 dark:text-zinc-50">
              {supabase.configured ? "Configured" : "Not configured"}
            </dd>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <dt className="text-sm text-zinc-500">Supabase client</dt>
            <dd className="mt-1 font-medium text-zinc-950 dark:text-zinc-50">
              {supabase.configured
                ? supabase.connected
                  ? "Connected"
                  : "Check credentials"
                : "Add .env.local"}
            </dd>
          </div>
        </dl>

        {!supabase.configured ? (
          <div className="mt-8 rounded-xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Copy <code className="font-mono">.env.example</code> to{" "}
            <code className="font-mono">.env.local</code> and add your Supabase
            project URL and anon key from the Supabase dashboard.
          </div>
        ) : null}
      </main>
    </div>
  );
}

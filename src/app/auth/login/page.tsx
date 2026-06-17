import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/brand/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Sign in to your account"
      description="Access your Independent Investment Club IV member dashboard."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

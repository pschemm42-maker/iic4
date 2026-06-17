import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/brand/auth-shell";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SetPasswordPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Set your password"
      description="Create a password to finish setting up your member account."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <SetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

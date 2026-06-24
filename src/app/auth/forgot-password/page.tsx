import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/brand/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we'll send you a link to set a new password."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

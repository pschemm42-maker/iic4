import { Suspense } from "react";
import { AuthShell } from "@/components/brand/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Choose a new password for your member account."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

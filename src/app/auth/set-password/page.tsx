import { Suspense } from "react";
import { AuthShell } from "@/components/brand/auth-shell";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export default function SetPasswordPage() {
  return (
    <AuthShell
      title="Set your password"
      description="Create your password to access your member account."
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <SetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

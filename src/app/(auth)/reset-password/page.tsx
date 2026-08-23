import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password" subtitle="Choose something you'll remember.">
      <ResetPasswordForm />
    </AuthCard>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LogInForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

const notices: Record<string, string> = {
  link_expired: "That link has expired. Request a new one below.",
};

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-ink-950 underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LogInForm notice={error ? notices[error] : undefined} />
    </AuthCard>
  );
}

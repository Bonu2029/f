import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/signup-form";
import { getPlan, type PlanId } from "@/config/pricing";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planParam } = await searchParams;
  const plan = getPlan(planParam);

  return (
    <AuthCard
      title={`Create your ${brand.name} account`}
      subtitle={`${plan.name} · $${plan.price}/month · ${plan.tagLimit} tags. You can change plans later.`}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-ink-950 underline underline-offset-4"
          >
            Log In
          </Link>
        </>
      }
    >
      <SignUpForm plan={plan.id as PlanId} />
    </AuthCard>
  );
}

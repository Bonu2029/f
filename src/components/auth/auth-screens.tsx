"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Apple, ArrowLeft, Check, Mail, Store, User } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useMarketplace } from "@/lib/store";
import { FEATURES } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Authentication.
 *
 * The screens are complete and the session model is real, but no credential is
 * ever checked here — `FEATURES.supabaseAuth` is false, and the forms say so
 * rather than pretending. Wiring Supabase Auth means replacing `submit()` with
 * `supabase.auth.signInWithPassword` and keeping everything else.
 */

function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Logo size={26} />
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.035em] text-ink">{title}</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>

        {footer && <div className="pb-4 text-center text-[13.5px] text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}

function SocialButtons({ onUse }: { onUse: () => void }) {
  return (
    <div className="grid gap-2">
      <Button variant="outline" size="lg" fullWidth onClick={onUse} icon={<Apple className="h-4.5 w-4.5" />}>
        Continue with Apple
      </Button>
      <Button variant="outline" size="lg" fullWidth onClick={onUse} icon={<span className="text-[15px] font-bold">G</span>}>
        Continue with Google
      </Button>
    </div>
  );
}

export function LoginScreen() {
  const { signIn } = useMarketplace();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("maya@example.demo");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    // Demo sign-in: the email decides which demo account you land in.
    const role = email.includes("admin") ? "admin" : email.includes("luxe") ? "business" : "customer";
    signIn(role);
    toast({ title: "Signed in", description: `Demo ${role} account.`, tone: "success" });
    router.push(role === "business" ? "/dashboard" : role === "admin" ? "/admin" : "/");
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your bookings."
      footer={
        <>
          New to NOW?{" "}
          <Link href="/auth/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </>
      }
    >
      <SocialButtons onUse={() => { signIn("customer"); router.push("/"); }} />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] text-ink-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Any password works in the demo"
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/auth/forgot-password" className="text-[13.5px] font-medium text-brand-600 hover:text-brand-700">
          Forgot your password?
        </Link>
      </div>

      {!FEATURES.supabaseAuth && (
        <p className="mt-6 rounded-xl bg-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-muted">
          This prototype doesn&rsquo;t verify credentials. Use <strong>maya@example.demo</strong> for the
          customer demo, <strong>hello@luxenailstudio.demo</strong> for the business demo, or{" "}
          <strong>admin@booknow.demo</strong> for the admin console.
        </p>
      )}
    </AuthLayout>
  );
}

export function SignupScreen() {
  const { signIn } = useMarketplace();
  const router = useRouter();
  const [accountType, setAccountType] = useState<"customer" | "business" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 550));
    setLoading(false);
    if (accountType === "business") {
      router.push("/for-business/onboarding");
      return;
    }
    signIn("customer");
    router.push("/");
  }

  if (!accountType) {
    return (
      <AuthLayout
        title="Create your account"
        subtitle="First — what brings you to NOW?"
        footer={
          <>
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </>
        }
      >
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setAccountType("customer")}
            className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand-300 hover:shadow-card"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <User className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15.5px] font-semibold text-ink">I want to book services</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">
                Find haircuts, nails, cleaning and more with real availability near you.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("business")}
            className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand-300 hover:shadow-card"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Store className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15.5px] font-semibold text-ink">I own or work at a business</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">
                Turn empty appointment slots into paying customers.
              </span>
            </span>
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={accountType === "business" ? "Set up your business" : "Create your account"}
      subtitle={
        accountType === "business"
          ? "We'll take you through your listing next."
          : "It takes about thirty seconds."
      }
      footer={
        <button
          type="button"
          onClick={() => setAccountType(null)}
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          ← Choose a different account type
        </button>
      }
    >
      <SocialButtons onUse={() => { signIn("customer"); router.push("/"); }} />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] text-ink-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label={accountType === "business" ? "Your name" : "Full name"} htmlFor="signup-name">
          <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="signup-email">
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" htmlFor="signup-password" hint="At least 8 characters.">
          <Input id="signup-password" type="password" autoComplete="new-password" />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={loading}>
          {accountType === "business" ? "Continue to business setup" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-muted">
        By continuing you agree to the{" "}
        <Link href="/legal/terms" className="underline">Terms of Service</Link> and{" "}
        <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <Link href="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Card className="p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-live-50 text-live-500">
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
          <p className="mt-3 text-[15.5px] font-semibold text-ink">Check your inbox</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">
            If an account exists for {email || "that address"}, a reset link is on its way.
          </p>
        </Card>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="space-y-4"
        >
          <Field label="Email" htmlFor="reset-email">
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Button type="submit" size="lg" fullWidth icon={<Mail className="h-4 w-4" />}>
            Send reset link
          </Button>
        </form>
      )}

      <p className={cn("mt-6 rounded-xl bg-sunken px-3.5 py-3 text-[12.5px] text-ink-muted", sent && "mt-4")}>
        No email is sent in this prototype. Password reset runs through Supabase Auth in production.
      </p>
    </AuthLayout>
  );
}

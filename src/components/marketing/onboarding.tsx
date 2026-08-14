"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/primitives";
import { useMarketplace } from "@/lib/store";
import { CATEGORIES } from "@/lib/data/categories";
import { DAY_NAMES } from "@/lib/time";
import { formatCents } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Business onboarding.
 *
 * Eight steps, each one a real form backed by the same shapes the dashboard
 * uses. Nothing is written to the marketplace at the end of the prototype
 * flow — the final screen says so and hands you the working demo account.
 */

const STEPS = [
  "Business",
  "Photos",
  "Services",
  "Team",
  "Hours",
  "Availability",
  "Payments",
  "Verification",
] as const;

interface DraftService {
  name: string;
  duration: number;
  price: number;
  description: string;
}

interface DraftMember {
  name: string;
  role: string;
}

export function OnboardingScreen() {
  const router = useRouter();
  const { signIn } = useMarketplace();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [about, setAbout] = useState("");

  const [services, setServices] = useState<DraftService[]>([
    { name: "", duration: 45, price: 50, description: "" },
  ]);
  const [team, setTeam] = useState<DraftMember[]>([{ name: "", role: "Owner" }]);
  const [hours, setHours] = useState(
    DAY_NAMES.map((_, day) => ({
      day,
      open: "09:00",
      close: "18:00",
      closed: day === 0,
    })),
  );
  const [autoFill, setAutoFill] = useState(true);
  const [instantBook, setInstantBook] = useState(true);
  const [leadTime, setLeadTime] = useState(60);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else setDone(true);
  }

  if (done) {
    return (
      <Shell step={STEPS.length - 1} progress={100}>
        <div className="py-6 text-center">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 250, damping: 18 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-live-500 text-white"
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.span>
          <h1 className="mt-5 text-[26px] font-bold tracking-[-0.03em] text-ink">
            {name || "Your business"} is ready to list
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
            In production this submits your listing for verification and opens your dashboard. In this
            prototype, nothing is written to the live marketplace — but the full business dashboard is
            right here with realistic data.
          </p>

          <Card className="mx-auto mt-6 max-w-md p-4 text-left">
            <p className="text-[13px] font-semibold text-ink-soft">What you set up</p>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-ink-muted">
              <li>· {name || "Unnamed business"} — {CATEGORIES.find((c) => c.slug === category)?.name}</li>
              <li>· {services.filter((s) => s.name).length || 1} services</li>
              <li>· {team.filter((t) => t.name).length || 1} team members</li>
              <li>· {hours.filter((h) => !h.closed).length} trading days</li>
              <li>· Auto-fill cancellations {autoFill ? "on" : "off"}</li>
            </ul>
          </Card>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              size="lg"
              onClick={() => {
                signIn("business");
                router.push("/dashboard");
              }}
            >
              Open the business dashboard
            </Button>
            <ButtonLink href="/" size="lg" variant="outline">
              Back to NOW
            </ButtonLink>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell step={step} progress={progress}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <StepBody title="Business information" subtitle="How you'll appear on NOW.">
              <Field label="Business name" htmlFor="ob-name" required>
                <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Luxe Nail Studio" />
              </Field>
              <Field label="Category" htmlFor="ob-category" required>
                <Select id="ob-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" htmlFor="ob-phone" required>
                  <Input id="ob-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(215) 555-0100" />
                </Field>
                <Field label="Email" htmlFor="ob-email" required>
                  <Input id="ob-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
              </div>
              <Field label="Address" htmlFor="ob-address" required>
                <Input id="ob-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1824 Spruce Street, Philadelphia PA" />
              </Field>
              <Field label="Website" htmlFor="ob-website">
                <Input id="ob-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="optional" />
              </Field>
              <Field label="About" htmlFor="ob-about" hint="Two or three sentences. What makes you worth booking?">
                <Textarea id="ob-about" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
              </Field>
            </StepBody>
          )}

          {step === 1 && (
            <StepBody title="Photos" subtitle="A logo, a cover and a few shots of your work.">
              <div className="grid gap-4 sm:grid-cols-2">
                <UploadTile label="Logo" hint="Square, at least 400×400" />
                <UploadTile label="Cover photo" hint="Wide, at least 1600×600" />
              </div>
              <Field label="Gallery" hint="Up to 12 photos of your space and your work.">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line bg-sunken/40 text-ink-muted transition hover:border-brand-300"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </Field>
              <p className="rounded-xl bg-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-muted">
                Image uploads aren&rsquo;t connected in this prototype. Listings render a generated
                colourway until real photos are attached.
              </p>
            </StepBody>
          )}

          {step === 2 && (
            <StepBody title="Services" subtitle="What can people book, how long does it take, what does it cost?">
              <div className="space-y-3">
                {services.map((service, i) => (
                  <Card key={i} className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-ink-soft">Service {i + 1}</p>
                      {services.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove service ${i + 1}`}
                          onClick={() => setServices(services.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Field label="Name" htmlFor={`svc-${i}-name`}>
                      <Input
                        id={`svc-${i}-name`}
                        value={service.name}
                        onChange={(e) =>
                          setServices(services.map((s, idx) => (idx === i ? { ...s, name: e.target.value } : s)))
                        }
                        placeholder="Gel Manicure"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Duration (min)" htmlFor={`svc-${i}-duration`}>
                        <Input
                          id={`svc-${i}-duration`}
                          type="number"
                          min={5}
                          step={5}
                          value={service.duration}
                          onChange={(e) =>
                            setServices(
                              services.map((s, idx) =>
                                idx === i ? { ...s, duration: Number(e.target.value) } : s,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Price ($)" htmlFor={`svc-${i}-price`}>
                        <Input
                          id={`svc-${i}-price`}
                          type="number"
                          min={0}
                          value={service.price}
                          onChange={(e) =>
                            setServices(
                              services.map((s, idx) => (idx === i ? { ...s, price: Number(e.target.value) } : s)),
                            )
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Description" htmlFor={`svc-${i}-description`}>
                      <Textarea
                        id={`svc-${i}-description`}
                        rows={2}
                        value={service.description}
                        onChange={(e) =>
                          setServices(
                            services.map((s, idx) => (idx === i ? { ...s, description: e.target.value } : s)),
                          )
                        }
                      />
                    </Field>
                  </Card>
                ))}
              </div>
              <Button
                variant="outline"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setServices([...services, { name: "", duration: 45, price: 50, description: "" }])}
              >
                Add another service
              </Button>
            </StepBody>
          )}

          {step === 3 && (
            <StepBody title="Team members" subtitle="Who takes appointments? Customers can pick a person or let NOW choose.">
              <div className="space-y-3">
                {team.map((member, i) => (
                  <Card key={i} className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-ink-soft">Team member {i + 1}</p>
                      {team.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove team member ${i + 1}`}
                          onClick={() => setTeam(team.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Name" htmlFor={`team-${i}-name`}>
                        <Input
                          id={`team-${i}-name`}
                          value={member.name}
                          onChange={(e) =>
                            setTeam(team.map((t, idx) => (idx === i ? { ...t, name: e.target.value } : t)))
                          }
                        />
                      </Field>
                      <Field label="Role" htmlFor={`team-${i}-role`}>
                        <Input
                          id={`team-${i}-role`}
                          value={member.role}
                          onChange={(e) =>
                            setTeam(team.map((t, idx) => (idx === i ? { ...t, role: e.target.value } : t)))
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Services offered">
                      <div className="rounded-xl border border-line px-3 py-1">
                        {services.map((s, si) => (
                          <Checkbox
                            key={si}
                            checked
                            onChange={() => {}}
                            label={s.name || `Service ${si + 1}`}
                          />
                        ))}
                      </div>
                    </Field>
                  </Card>
                ))}
              </div>
              <Button
                variant="outline"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setTeam([...team, { name: "", role: "Stylist" }])}
              >
                Add another person
              </Button>
            </StepBody>
          )}

          {step === 4 && (
            <StepBody title="Business hours" subtitle="When are you open? You can change this any time.">
              <div className="space-y-2">
                {hours.map((h) => (
                  <div key={h.day} className="flex flex-wrap items-center gap-2">
                    <span className="w-[92px] shrink-0 text-[13.5px] font-medium text-ink">
                      {DAY_NAMES[h.day]}
                    </span>
                    {h.closed ? (
                      <span className="flex-1 text-[13.5px] text-ink-muted">Closed</span>
                    ) : (
                      <>
                        <Input
                          type="time"
                          aria-label={`${DAY_NAMES[h.day]} opening`}
                          value={h.open}
                          onChange={(e) =>
                            setHours(hours.map((x) => (x.day === h.day ? { ...x, open: e.target.value } : x)))
                          }
                          className="h-9 w-[120px] text-[13.5px]"
                        />
                        <span className="text-ink-muted">–</span>
                        <Input
                          type="time"
                          aria-label={`${DAY_NAMES[h.day]} closing`}
                          value={h.close}
                          onChange={(e) =>
                            setHours(hours.map((x) => (x.day === h.day ? { ...x, close: e.target.value } : x)))
                          }
                          className="h-9 w-[120px] text-[13.5px]"
                        />
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setHours(hours.map((x) => (x.day === h.day ? { ...x, closed: !x.closed } : x)))
                      }
                    >
                      {h.closed ? "Open" : "Close"}
                    </Button>
                  </div>
                ))}
              </div>
            </StepBody>
          )}

          {step === 5 && (
            <StepBody title="Availability" subtitle="How NOW should sell your empty time.">
              <Card className="divide-y divide-line-soft px-4">
                <Switch
                  checked={instantBook}
                  onChange={setInstantBook}
                  label="Instant booking"
                  description="Customers book without waiting for you to approve each request."
                />
                <Switch
                  checked={autoFill}
                  onChange={setAutoFill}
                  label="Auto-fill cancellations"
                  description="When a booking is cancelled, republish that time to the marketplace immediately."
                />
              </Card>
              <Field label="Minimum lead time" htmlFor="ob-lead" hint="How soon before a slot starts can someone still book it?">
                <Select id="ob-lead" value={leadTime} onChange={(e) => setLeadTime(Number(e.target.value))}>
                  {[30, 60, 120, 240].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </Select>
              </Field>
              <Card className="p-4">
                <p className="text-[13.5px] font-semibold text-ink">Calendar sync</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  Two-way sync with Google Calendar, Square, Fresha, Vagaro, Booksy and Mindbody is on the
                  roadmap.{" "}
                  <Link href="/integrations" className="font-medium text-brand-600 underline">
                    See integrations
                  </Link>
                </p>
                <Badge tone="neutral" className="mt-2">Coming soon</Badge>
              </Card>
            </StepBody>
          )}

          {step === 6 && (
            <StepBody title="Payments" subtitle="Where should NOW send your money?">
              <Card className="p-4">
                <p className="text-[14.5px] font-semibold text-ink">Connect a payout account</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  NOW collects payment when a customer books and pays you out weekly. Payouts run through
                  Stripe Connect in production.
                </p>
                <Button variant="outline" className="mt-3" disabled>
                  Connect Stripe account
                </Button>
                <Badge tone="neutral" className="ml-2">Not connected in the prototype</Badge>
              </Card>

              <Card className="p-4">
                <p className="text-[14.5px] font-semibold text-ink">What you keep</p>
                <dl className="mt-3 space-y-2 text-[13.5px]">
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Example booking</dt>
                    <dd className="tabular-nums text-ink">{formatCents(6000, { showCents: false })}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">NOW commission (12%)</dt>
                    <dd className="tabular-nums text-ink">−{formatCents(720)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line-soft pt-2 font-semibold">
                    <dt className="text-ink">Your payout</dt>
                    <dd className="tabular-nums text-ink">{formatCents(5280)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[12px] text-ink-muted">
                  Commission applies only to bookings NOW brings you. Bookings you take yourself are free.
                </p>
              </Card>
            </StepBody>
          )}

          {step === 7 && (
            <StepBody title="Verification" subtitle="A few checks before your listing goes live.">
              <Card className="divide-y divide-line-soft">
                {[
                  ["Business registration", "Upload your registration or trading licence."],
                  ["Phone", "We'll send a code to the number you listed."],
                  ["Email", "Confirm the address on your account."],
                  ["Address", "A utility bill or lease confirming your location."],
                  ["Identity", "Government ID for the account owner."],
                ].map(([label, body]) => (
                  <div key={label} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink">{label}</p>
                      <p className="text-[12.5px] text-ink-muted">{body}</p>
                    </div>
                    <Badge tone="neutral">Pending</Badge>
                  </div>
                ))}
              </Card>

              <p className="rounded-xl bg-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-muted">
                Documents are not collected in this prototype and no business is actually verified here.
                Only the fictional demo businesses display a verified badge.
              </p>

              <Checkbox
                checked={acceptedTerms}
                onChange={setAcceptedTerms}
                label={
                  <>
                    I agree to the{" "}
                    <Link href="/legal/business-terms" className="font-medium text-brand-600 underline">
                      Business Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/legal/privacy" className="font-medium text-brand-600 underline">
                      Privacy Policy
                    </Link>
                    .
                  </>
                }
              />
            </StepBody>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-7 flex gap-2">
        {step > 0 && (
          <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button
          fullWidth
          size="lg"
          onClick={next}
          disabled={step === STEPS.length - 1 && !acceptedTerms}
          trailing={<ArrowRight className="h-4 w-4" />}
        >
          {step === STEPS.length - 1 ? "Submit for review" : "Continue"}
        </Button>
      </div>
    </Shell>
  );
}

function Shell({
  step,
  progress,
  children,
}: {
  step: number;
  progress: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3.5 pt-safe sm:px-6">
          <Link href="/for-business" aria-label="NOW for business">
            <Logo size={26} />
          </Link>
          <span className="text-[13px] font-medium text-ink-muted">
            Step {Math.min(step + 1, STEPS.length)} of {STEPS.length} · {STEPS[Math.min(step, STEPS.length - 1)]}
          </span>
          <Link href="/" className="ml-auto text-[13px] text-ink-muted hover:text-ink">
            Exit
          </Link>
        </div>
        <div className="h-1 w-full bg-line">
          <div
            className="h-full bg-brand-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-2xl px-4 py-7 sm:px-6">
        {children}
        <div className="h-8" />
      </main>
    </div>
  );
}

function StepBody({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-ink">{title}</h1>
      <p className="mt-1 text-[14px] text-ink-muted">{subtitle}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

function UploadTile({ label, hint }: { label: string; hint: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">{label}</p>
      <button
        type="button"
        className={cn(
          "flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line bg-sunken/40 text-ink-muted transition hover:border-brand-300",
        )}
      >
        <Plus className="h-5 w-5" />
        <span className="text-[12.5px]">{hint}</span>
      </button>
    </div>
  );
}

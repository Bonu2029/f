import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { roleAtLeast, type MemberRole } from '@afd/shared';
import { getServerSupabase, getServiceSupabase } from '@/lib/supabase/server';
import { adminEnv } from '@/lib/env';
import { errors } from '@/lib/errors';

/**
 * Tenant context resolution and authorisation.
 *
 * DEFENCE IN DEPTH. Three independent layers protect tenant data:
 *
 *   1. Postgres RLS — the database itself refuses cross-tenant rows.
 *   2. This module — every server entry point resolves the caller's membership
 *      and role before touching data, and never accepts an organization_id from
 *      the request body.
 *   3. Route handlers and Server Actions call `requireRole()` explicitly for
 *      privileged operations.
 *
 * A request that omits layer 2 or 3 is still stopped by layer 1.
 */

export interface Membership {
  organizationId: string;
  role: MemberRole;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: string;
  timezone: string;
  aiPaused: boolean;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  isDemo: boolean;
}

export interface SessionContext {
  user: User;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  memberships: Membership[];
  /** The organisation being acted on for this request. */
  active: Membership;
  isPlatformAdmin: boolean;
}

/**
 * Reads the signed-in user, or null. Cached per request so a page tree with
 * several server components makes one auth round trip.
 */
async function getUserFresh(): Promise<User | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export const getUser = cache(getUserFresh);

/**
 * Resolves the caller's full context. Returns null when signed out or when the
 * user has no organisation yet.
 *
 * The active organisation is chosen server-side (first membership, owner
 * organisations first). It is never taken from a query string or header, so a
 * user cannot switch into an organisation they do not belong to.
 */
async function loadSessionContext(): Promise<SessionContext | null> {
  const user = await getUserFresh();
  if (!user) return null;

  const supabase = await getServerSupabase();

  const [{ data: profile }, { data: memberRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('organization_members')
      .select(
        'role, organization:organizations(id, name, slug, status, timezone, ai_paused, onboarding_step, onboarding_completed_at, is_demo)',
      )
      .eq('user_id', user.id),
  ]);

  type Row = {
    role: MemberRole;
    organization: {
      id: string;
      name: string;
      slug: string;
      status: string;
      timezone: string;
      ai_paused: boolean;
      onboarding_step: number;
      onboarding_completed_at: string | null;
      is_demo: boolean;
    } | null;
  };

  const memberships: Membership[] = ((memberRows ?? []) as unknown as Row[])
    .filter((r): r is Row & { organization: NonNullable<Row['organization']> } => Boolean(r.organization))
    .map((r) => ({
      organizationId: r.organization.id,
      role: r.role,
      organizationName: r.organization.name,
      organizationSlug: r.organization.slug,
      organizationStatus: r.organization.status,
      timezone: r.organization.timezone,
      aiPaused: r.organization.ai_paused,
      onboardingStep: r.organization.onboarding_step,
      onboardingCompletedAt: r.organization.onboarding_completed_at,
      isDemo: r.organization.is_demo,
    }))
    .sort((a, b) => {
      const rank = { owner: 0, admin: 1, staff: 2 } as const;
      return rank[a.role] - rank[b.role] || a.organizationName.localeCompare(b.organizationName);
    });

  const active = memberships[0];
  if (!active) return null;

  return {
    user,
    profile: profile ?? {
      id: user.id,
      first_name: null,
      last_name: null,
      email: user.email ?? '',
      avatar_url: null,
    },
    memberships,
    active,
    isPlatformAdmin: adminEnv.isAdmin(user.email),
  };
}

/**
 * Per-request memoised context. Several Server Components rendering in one
 * request share a single set of queries.
 */
export const getSessionContext = cache(loadSessionContext);

/**
 * Re-reads the context, bypassing the request cache.
 *
 * Needed exactly once: after creating an organisation mid-request. `cache()`
 * memoises per request, so calling `getSessionContext()` again would return the
 * `null` captured *before* the organisation existed — the rows are really
 * there, and the page still concludes the business could not be created.
 * Use this only after a write that changes the answer.
 */
export async function getSessionContextFresh(): Promise<SessionContext | null> {
  return loadSessionContext();
}

/** Redirects to sign-in when there is no session. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Requires a session with an organisation. Sends users without one to the
 * organisation-creation step rather than a dead end.
 */
export async function requireSession(): Promise<SessionContext> {
  const user = await getUser();
  if (!user) redirect('/login');
  const ctx = await getSessionContext();
  if (!ctx) redirect('/onboarding/start');
  return ctx;
}

/**
 * Requires a minimum role in the active organisation. Throws AppError rather
 * than redirecting, so API routes and Server Actions surface a precise message.
 */
export async function requireRole(minimum: MemberRole): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!roleAtLeast(ctx.active.role, minimum)) {
    throw errors.forbidden(
      minimum === 'owner' ? 'change billing or ownership' : 'change these settings',
    );
  }
  return ctx;
}

/**
 * Verifies that the signed-in user is a member of a specific organisation with
 * at least `minimum` role. Use this whenever an id arrives from the client —
 * it is the check that stops horizontal privilege escalation.
 */
export async function assertOrgAccess(
  organizationId: string,
  minimum: MemberRole = 'staff',
): Promise<SessionContext & { membership: Membership }> {
  const ctx = await requireSession();
  const membership = ctx.memberships.find((m) => m.organizationId === organizationId);
  if (!membership) throw errors.notFound('That organization');
  if (!roleAtLeast(membership.role, minimum)) throw errors.forbidden('perform that action');
  return { ...ctx, active: membership, membership };
}

/** Platform super-admin gate. Server-side only — never a hidden URL. */
export async function requirePlatformAdmin(): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/login');
  if (!adminEnv.isAdmin(user.email)) {
    // Deliberately a 404-style redirect so the admin area is not discoverable.
    redirect('/dashboard');
  }
  return user;
}

export async function isPlatformAdmin(): Promise<boolean> {
  const user = await getUser();
  return adminEnv.isAdmin(user?.email);
}

/**
 * Subscription gate used by features that consume paid resources.
 * Read through the service client so a `staff` member (who cannot read billing
 * detail) still gets a correct answer without widening their RLS access.
 */
export async function getSubscriptionState(organizationId: string) {
  const svc = getServiceSupabase();
  const { data } = await svc
    .from('subscriptions')
    .select('plan, status, included_minutes, used_minutes, billing_period_end, founder, founder_slot, cancel_at_period_end, stripe_customer_id')
    .eq('organization_id', organizationId)
    .maybeSingle();
  return data ?? null;
}

export function isServiceable(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

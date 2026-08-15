'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  loginSchema,
  requestResetSchema,
  signupSchema,
  updatePasswordSchema,
} from '@afd/shared';
import { getServerSupabase } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/env';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { actionError, actionOk, errors, type ActionResult } from '@/lib/errors';
import { log } from '@/lib/logger';

/**
 * Authentication server actions.
 *
 * Rate limits are keyed on IP + email so credential stuffing against one
 * account cannot be hidden behind a rotating email list, and enumeration is
 * avoided by returning the same message whether or not an account exists.
 */

export async function signupAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<{ verified: boolean }>> {
  try {
    const ip = clientIp(await headers());
    await enforceRateLimit('signup', ip);

    const input = signupSchema.parse({
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      password: formData.get('password'),
      business_name: formData.get('business_name'),
      accept_terms: formData.get('accept_terms') === 'on',
    });

    const supabase = await getServerSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: absoluteUrl('/auth/callback?next=/onboarding/start'),
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          business_name: input.business_name,
        },
      },
    });

    if (error) {
      // Supabase returns a generic error for an existing address when email
      // confirmations are on; surface something the user can act on either way.
      if (/already registered|already exists/i.test(error.message)) {
        return actionError(
          errors.conflict(
            'An account already exists for that email. Sign in instead, or reset your password.',
          ),
        );
      }
      log.warn('signup failed', { event: 'auth.signup_failed', error: error.message });
      return actionError(errors.validation(error.message, { email: error.message }));
    }

    // A session here means email confirmation is disabled on the project.
    if (data.session) return actionOk({ verified: true });
    return actionOk({ verified: false });
  } catch (err) {
    return actionError(err);
  }
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult<{ ok: boolean }>> {
  try {
    const email = String(formData.get('email') ?? '').toLowerCase();
    const ip = clientIp(await headers());
    await enforceRateLimit('login', `${ip}:${email}`);

    const input = loginSchema.parse({ email, password: formData.get('password') });

    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      log.info('login rejected', { event: 'auth.login_rejected' });
      if (/email not confirmed/i.test(error.message)) {
        return actionError(
          errors.validation(
            'Confirm your email address first. Check your inbox for the verification link.',
          ),
        );
      }
      return actionError(
        errors.validation('That email and password combination is not correct.', {
          password: 'Incorrect email or password',
        }),
      );
    }

    return actionOk({ ok: true });
  } catch (err) {
    return actionError(err);
  }
}

export async function requestPasswordResetAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ip = clientIp(await headers());
    await enforceRateLimit('passwordReset', ip);

    const { email } = requestResetSchema.parse({ email: formData.get('email') });
    const supabase = await getServerSupabase();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: absoluteUrl('/auth/callback?next=/reset-password/new'),
    });

    // Always the same response — never reveal whether an account exists.
    return actionOk(undefined, 'If an account exists for that address, a reset link is on its way.');
  } catch (err) {
    return actionError(err);
  }
}

export async function updatePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input = updatePasswordSchema.parse({
      password: formData.get('password'),
      confirm: formData.get('confirm'),
    });

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return actionError(errors.unauthenticated());

    const { error } = await supabase.auth.updateUser({ password: input.password });
    if (error) return actionError(errors.validation(error.message, { password: error.message }));

    return actionOk(undefined, 'Your password has been updated.');
  } catch (err) {
    return actionError(err);
  }
}

export async function signOutAction(): Promise<void> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}

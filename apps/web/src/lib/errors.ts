import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Application error taxonomy.
 *
 * Every error carries a stable machine `code`, an HTTP status, and a message
 * written for the person reading it — never "Something went wrong". Where a
 * problem is fixable by the user, `action` tells them exactly what to do and
 * `actionHref` links straight to the page that fixes it.
 */

export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'rate_limited'
  | 'subscription_required'
  | 'subscription_past_due'
  | 'plan_limit_reached'
  | 'founder_slots_exhausted'
  | 'provider_unavailable'
  | 'provider_not_configured'
  | 'calendar_disconnected'
  | 'phone_provisioning_failed'
  | 'payment_failed'
  | 'upload_rejected'
  | 'token_invalid'
  | 'token_expired'
  | 'internal_error';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 422,
  conflict: 409,
  rate_limited: 429,
  subscription_required: 402,
  subscription_past_due: 402,
  plan_limit_reached: 402,
  founder_slots_exhausted: 409,
  provider_unavailable: 503,
  provider_not_configured: 503,
  calendar_disconnected: 409,
  phone_provisioning_failed: 502,
  payment_failed: 402,
  upload_rejected: 400,
  token_invalid: 400,
  token_expired: 410,
  internal_error: 500,
};

export interface AppErrorOptions {
  /** What the user can do about it. */
  action?: string;
  /** Where to go to fix it. */
  actionHref?: string;
  /** Field-level messages for form errors. */
  fields?: Record<string, string>;
  /** Non-user-facing detail for logs. */
  detail?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly action?: string;
  readonly actionHref?: string;
  readonly fields?: Record<string, string>;
  readonly detail?: unknown;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    if (options.action) this.action = options.action;
    if (options.actionHref) this.actionHref = options.actionHref;
    if (options.fields) this.fields = options.fields;
    if (options.detail !== undefined) this.detail = options.detail;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.action ? { action: this.action } : {}),
        ...(this.actionHref ? { actionHref: this.actionHref } : {}),
        ...(this.fields ? { fields: this.fields } : {}),
      },
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Named constructors for the errors users actually see                        */
/* -------------------------------------------------------------------------- */

export const errors = {
  unauthenticated: () =>
    new AppError('unauthenticated', 'You need to sign in to do that.', {
      action: 'Sign in',
      actionHref: '/login',
    }),

  forbidden: (what = 'do that') =>
    new AppError('forbidden', `Your role does not allow you to ${what}.`, {
      action: 'Ask an owner or admin on your team to make the change.',
    }),

  notFound: (what = 'That record') =>
    new AppError('not_found', `${what} could not be found. It may have been deleted.`),

  validation: (message: string, fields?: Record<string, string>) =>
    new AppError('validation_failed', message, fields ? { fields } : {}),

  rateLimited: (retryAfterSeconds: number) =>
    new AppError('rate_limited', `Too many attempts. Try again in ${retryAfterSeconds} seconds.`, {
      detail: { retryAfterSeconds },
    }),

  subscriptionRequired: () =>
    new AppError('subscription_required', 'This needs an active subscription.', {
      action: 'Choose a plan',
      actionHref: '/dashboard/billing',
    }),

  subscriptionPastDue: () =>
    new AppError(
      'subscription_past_due',
      'Your last payment did not go through, so this feature is on hold.',
      { action: 'Update your payment method', actionHref: '/dashboard/billing' },
    ),

  founderSlotsExhausted: () =>
    new AppError(
      'founder_slots_exhausted',
      'All 50 Founding Member spots have been claimed. You can still sign up on the standard plan.',
      { action: 'See standard pricing', actionHref: '/pricing' },
    ),

  calendarDisconnected: () =>
    new AppError(
      'calendar_disconnected',
      'Your Google Calendar connection has expired, so availability cannot be checked.',
      { action: 'Reconnect Google Calendar', actionHref: '/dashboard/settings/calendar' },
    ),

  phoneProvisioningFailed: (reason: string) =>
    new AppError(
      'phone_provisioning_failed',
      `No number was purchased and you have not been charged. ${reason}`,
      { action: 'Try a different area code', actionHref: '/dashboard/settings/phone' },
    ),

  providerNotConfigured: (provider: string, feature: string) =>
    new AppError(
      'provider_not_configured',
      `${provider} is not configured on this deployment, so ${feature} is unavailable.`,
      { action: 'Check the environment variables listed in SETUP.md.' },
    ),

  providerUnavailable: (provider: string) =>
    new AppError(
      'provider_unavailable',
      `${provider} is not responding right now. Nothing was changed — please try again in a moment.`,
    ),

  uploadRejected: (reason: string) => new AppError('upload_rejected', reason),

  tokenInvalid: () =>
    new AppError('token_invalid', 'That upload link is not valid. Ask for a new link to be sent.'),

  tokenExpired: () =>
    new AppError(
      'token_expired',
      'That upload link has expired. Reply to the text message and we will send a new one.',
    ),

  conflict: (message: string) => new AppError('conflict', message),

  internal: (detail?: unknown) =>
    new AppError('internal_error', 'Something failed on our side. The team has been notified.', {
      detail: detail ?? {},
    }),
};

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    const first = err.issues[0];
    return new AppError('validation_failed', first?.message ?? 'Some fields need attention.', {
      fields,
    });
  }

  if (err instanceof Error && err.name === 'MissingEnvError') {
    return new AppError('provider_not_configured', err.message);
  }

  return new AppError('internal_error', 'Something failed on our side. The team has been notified.', {
    cause: err,
    detail: err instanceof Error ? { name: err.name, message: err.message } : { value: String(err) },
  });
}

/** Turns any thrown value into a well-formed JSON error response. */
export function errorResponse(err: unknown, requestId?: string): NextResponse {
  const appError = toAppError(err);
  const body = appError.toJSON();
  const headers: Record<string, string> = {};
  if (requestId) headers['x-request-id'] = requestId;
  if (appError.code === 'rate_limited') {
    const retry = (appError.detail as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
    if (retry) headers['retry-after'] = String(retry);
  }
  return NextResponse.json(
    requestId ? { ...body, request_id: requestId } : body,
    { status: appError.status, headers },
  );
}

/** Shape returned by Server Actions so forms can render precise messages. */
export interface ActionResult<T = unknown> {
  ok: boolean;
  message?: string;
  code?: ErrorCode;
  action?: string;
  actionHref?: string;
  fields?: Record<string, string>;
  data?: T;
}

export function actionOk<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, ...(data !== undefined ? { data } : {}), ...(message ? { message } : {}) };
}

export function actionError(err: unknown): ActionResult<never> {
  const e = toAppError(err);
  return {
    ok: false,
    message: e.message,
    code: e.code,
    ...(e.action ? { action: e.action } : {}),
    ...(e.actionHref ? { actionHref: e.actionHref } : {}),
    ...(e.fields ? { fields: e.fields } : {}),
  };
}

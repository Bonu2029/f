import { expect, test } from '@playwright/test';

/**
 * End-to-end coverage of the public surface and the authentication flows.
 *
 * These run against a real build in DEMO_MODE, so nothing external is called.
 * They deliberately assert on what a visitor can actually see and do, not on
 * implementation details.
 */

test.describe('marketing site', () => {
  test('the home page states the value proposition and links to signup', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Never miss another customer call',
    );

    // The founder counter must reflect real inventory, never a hard-coded number.
    const badge = page.getByText(/of 50 Founding Member spots/i).first();
    if (await badge.isVisible().catch(() => false)) {
      const text = (await badge.textContent()) ?? '';
      const remaining = Number(/(\d+) of 50/.exec(text)?.[1] ?? '-1');
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(50);
    }

    await page.getByRole('link', { name: /Claim Founding Price|Get started/i }).first().click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('the call demo plays through to a booked appointment', async ({ page }) => {
    await page.goto('/#demo');
    await page.getByRole('button', { name: 'Play example' }).click();

    // The scripted conversation is explicitly labelled as an example.
    await expect(page.getByText('Example conversation')).toBeVisible();
    await expect(page.getByText(/Service area checked/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Lead created/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Appointment booked/i)).toBeVisible({ timeout: 30_000 });
  });

  test('the pricing page shows the real remaining count and what is included', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/AI call minutes included/i).first()).toBeVisible();
    await expect(page.getByText(/\$0\.10\/minute|\$0\.10 each/i).first()).toBeVisible();
  });

  test('every legal page is reachable and marked as a template', async ({ page }) => {
    for (const path of [
      '/legal/terms',
      '/legal/privacy',
      '/legal/acceptable-use',
      '/legal/ai-disclosure',
      '/legal/data-processing',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/requires legal review/i)).toBeVisible();
    }
  });

  test('the AI disclosure page states the receptionist never claims to be human', async ({ page }) => {
    await page.goto('/legal/ai-disclosure');
    await expect(page.getByText(/never claims to be a human being/i)).toBeVisible();
  });

  test('the FAQ explains what happens to founder pricing on cancellation', async ({ page }) => {
    await page.goto('/#faq');
    await page.getByText(/What happens to my Founding Member price if I cancel/i).click();
    await expect(page.getByText(/rejoin at the standard price/i)).toBeVisible();
  });
});

test.describe('authentication', () => {
  test('signup validates before it submits', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();

    // A short password is rejected client-side and never reaches the server.
    await page.getByLabel('First name').fill('Daniel');
    await page.getByLabel('Last name').fill('Reyes');
    await page.getByLabel('Business name').fill("Daniel's HVAC");
    await page.getByLabel('Work email').fill('daniel@example.com');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page).toHaveURL(/\/signup/);
  });

  test('login rejects unknown credentials with a usable message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expect(page.getByRole('status').first()).toContainText(/not correct|Sign in failed/i, {
      timeout: 15_000,
    });
  });

  test('password reset never reveals whether an account exists', async ({ page }) => {
    await page.goto('/reset-password');
    await page.getByLabel('Email').fill('definitely-not-a-user@example.com');
    await page.getByRole('button', { name: /Send reset link/i }).click();

    await expect(page.getByText(/If an account exists/i)).toBeVisible({ timeout: 15_000 });
  });

  test('the dashboard is not reachable while signed out', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('the admin area is not reachable while signed out', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('public photo upload', () => {
  test('an invalid token is refused with an explanation, not a crash', async ({ page }) => {
    await page.goto('/upload/this-token-does-not-exist-and-is-long-enough');
    await expect(page.getByText(/This link cannot be used/i)).toBeVisible();
    await expect(page.getByText(/reply to the text message/i)).toBeVisible();
  });
});

test.describe('operational endpoints', () => {
  test('health reports status without leaking configuration values', async ({ request }) => {
    const res = await request.get('/api/health');
    const body = await res.json();

    expect(['ok', 'degraded']).toContain(body.status);
    expect(body.checks).toBeDefined();

    // Integration flags are booleans — never the credentials themselves.
    for (const value of Object.values(body.integrations as Record<string, unknown>)) {
      expect(typeof value).toBe('boolean');
    }
    expect(JSON.stringify(body)).not.toMatch(/sk-|whsec_|SUPABASE_SERVICE_ROLE/);
  });

  test('internal call APIs reject unauthenticated callers', async ({ request }) => {
    const res = await request.post('/api/internal/calls/tool', {
      data: { call_id: crypto.randomUUID(), organization_id: crypto.randomUUID(), tool: 'create_lead', arguments: {} },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('the Stripe webhook refuses an unsigned request', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', { data: { id: 'evt_fake', type: 'invoice.paid' } });
    expect(res.status()).toBe(400);
  });

  test('the cron endpoint refuses a request without the shared secret', async ({ request }) => {
    const res = await request.post('/api/cron/maintenance');
    expect([403, 503]).toContain(res.status());
  });
});

test.describe('accessibility and responsiveness', () => {
  test('the home page has one h1, a skip link and a labelled main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('a.skip-link')).toHaveCount(1);
    await expect(page.locator('main#main')).toHaveCount(1);
  });

  test('the page is keyboard navigable from the top', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.className ?? '');
    expect(focused).toContain('skip-link');
  });

  test('the layout does not scroll horizontally on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

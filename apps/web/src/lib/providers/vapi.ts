import 'server-only';
import { DEMO_PROVIDER_ID_PREFIX } from '@afd/shared';
import { DEMO_MODE, vapiEnv, absoluteUrl } from '@/lib/env';
import { errors } from '@/lib/errors';
import { log } from '@/lib/logger';

/**
 * Vapi client.
 *
 * SECURITY: this module imports `server-only`, so importing it from a client
 * component is a build error. VAPI_API_KEY is read through `env.ts` (also
 * server-only) and never reaches the browser. Every call the product makes to
 * Vapi goes through here — there is no client-side Vapi SDK in this app.
 */

const VAPI_BASE = 'https://api.vapi.ai';

export interface VapiAssistant {
  id: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  provider?: string;
  assistantId?: string | null;
  status?: string;
}

export interface AvailableVapiNumber {
  number: string;
  areaCode: string | null;
  region: string | null;
}

export interface VapiProvider {
  readonly name: string;
  readonly isMock: boolean;
  createAssistant(config: Record<string, unknown>): Promise<VapiAssistant>;
  updateAssistant(assistantId: string, config: Record<string, unknown>): Promise<VapiAssistant>;
  getAssistant(assistantId: string): Promise<VapiAssistant | null>;
  deleteAssistant(assistantId: string): Promise<void>;
  /** Buys a number from Vapi's inventory and attaches it to an assistant. */
  provisionPhoneNumber(input: {
    areaCode?: string | null;
    assistantId: string;
    name: string;
  }): Promise<VapiPhoneNumber>;
  getPhoneNumber(phoneNumberId: string): Promise<VapiPhoneNumber | null>;
  attachAssistant(phoneNumberId: string, assistantId: string): Promise<VapiPhoneNumber>;
  releasePhoneNumber(phoneNumberId: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Live adapter                                                               */
/* -------------------------------------------------------------------------- */

class LiveVapiProvider implements VapiProvider {
  readonly name = 'vapi';
  readonly isMock = false;

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${VAPI_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${vapiEnv.apiKey}`,
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20_000),
        cache: 'no-store',
      });
    } catch (err) {
      log.error('vapi request failed to send', { provider: 'vapi', path, error: err });
      throw errors.providerUnavailable('Vapi');
    }

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const detail =
        (json as { message?: string | string[] } | null)?.message ?? `HTTP ${res.status}`;
      const message = Array.isArray(detail) ? detail.join('; ') : String(detail);

      log.error('vapi returned an error', { provider: 'vapi', path, status: res.status, detail: message });

      if (res.status === 401 || res.status === 403) {
        throw errors.providerNotConfigured('Vapi', 'the AI receptionist — the API key was rejected');
      }
      if (res.status === 404) return null as T;
      if (res.status === 400 || res.status === 422) {
        throw errors.validation(`Vapi rejected the receptionist configuration: ${message}`);
      }
      throw errors.providerUnavailable('Vapi');
    }

    return json as T;
  }

  async createAssistant(config: Record<string, unknown>): Promise<VapiAssistant> {
    const created = await this.request<VapiAssistant>('POST', '/assistant', config);
    if (!created?.id) throw errors.providerUnavailable('Vapi');
    return created;
  }

  async updateAssistant(assistantId: string, config: Record<string, unknown>): Promise<VapiAssistant> {
    const updated = await this.request<VapiAssistant>(
      'PATCH',
      `/assistant/${encodeURIComponent(assistantId)}`,
      config,
    );
    // A 404 arrives here as null: the assistant we recorded has been deleted at
    // Vapi. Reporting that as "Vapi is not responding" would send someone
    // looking for an outage, so it is named for what it is and the caller can
    // create a replacement.
    if (!updated?.id) throw errors.notFound('That assistant at Vapi');
    return updated;
  }

  async getAssistant(assistantId: string): Promise<VapiAssistant | null> {
    return this.request<VapiAssistant | null>('GET', `/assistant/${encodeURIComponent(assistantId)}`);
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.request('DELETE', `/assistant/${encodeURIComponent(assistantId)}`);
  }

  /**
   * Buys a number from Vapi's own inventory. Vapi handles the carrier
   * relationship, so there is no Twilio account in this path.
   */
  async provisionPhoneNumber(input: {
    areaCode?: string | null;
    assistantId: string;
    name: string;
  }): Promise<VapiPhoneNumber> {
    const created = await this.request<VapiPhoneNumber>('POST', '/phone-number', {
      provider: 'vapi',
      ...(input.areaCode ? { numberDesiredAreaCode: input.areaCode } : {}),
      name: input.name.slice(0, 40),
      assistantId: input.assistantId,
      server: {
        url: absoluteUrl('/api/webhooks/vapi'),
        secret: vapiEnv.webhookSecret,
      },
    });
    if (!created?.id) throw errors.phoneProvisioningFailed('Vapi did not return a phone number.');
    return created;
  }

  async getPhoneNumber(phoneNumberId: string): Promise<VapiPhoneNumber | null> {
    return this.request<VapiPhoneNumber | null>(
      'GET',
      `/phone-number/${encodeURIComponent(phoneNumberId)}`,
    );
  }

  async attachAssistant(phoneNumberId: string, assistantId: string): Promise<VapiPhoneNumber> {
    return this.request<VapiPhoneNumber>('PATCH', `/phone-number/${encodeURIComponent(phoneNumberId)}`, {
      assistantId,
    });
  }

  async releasePhoneNumber(phoneNumberId: string): Promise<void> {
    await this.request('DELETE', `/phone-number/${encodeURIComponent(phoneNumberId)}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Development adapter                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Used only when DEMO_MODE=true or no key is configured.
 *
 * It generates stable, obviously-fake identifiers prefixed `demo_` so a demo
 * assistant can never be mistaken for a real one, and every record it produces
 * is flagged as demo data in the database and badged in the UI. It does not
 * pretend a phone number can receive calls.
 */
class MockVapiProvider implements VapiProvider {
  readonly name = 'mock-vapi';
  readonly isMock = true;

  private id(prefix: string): string {
    return `${DEMO_PROVIDER_ID_PREFIX}${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }

  async createAssistant(config: Record<string, unknown>): Promise<VapiAssistant> {
    const id = this.id('asst');
    log.info('[demo] assistant not created in Vapi', {
      provider: 'mock-vapi',
      event: 'assistant.simulated',
      assistant_id: id,
      name: String(config.name ?? ''),
    });
    return { id, name: String(config.name ?? '') };
  }

  async updateAssistant(assistantId: string, config: Record<string, unknown>): Promise<VapiAssistant> {
    log.info('[demo] assistant not updated in Vapi', {
      provider: 'mock-vapi',
      event: 'assistant.simulated_update',
      assistant_id: assistantId,
    });
    return { id: assistantId, name: String(config.name ?? '') };
  }

  async getAssistant(assistantId: string): Promise<VapiAssistant | null> {
    return { id: assistantId };
  }

  async deleteAssistant(): Promise<void> {
    /* nothing exists to delete */
  }

  async provisionPhoneNumber(input: { areaCode?: string | null; assistantId: string }): Promise<VapiPhoneNumber> {
    const area = input.areaCode ?? '215';
    const number = `+1${area}555${String(Math.floor(Math.random() * 9000) + 1000)}`;
    log.info('[demo] phone number not purchased', {
      provider: 'mock-vapi',
      event: 'number.simulated',
      number,
    });
    return { id: this.id('num'), number, provider: 'demo', assistantId: input.assistantId };
  }

  async getPhoneNumber(phoneNumberId: string): Promise<VapiPhoneNumber | null> {
    return { id: phoneNumberId, number: '+12155550000', provider: 'demo' };
  }

  async attachAssistant(phoneNumberId: string, assistantId: string): Promise<VapiPhoneNumber> {
    return { id: phoneNumberId, number: '+12155550000', assistantId };
  }

  async releasePhoneNumber(): Promise<void> {
    /* nothing exists to release */
  }
}

/* -------------------------------------------------------------------------- */

let cached: VapiProvider | null = null;

export function getVapiProvider(): VapiProvider {
  if (cached) return cached;
  cached = DEMO_MODE || !vapiEnv.configured ? new MockVapiProvider() : new LiveVapiProvider();
  return cached;
}

export function __setVapiProviderForTests(p: VapiProvider | null) {
  cached = p;
}

export { LiveVapiProvider, MockVapiProvider };

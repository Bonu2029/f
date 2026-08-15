import 'server-only';
import twilio from 'twilio';
import { DEMO_MODE, twilioEnv, absoluteUrl } from '@/lib/env';
import { errors } from '@/lib/errors';
import { log } from '@/lib/logger';
import type {
  AvailableNumber,
  ProvisionedNumber,
  SearchNumbersInput,
  SendSmsInput,
  SendSmsResult,
  TelephonyProvider,
} from './types';

/* -------------------------------------------------------------------------- */
/* Twilio — the production adapter                                            */
/* -------------------------------------------------------------------------- */

class TwilioTelephonyProvider implements TelephonyProvider {
  readonly name = 'twilio';
  readonly isMock = false;

  private client() {
    return twilio(twilioEnv.accountSid, twilioEnv.authToken);
  }

  async searchAvailableNumbers(input: SearchNumbersInput): Promise<AvailableNumber[]> {
    const country = input.country ?? 'US';
    try {
      const list = await this.client()
        .availablePhoneNumbers(country)
        .local.list({
          ...(input.areaCode ? { areaCode: Number(input.areaCode) } : {}),
          ...(input.contains ? { contains: input.contains } : {}),
          // Only offer numbers that can actually run the receptionist.
          voiceEnabled: true,
          smsEnabled: true,
          limit: input.limit ?? 20,
        });

      return list.map((n) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality ?? null,
        region: n.region ?? null,
        postalCode: n.postalCode ?? null,
        capabilities: {
          voice: Boolean(n.capabilities?.voice),
          sms: Boolean(n.capabilities?.sms),
          mms: Boolean(n.capabilities?.mms),
        },
      }));
    } catch (err) {
      log.error('twilio number search failed', { provider: 'twilio', error: err });
      throw errors.providerUnavailable('Twilio');
    }
  }

  async purchaseNumber(phoneNumber: string, friendlyName: string): Promise<ProvisionedNumber> {
    try {
      const bought = await this.client().incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName,
        smsUrl: absoluteUrl('/api/webhooks/twilio/sms'),
        smsMethod: 'POST',
        statusCallback: absoluteUrl('/api/webhooks/twilio/status'),
      });
      return {
        sid: bought.sid,
        phoneNumber: bought.phoneNumber,
        capabilities: {
          voice: Boolean(bought.capabilities?.voice),
          sms: Boolean(bought.capabilities?.sms),
          mms: Boolean(bought.capabilities?.mms),
        },
      };
    } catch (err) {
      const reason =
        err instanceof Error && /not available|21422|21421/i.test(err.message)
          ? 'That number was taken while you were choosing it.'
          : 'Twilio rejected the purchase.';
      log.error('twilio purchase failed', { provider: 'twilio', error: err });
      throw errors.phoneProvisioningFailed(reason);
    }
  }

  async releaseNumber(sid: string): Promise<void> {
    try {
      await this.client().incomingPhoneNumbers(sid).remove();
    } catch (err) {
      log.error('twilio release failed', { provider: 'twilio', error: err });
      throw errors.providerUnavailable('Twilio');
    }
  }

  /**
   * Associates the number with the Elastic SIP Trunk. Inbound PSTN calls to
   * this number then egress over the trunk to the OpenAI Realtime SIP URI
   * configured on the trunk's origination settings.
   */
  async attachToSipTrunk(sid: string, trunkSid: string): Promise<void> {
    try {
      await this.client().trunking.v1.trunks(trunkSid).phoneNumbers.create({ phoneNumberSid: sid });
    } catch (err) {
      log.error('twilio trunk attach failed', { provider: 'twilio', error: err });
      throw errors.phoneProvisioningFailed(
        'The number was purchased but could not be attached to the SIP trunk. Check TWILIO_SIP_TRUNK_SID.',
      );
    }
  }

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    try {
      const messagingServiceSid = twilioEnv.messagingServiceSid;
      const msg = await this.client().messages.create({
        to: input.to,
        body: input.body,
        ...(messagingServiceSid ? { messagingServiceSid } : { from: input.from }),
        ...(input.statusCallbackUrl ? { statusCallback: input.statusCallbackUrl } : {}),
      });
      return { sid: msg.sid, status: msg.status ?? 'queued' };
    } catch (err) {
      log.error('twilio sms failed', { provider: 'twilio', error: err });
      throw errors.providerUnavailable('Twilio SMS');
    }
  }

  verifyWebhook(signature: string | null, url: string, params: Record<string, string>): boolean {
    if (!signature) return false;
    try {
      return twilio.validateRequest(twilioEnv.authToken, signature, url, params);
    } catch {
      return false;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Mock — development only                                                    */
/* -------------------------------------------------------------------------- */

/**
 * In-memory telephony. Generates plausible numbers so onboarding can be walked
 * end to end without spending money. Everything it creates is marked as demo
 * data in the database and rendered with a "Demo" badge in the UI.
 */
class MockTelephonyProvider implements TelephonyProvider {
  readonly name = 'mock-telephony';
  readonly isMock = true;

  async searchAvailableNumbers(input: SearchNumbersInput): Promise<AvailableNumber[]> {
    const area = input.areaCode ?? '215';
    const cities: Array<[string, string, string]> = [
      ['Philadelphia', 'PA', '19103'],
      ['Bensalem', 'PA', '19020'],
      ['Camden', 'NJ', '08102'],
      ['Norristown', 'PA', '19401'],
      ['Cherry Hill', 'NJ', '08002'],
    ];
    return Array.from({ length: 8 }, (_, i) => {
      const city = cities[i % cities.length]!;
      const line = String(5550100 + i * 7).padStart(7, '0');
      const number = `+1${area}${line}`;
      return {
        phoneNumber: number,
        friendlyName: `(${area}) ${line.slice(0, 3)}-${line.slice(3)}`,
        locality: city[0],
        region: city[1],
        postalCode: city[2],
        capabilities: { voice: true, sms: true, mms: true },
      };
    }).filter((n) => !input.contains || n.phoneNumber.includes(input.contains));
  }

  async purchaseNumber(phoneNumber: string): Promise<ProvisionedNumber> {
    return {
      sid: `PNmock${Buffer.from(phoneNumber).toString('hex').slice(0, 26)}`,
      phoneNumber,
      capabilities: { voice: true, sms: true, mms: true },
    };
  }

  async releaseNumber(): Promise<void> {
    /* nothing to release */
  }

  async attachToSipTrunk(): Promise<void> {
    /* no trunk in demo mode */
  }

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    log.info('[demo] SMS not actually sent', {
      provider: 'mock-telephony',
      event: 'sms.simulated',
      to_masked: `${input.to.slice(0, 5)}•••${input.to.slice(-4)}`,
      body_length: input.body.length,
    });
    return { sid: `SMmock${crypto.randomUUID().replace(/-/g, '').slice(0, 26)}`, status: 'sent' };
  }

  verifyWebhook(): boolean {
    // Demo mode accepts local webhook posts so the flow can be exercised.
    return true;
  }
}

/* -------------------------------------------------------------------------- */

let cached: TelephonyProvider | null = null;

export function getTelephonyProvider(): TelephonyProvider {
  if (cached) return cached;
  cached = DEMO_MODE || !twilioEnv.configured
    ? new MockTelephonyProvider()
    : new TwilioTelephonyProvider();
  return cached;
}

export function __setTelephonyProviderForTests(p: TelephonyProvider | null) {
  cached = p;
}

export { TwilioTelephonyProvider, MockTelephonyProvider };

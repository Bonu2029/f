/**
 * Creates the Twilio Elastic SIP Trunk that routes inbound PSTN calls to
 * OpenAI Realtime, and prints what still has to be done by hand.
 *
 *   TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... OPENAI_PROJECT_ID=... \
 *   npm run twilio:setup
 *
 * Idempotent: an existing trunk with the same friendly name is reused.
 */
import twilio from 'twilio';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

const TRUNK_NAME = 'AI Front Desk — OpenAI Realtime';

async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const projectId = process.env.OPENAI_PROJECT_ID;

  if (!accountSid || !authToken) {
    console.error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.');
    process.exit(1);
  }
  if (!projectId) {
    console.error('OPENAI_PROJECT_ID is required — it forms the SIP destination.');
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);
  const sipUri = `sip:${projectId}@sip.api.openai.com;transport=tls`;

  const trunks = await client.trunking.v1.trunks.list({ limit: 50 });
  let trunk = trunks.find((t) => t.friendlyName === TRUNK_NAME);

  if (!trunk) {
    trunk = await client.trunking.v1.trunks.create({
      friendlyName: TRUNK_NAME,
      // Secure trunking: TLS signalling and SRTP media.
      secure: true,
      transferMode: 'enable-all',
    });
    console.log(`Trunk created: ${trunk.sid}`);
  } else {
    console.log(`Trunk found:   ${trunk.sid} (existing)`);
  }

  const origination = await client.trunking.v1.trunks(trunk.sid).originationUrls.list({ limit: 20 });
  const existing = origination.find((o) => o.sipUrl === sipUri);

  if (!existing) {
    await client.trunking.v1.trunks(trunk.sid).originationUrls.create({
      friendlyName: 'OpenAI Realtime',
      sipUrl: sipUri,
      weight: 10,
      priority: 1,
      enabled: true,
    });
    console.log(`Origination:   ${sipUri} (created)`);
  } else {
    console.log(`Origination:   ${sipUri} (existing)`);
  }

  console.log(`
─────────────────────────────────────────────────────────────
Add this to your environment:

TWILIO_SIP_TRUNK_SID=${trunk.sid}

Numbers bought through the app are attached to this trunk automatically.
To attach an existing number by hand:
  Twilio Console → Elastic SIP Trunking → ${TRUNK_NAME} → Numbers → Add.

Still to do in the OpenAI dashboard (cannot be scripted):
  1. Settings → Webhooks → add endpoint
     URL:   https://YOUR_DOMAIN/api/webhooks/openai
     Event: realtime.call.incoming
     Copy the signing secret into OPENAI_WEBHOOK_SECRET.
─────────────────────────────────────────────────────────────`);
}

main().catch((err) => {
  console.error('\nTwilio SIP setup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

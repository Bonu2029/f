/**
 * Seeds a demo organisation with realistic data so the dashboard can be
 * explored without making phone calls.
 *
 *   npm run db:seed
 *
 * Everything it creates is flagged `is_demo = true` and rendered with a "Demo
 * data" badge in the UI, so seeded records can never be mistaken for real
 * customer activity. Demo calls do not count against plan minutes.
 *
 * Re-running is safe: the demo organisation is identified by its slug and its
 * generated activity is replaced rather than duplicated.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvFiles } from './load-env';

loadEnvFiles();

const DEMO_SLUG = 'daniels-hvac-demo';
const DEMO_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'demo-owner@example.com';
const DEMO_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'DemoPassword123!';

function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  /* ---- Owner ------------------------------------------------------------ */
  const { data: existingUsers } = await db.auth.admin.listUsers({ perPage: 200 });
  let userId = existingUsers?.users.find((u) => u.email === DEMO_EMAIL)?.id;

  if (!userId) {
    const { data: created, error } = await db.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Daniel', last_name: 'Reyes', business_name: "Daniel's HVAC" },
    });
    if (error || !created.user) {
      console.error('Could not create the demo user:', error?.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`Created demo owner ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  } else {
    console.log(`Using existing demo owner ${DEMO_EMAIL}`);
  }

  /* ---- Organisation ----------------------------------------------------- */
  const { data: existingOrg } = await db.from('organizations').select('id').eq('slug', DEMO_SLUG).maybeSingle();

  if (existingOrg) {
    console.log('Removing previous demo organisation…');
    await db.from('organizations').delete().eq('id', existingOrg.id);
  }

  const { data: org, error: orgError } = await db
    .from('organizations')
    .insert({
      name: "Daniel's HVAC",
      slug: DEMO_SLUG,
      owner_user_id: userId,
      timezone: 'America/New_York',
      status: 'active',
      onboarding_step: 4,
      onboarding_completed_at: new Date().toISOString(),
      is_demo: true,
    })
    .select('id')
    .single();

  if (orgError || !org) {
    console.error('Could not create the demo organisation:', orgError?.message);
    process.exit(1);
  }
  const orgId = org.id as string;

  /* ---- Core configuration ----------------------------------------------- */
  await db.from('organization_members').insert({ organization_id: orgId, user_id: userId, role: 'owner' });

  await db.from('business_profiles').insert({
    organization_id: orgId,
    display_name: "Daniel's HVAC",
    legal_name: "Daniel's Heating & Cooling LLC",
    industry: 'hvac',
    website: 'https://danielshvac.example.com',
    public_phone: '+12155550100',
    email: 'office@danielshvac.example.com',
    address: '1420 Market Street',
    city: 'Philadelphia',
    state: 'PA',
    postal_code: '19102',
    country: 'US',
    timezone: 'America/New_York',
    business_description:
      'Family-run HVAC company serving the Philadelphia area since 2009. Residential heating and cooling repair, installation and maintenance. Emergency service available for no-heat and no-cooling situations.',
    business_hours: [
      { weekday: 0, closed: true, open: '09:00', close: '17:00' },
      { weekday: 1, closed: false, open: '07:30', close: '18:00' },
      { weekday: 2, closed: false, open: '07:30', close: '18:00' },
      { weekday: 3, closed: false, open: '07:30', close: '18:00' },
      { weekday: 4, closed: false, open: '07:30', close: '18:00' },
      { weekday: 5, closed: false, open: '07:30', close: '18:00' },
      { weekday: 6, closed: false, open: '08:00', close: '13:00' },
    ],
    emergency_information:
      'No heat below 40°F, no cooling above 90°F, or any suspected gas smell is an emergency. If the caller smells gas, tell them to leave the property and call the gas company or 911 before anything else, then transfer.',
    emergency_phone: '+12155550111',
  });

  await db.from('ai_agents').insert({
    organization_id: orgId,
    name: 'Mia',
    voice_id: 'elliot',
    personality: 'warm',
    // A visibly fake assistant id: the demo tenant is fully configured in the
    // UI without anything having been created at Vapi.
    vapi_assistant_id: 'demo_asst_seed0001',
    vapi_synced_at: new Date().toISOString(),
    greeting:
      "Thanks for calling Daniel's HVAC. This is Mia, the virtual receptionist. How can I help you today?",
    active: true,
    transfer_enabled: true,
    transfer_phone: '+12155550111',
    appointment_booking_enabled: true,
  });

  await db.from('services').insert([
    { organization_id: orgId, name: 'AC repair', description: 'Diagnostic visit and repair for residential cooling systems.', price_type: 'starting_at', starting_price: 14900, price_notes: 'Diagnostic fee waived if you proceed with the repair', estimated_duration: 90, active: true },
    { organization_id: orgId, name: 'AC installation', description: 'Full replacement of a residential cooling system.', price_type: 'range', starting_price: 450000, max_price: 1200000, price_notes: 'Depends on system size and ductwork', estimated_duration: 480, active: true },
    { organization_id: orgId, name: 'Furnace repair', description: 'Diagnostic and repair for gas and electric furnaces.', price_type: 'starting_at', starting_price: 14900, estimated_duration: 90, active: true },
    { organization_id: orgId, name: 'Maintenance tune-up', description: 'Seasonal inspection, cleaning and safety check.', price_type: 'fixed', exact_price: 9900, estimated_duration: 60, active: true },
    { organization_id: orgId, name: 'Duct cleaning', description: 'Whole-home duct cleaning.', price_type: 'starting_at', starting_price: 39900, estimated_duration: 240, active: true },
    { organization_id: orgId, name: 'Commercial rooftop unit service', description: 'Service for commercial RTUs.', price_type: 'quote_only', price_notes: 'Requires a site visit to quote', active: true },
  ]);

  await db.from('faqs').insert([
    { organization_id: orgId, question: 'Do you charge for estimates?', answer: 'Replacement estimates are free. Repair visits carry a $149 diagnostic fee, which is waived if you go ahead with the repair.', active: true },
    { organization_id: orgId, question: 'How quickly can someone come out?', answer: 'Usually within one to two business days. Emergencies are prioritised the same day where possible.', active: true },
    { organization_id: orgId, question: 'What brands do you service?', answer: 'All major residential brands, including Carrier, Trane, Lennox, Goodman and Rheem.', active: true },
    { organization_id: orgId, question: 'Do you offer financing?', answer: 'Yes, on system replacements. The team goes through the options during the estimate visit.', active: true },
  ]);

  await db.from('business_policies').insert([
    { organization_id: orgId, kind: 'cancellation', title: 'Cancellation policy', body: 'Cancel or reschedule any time up to 2 hours before the appointment at no charge.', active: true },
    { organization_id: orgId, kind: 'payment_methods', title: 'Payment methods', body: 'Card, check or bank transfer, taken by the technician after the work is done. Never over the phone.', active: true },
    { organization_id: orgId, kind: 'warranty', title: 'Workmanship warranty', body: 'One year on labour. Manufacturer warranty applies to parts.', active: true },
  ]);

  await db.from('service_areas').insert(
    ['19102', '19103', '19106', '19020', '19047', '19053', '19067'].map((zip) => ({
      organization_id: orgId,
      type: 'postal_code' as const,
      postal_code: zip,
      active: true,
    })),
  );

  await db.from('ai_rules').insert([
    { organization_id: orgId, title: 'Never invent prices', instruction: 'Only quote prices stored in the services list. If a price is not stored, say an estimate is required.', priority: 10, is_system: true, enabled: true },
    { organization_id: orgId, title: 'Never promise an appointment time', instruction: 'Take the day and time the caller would prefer, then say the team will confirm it.', priority: 30, is_system: true, enabled: true },
    { organization_id: orgId, title: 'Answer truthfully about being AI', instruction: 'If asked whether you are a person, say immediately that you are the virtual receptionist.', priority: 50, is_system: true, enabled: true },
    { organization_id: orgId, title: 'Gas smell is an emergency', instruction: 'If the caller mentions a gas smell, tell them to leave the property and call the gas company or 911 first, then transfer the call.', priority: 70, is_system: false, enabled: true },
    { organization_id: orgId, title: 'No same-day installations', instruction: 'Never schedule a system installation for the same day. Installations need at least three business days.', priority: 90, is_system: false, enabled: true },
  ]);

  await db.from('availability_settings').insert({
    organization_id: orgId,
    appointment_duration: 90,
    buffer_before: 0,
    buffer_after: 30,
    min_notice_minutes: 180,
    max_horizon_days: 21,
    blackout_dates: [],
  });

  await db.from('availability_rules').insert(
    [1, 2, 3, 4, 5].map((weekday) => ({
      organization_id: orgId,
      weekday,
      start_time: '08:00',
      end_time: '16:00',
      active: true,
    })),
  );

  await db.from('notification_preferences').insert({ organization_id: orgId });

  await db.from('phone_numbers').insert({
    organization_id: orgId,
    vapi_phone_number_id: 'demo_num_seed0001',
    phone_number: '+12155550142',
    friendly_name: "Daniel's HVAC — AI receptionist (demo)",
    capabilities: { voice: true, sms: false, mms: false },
    status: 'active',
    is_demo: true,
  });

  const periodStart = new Date();
  periodStart.setDate(1);
  await db.from('subscriptions').insert({
    organization_id: orgId,
    stripe_customer_id: 'cus_demo_seed',
    stripe_subscription_id: 'sub_demo_seed',
    plan: 'founder',
    status: 'active',
    billing_period_start: periodStart.toISOString(),
    billing_period_end: new Date(periodStart.getTime() + 30 * 86_400_000).toISOString(),
    included_minutes: 200,
    used_minutes: 0,
    founder: true,
    founder_slot: null,
  });

  /* ---- Activity ---------------------------------------------------------- */
  const scenarios = [
    { caller: '+12155550143', reason: 'AC blowing warm air', service: 'AC repair', name: 'John Smith', zip: '19020', urgency: 'urgent', booked: true, transferred: false, seconds: 214, score: 'hot' },
    { caller: '+12675550119', reason: 'Quote for a new system', service: 'AC installation', name: 'Maria Alvarez', zip: '19103', urgency: 'flexible', booked: false, transferred: false, seconds: 168, score: 'warm' },
    { caller: '+12155550188', reason: 'Wants to speak to the owner about an invoice', service: null, name: 'Robert Chen', zip: '19106', urgency: 'unknown', booked: false, transferred: true, seconds: 47, score: 'cold' },
    { caller: '+12155550164', reason: 'No heat overnight', service: 'Furnace repair', name: 'Tanya Brooks', zip: '19047', urgency: 'emergency', booked: true, transferred: false, seconds: 268, score: 'hot' },
    { caller: '+18565550101', reason: 'Asked whether we service Camden NJ', service: null, name: null, zip: '08102', urgency: 'unknown', booked: false, transferred: false, seconds: 61, score: 'cold' },
    { caller: '+12155550177', reason: 'Annual maintenance tune-up', service: 'Maintenance tune-up', name: 'Priya Nair', zip: '19053', urgency: 'soon', booked: true, transferred: false, seconds: 152, score: 'hot' },
    { caller: '+12675550133', reason: 'Duct cleaning pricing', service: 'Duct cleaning', name: 'Alan Whitfield', zip: '19067', urgency: 'flexible', booked: false, transferred: false, seconds: 121, score: 'warm' },
  ];

  let totalMinutes = 0;

  for (const [i, s] of scenarios.entries()) {
    const startedAt = daysAgo(i * 3 + 1, 9 + (i % 7));
    const answeredAt = new Date(new Date(startedAt).getTime() + 2000).toISOString();
    const endedAt = new Date(new Date(answeredAt).getTime() + s.seconds * 1000).toISOString();
    const minutes = Math.ceil(s.seconds / 60);
    totalMinutes += minutes;

    const { data: call } = await db
      .from('calls')
      .insert({
        organization_id: orgId,
        vapi_call_id: `demo_call_${orgId.slice(0, 8)}_${i}`,
        caller_phone: s.caller,
        business_phone: '+12155550142',
        direction: 'inbound',
        started_at: startedAt,
        answered_at: answeredAt,
        ended_at: endedAt,
        duration_seconds: s.seconds + 2,
        billed_seconds: s.seconds,
        billable_minutes: minutes,
        result: s.transferred ? 'transferred' : 'completed',
        disposition: s.booked ? 'appointment_booked' : s.transferred ? 'transferred_to_human' : s.name ? 'lead_captured' : 'question_answered',
        transferred: s.transferred,
        transfer_succeeded: s.transferred ? true : null,
        appointment_booked: s.booked,
        summary: `[Demo] ${s.reason}. ${s.booked ? 'Appointment booked.' : s.transferred ? 'Transferred to the owner.' : 'Details captured for follow-up.'}`,
        summary_json: {
          reason: s.reason,
          customer_name: s.name,
          location: `${s.zip}`,
          service: s.service,
          result: s.booked ? 'Appointment booked' : s.transferred ? 'Transferred' : 'Lead captured',
          appointment: s.booked ? 'Scheduled' : null,
          notes: null,
          follow_up_required: !s.booked,
        },
        call_tone: s.urgency === 'emergency' ? 'urgent' : 'calm',
        is_demo: true,
      })
      .select('id')
      .single();

    if (!call) continue;

    await db.from('call_transcript_messages').insert([
      { call_id: call.id, organization_id: orgId, role: 'assistant', text: "Thanks for calling Daniel's HVAC. This is Mia, the virtual receptionist. How can I help you today?", sequence: 1, timestamp: answeredAt },
      { call_id: call.id, organization_id: orgId, role: 'user', text: s.reason, sequence: 2, timestamp: answeredAt },
      { call_id: call.id, organization_id: orgId, role: 'assistant', text: s.booked ? "I can get someone out to you. What's the ZIP code for the property?" : 'Let me help with that.', sequence: 3, timestamp: answeredAt },
      { call_id: call.id, organization_id: orgId, role: 'user', text: `It's ${s.zip}.`, sequence: 4, timestamp: answeredAt },
    ]);

    if (s.name) {
      const { data: lead } = await db
        .from('leads')
        .insert({
          organization_id: orgId,
          call_id: call.id,
          name: s.name,
          phone: s.caller,
          postal_code: s.zip,
          city: s.zip === '08102' ? 'Camden' : 'Philadelphia',
          state: s.zip === '08102' ? 'NJ' : 'PA',
          service_requested: s.service,
          description: s.reason,
          urgency: s.urgency,
          lead_score: s.score,
          score_reasons: [
            'Callback number captured (+2)',
            s.name ? 'Name captured (+1)' : 'No name (0)',
            s.zip === '08102' ? 'Outside the service area (−2)' : 'Inside the service area (+2)',
            s.booked ? 'Booked an appointment on the call (+3)' : 'No booking (0)',
            `Total → ${s.score}`,
          ],
          status: s.booked ? 'appointment_booked' : 'new',
          source: 'demo_call',
          in_service_area: s.zip !== '08102',
          created_at: startedAt,
        })
        .select('id')
        .single();

      if (lead) {
        await db.from('calls').update({ lead_id: lead.id }).eq('id', call.id);

        if (s.booked) {
          const start = new Date();
          start.setDate(start.getDate() + i + 1);
          start.setHours(13, 0, 0, 0);
          await db.from('appointments').insert({
            organization_id: orgId,
            lead_id: lead.id,
            call_id: call.id,
            customer_name: s.name,
            customer_phone: s.caller,
            service: s.service,
            address: `${100 + i} Chestnut Street, Philadelphia PA ${s.zip}`,
            start_at: start.toISOString(),
            end_at: new Date(start.getTime() + 90 * 60_000).toISOString(),
            status: 'scheduled',
            source: 'demo_call',
          });

        }
      }
    }

    await db.from('usage_ledger').insert({
      organization_id: orgId,
      call_id: call.id,
      billing_period: periodStart.toISOString().slice(0, 10),
      voice_seconds: s.seconds,
      billable_minutes: minutes,
      ai_usage_metadata: { demo: true },
      created_at: endedAt,
    });
  }

  // Demo calls are recorded but do not consume the plan allowance, so the
  // dashboard shows a realistic figure without misrepresenting real billing.
  await db.from('subscriptions').update({ used_minutes: totalMinutes }).eq('organization_id', orgId);

  await db.from('notifications').insert([
    { organization_id: orgId, kind: 'lead_created', title: 'New lead: Tanya Brooks', body: 'Furnace repair · (215) 555-0164', link: '/dashboard/leads' },
    { organization_id: orgId, kind: 'appointment_booked', title: 'Appointment booked: John Smith', body: 'AC repair', link: '/dashboard/appointments' },
  ]);

  console.log(`
─────────────────────────────────────────────────────────────
Demo data seeded.

  Organisation: Daniel's HVAC (${DEMO_SLUG})
  Sign in:      ${DEMO_EMAIL} / ${DEMO_PASSWORD}
  Calls:        ${scenarios.length}
  Minutes:      ${totalMinutes} of 200

Everything is flagged as demo data and badged in the UI.
Demo calls never count against real plan minutes in production.
─────────────────────────────────────────────────────────────`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { describe, expect, it } from 'vitest';
import {
  confirmationChannel,
  confirmationPromise,
  customerConfirmationEmail,
  customerConfirmationSms,
  ownerJobSummaryEmail,
  type BookingFacts,
} from '@afd/shared';

/**
 * The confirmation is the only written record the caller gets. If it names the
 * wrong day nobody finds out until the van arrives at an empty house, so the
 * exact words are pinned here rather than assembled and hoped for.
 */

function facts(overrides: Partial<BookingFacts & { customerPhone: string | null }> = {}) {
  return {
    businessName: 'Yardley Landscaping',
    whenSpoken: 'tomorrow at 8:00 AM',
    customerName: 'Dana Whitfield',
    customerPhone: '+12155550188',
    service: 'Yard cleanup',
    address: '123 Main Street, Yardley',
    employeeName: 'Dave Nowak',
    businessPhone: '+12155550142',
    notes: null,
    durationMinutes: 60,
    ...overrides,
  };
}

describe('confirmationChannel', () => {
  it('prefers a text when one can actually be sent', () => {
    expect(
      confirmationChannel({
        smsConfigured: true,
        customerPhone: '+12155550188',
        customerEmail: 'dana@example.com',
      }),
    ).toBe('sms');
  });

  it('falls back to email when no SMS provider is configured', () => {
    expect(
      confirmationChannel({
        smsConfigured: false,
        customerPhone: '+12155550188',
        customerEmail: 'dana@example.com',
      }),
    ).toBe('email');
  });

  it('falls back to email when the caller gave no number', () => {
    expect(
      confirmationChannel({
        smsConfigured: true,
        customerPhone: null,
        customerEmail: 'dana@example.com',
      }),
    ).toBe('email');
  });

  /**
   * The answer that must not be smoothed over. A configured provider with
   * nowhere to send is the same outcome as no provider at all: nobody is told.
   */
  it('says none when there is genuinely nowhere to send', () => {
    expect(
      confirmationChannel({ smsConfigured: true, customerPhone: null, customerEmail: null }),
    ).toBe('none');
    expect(
      confirmationChannel({ smsConfigured: false, customerPhone: '+1215', customerEmail: null }),
    ).toBe('none');
  });
});

describe('confirmationPromise', () => {
  it('promises a text only when a text is going', () => {
    expect(confirmationPromise('sms')).toContain('text message');
    expect(confirmationPromise('email')).toContain('email');
  });

  /**
   * The bug this whole module exists to close: the booking tool told the model
   * to "say they will get a confirmation" while nothing sent one.
   */
  it('forbids promising anything when nothing will be sent', () => {
    const promise = confirmationPromise('none');
    expect(promise).toContain('Do not promise');
    expect(promise).not.toMatch(/will get|on its way/);
    // And says what to do instead, so the model does not improvise a promise.
    expect(promise).toContain('Read the day and time back');
  });
});

describe('the text the customer gets', () => {
  it('leads with the business and the time', () => {
    expect(customerConfirmationSms(facts())).toBe(
      'Yardley Landscaping: your appointment is confirmed for tomorrow at 8:00 AM. For: Yard cleanup. At: 123 Main Street, Yardley. Questions: +12155550142',
    );
  });

  it('leaves out what was never collected rather than writing a blank', () => {
    const sparse = customerConfirmationSms(facts({ service: null, address: null, businessPhone: null }));
    expect(sparse).toBe(
      'Yardley Landscaping: your appointment is confirmed for tomorrow at 8:00 AM.',
    );
    expect(sparse).not.toMatch(/null|undefined|:\s*$/);
  });

  it('stays within one message segment for an ordinary booking', () => {
    // A split SMS can arrive out of order, which for a confirmation means the
    // date and the time landing separately.
    expect(customerConfirmationSms(facts()).length).toBeLessThanOrEqual(160);
  });
});

describe('the confirmation email', () => {
  const email = customerConfirmationEmail(facts());

  it('puts the time in the subject, where it is readable without opening it', () => {
    expect(email.subject).toBe('Confirmed: tomorrow at 8:00 AM with Yardley Landscaping');
  });

  it('says what, where and how long', () => {
    expect(email.text).toContain('Yard cleanup');
    expect(email.text).toContain('123 Main Street, Yardley');
    expect(email.text).toContain('1 hour');
  });

  it('never invents a way to reach the business', () => {
    const noPhone = customerConfirmationEmail(facts({ businessPhone: null }));
    expect(noPhone.text).not.toMatch(/call \+?\d/);
    expect(noPhone.text).toContain('reply to this message');
  });
});

describe('the job summary the owner gets', () => {
  it('is enough on its own — no transcript needed', () => {
    const summary = ownerJobSummaryEmail(facts());
    expect(summary.subject).toBe('Booked: Dana Whitfield, tomorrow at 8:00 AM');
    expect(summary.text).toContain('123 Main Street, Yardley');
    expect(summary.text).toContain('+12155550188');
    expect(summary.text).toContain('Dave Nowak');
    expect(summary.text).toContain('1 hour');
  });

  /**
   * An owner who does not know what is missing assumes the receptionist got
   * everything, and turns up unable to do the job.
   */
  it('names what the caller did not give, instead of leaving a blank', () => {
    const summary = ownerJobSummaryEmail(
      facts({ address: null, customerPhone: null, service: null }),
    );
    expect(summary.text).toContain('STILL NEEDED: the address, a phone number, what the work is');
    expect(summary.text).toContain('No address given on the call');
    expect(summary.text).toContain('Not given');
  });

  it('says nothing is missing when nothing is', () => {
    expect(ownerJobSummaryEmail(facts()).text).not.toContain('STILL NEEDED');
  });

  it('carries the notes from the call when there are any', () => {
    const withNotes = ownerJobSummaryEmail(facts({ notes: 'Gate code 4821. Dog in the yard.' }));
    expect(withNotes.text).toContain('Gate code 4821. Dog in the yard.');
  });

  it('says who is going, or admits nobody is assigned', () => {
    expect(ownerJobSummaryEmail(facts({ employeeName: null })).text).toContain(
      'Who is going: Not assigned',
    );
  });
});

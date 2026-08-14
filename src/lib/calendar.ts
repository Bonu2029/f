import type { DateOnly, TimeOnly } from "./types";
import { combine } from "./time";

/**
 * Calendar export.
 *
 * "Add to calendar" produces a standards-compliant .ics file locally — no
 * third-party integration is implied. Two-way sync with Google/Apple/Square is
 * a separate, unbuilt feature and is labelled as such in the integrations page.
 */
export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  date: DateOnly;
  startTime: TimeOnly;
  endTime: TimeOnly;
  uid: string;
}

export function buildIcs(event: CalendarEvent): string {
  const start = combine(event.date, event.startTime);
  const end = combine(event.date, event.endTime);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NOW//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@booknow.demo`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Your NOW appointment starts in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(event: CalendarEvent, filename = "now-appointment.ics") {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(input: string): string {
  return input.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

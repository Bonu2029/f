/**
 * PLACEHOLDER SERVICE AREAS
 * -------------------------
 * These entries exist so the location checker, the zone explanation and the
 * request-my-area form can be built and tested. None of them asserts real
 * coverage. Replace with confirmed cities, neighborhoods and ZIP codes before
 * launch, and delete anything that has not been verified.
 */

export type ServiceZone = 'core' | 'extended' | 'waitlist';

export type ServiceArea = {
  city: string;
  region: string;
  zone: ServiceZone;
  neighborhoods: string[];
  zips: string[];
};

export const serviceAreas: ServiceArea[] = [
  {
    city: 'Riverbend',
    region: 'Placeholder metro',
    zone: 'core',
    neighborhoods: ['Old Mill', 'Harbor Flats', 'Linden Park', 'Cedar Row'],
    zips: ['10001', '10002', '10003', '10004'],
  },
  {
    city: 'Kestrel Heights',
    region: 'Placeholder metro',
    zone: 'core',
    neighborhoods: ['North Ridge', 'Alder Court', 'Stonegate'],
    zips: ['10010', '10011', '10012'],
  },
  {
    city: 'Marlow',
    region: 'Placeholder metro',
    zone: 'extended',
    neighborhoods: ['Marlow Village', 'Fenwick', 'Bell Meadow'],
    zips: ['10020', '10021'],
  },
  {
    city: 'Ashcombe',
    region: 'Placeholder county',
    zone: 'extended',
    neighborhoods: ['Ashcombe Center', 'Willow Bend'],
    zips: ['10030', '10031'],
  },
  {
    city: 'Prewitt Bay',
    region: 'Placeholder county',
    zone: 'waitlist',
    neighborhoods: ['Bayfront', 'Sailmaker District'],
    zips: ['10040', '10041'],
  },
];

export const zoneCopy: Record<
  ServiceZone,
  { label: string; detail: string; tone: string }
> = {
  core: {
    label: 'Core service area',
    detail:
      'Full availability, including recurring plans and same-week windows when the calendar allows.',
    tone: 'bg-mint text-ink',
  },
  extended: {
    label: 'Extended service area',
    detail:
      'Available on scheduled days. Recurring plans are grouped by day to keep travel time reasonable.',
    tone: 'bg-airy text-ink',
  },
  waitlist: {
    label: 'Waitlist area',
    detail:
      'Not yet confirmed for regular service. Join the list and we will contact you when coverage is verified.',
    tone: 'bg-champagne text-ink',
  },
};

export function lookupZip(zip: string) {
  const clean = zip.trim();
  if (!/^\d{5}$/.test(clean)) return { status: 'invalid' as const };
  const match = serviceAreas.find((area) => area.zips.includes(clean));
  if (!match) return { status: 'unknown' as const };
  return { status: 'found' as const, area: match };
}

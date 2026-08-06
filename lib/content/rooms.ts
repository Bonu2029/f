export type RoomId =
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'living'
  | 'dining'
  | 'office'
  | 'entry'
  | 'laundry'
  | 'basement'
  | 'balcony';

export type Room = {
  id: RoomId;
  label: string;
  blurb: string;
  includes: string[];
  /** Grid placement inside the illustrated floor plan (12-column layout). */
  plan: { col: number; span: number; row: number; rowSpan: number };
  baseMinutes: number;
};

export const rooms: Room[] = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    blurb: 'The room that sets the tone for the rest of the home.',
    includes: [
      'Counters, backsplash and sink',
      'Stovetop and appliance exteriors',
      'Cabinet fronts spot-cleaned',
      'Floors cleaned to the edges',
      'Trash removed and liner replaced',
    ],
    plan: { col: 1, span: 5, row: 1, rowSpan: 2 },
    baseMinutes: 35,
  },
  {
    id: 'dining',
    label: 'Dining area',
    blurb: 'Table, seating and the surfaces around them.',
    includes: [
      'Table and chairs wiped',
      'Chair legs and rails dusted',
      'Light fixture dusted where reachable',
      'Floors vacuumed and mopped',
    ],
    plan: { col: 6, span: 4, row: 1, rowSpan: 1 },
    baseMinutes: 15,
  },
  {
    id: 'living',
    label: 'Living room',
    blurb: 'Reset cushions, clear surfaces, clean floors.',
    includes: [
      'Surfaces dusted and cleared',
      'Cushions straightened, throws folded',
      'Upholstery vacuumed',
      'Floors and rug edges vacuumed',
      'Screens and glass wiped',
    ],
    plan: { col: 10, span: 3, row: 1, rowSpan: 2 },
    baseMinutes: 25,
  },
  {
    id: 'entry',
    label: 'Entryway',
    blurb: 'The first and last impression of the home.',
    includes: [
      'Door, handle and frame wiped',
      'Console and tray surfaces cleared',
      'Shoe area straightened',
      'Floor and mat cleaned',
    ],
    plan: { col: 6, span: 4, row: 2, rowSpan: 1 },
    baseMinutes: 12,
  },
  {
    id: 'bathroom',
    label: 'Bathrooms',
    blurb: 'Fixtures, glass, floors and high-touch surfaces.',
    includes: [
      'Toilet cleaned inside and out',
      'Shower, tub and glass wiped',
      'Vanity, sink and fixtures polished',
      'Mirror finished streak-free',
      'Floor cleaned along edges',
    ],
    plan: { col: 1, span: 3, row: 3, rowSpan: 1 },
    baseMinutes: 30,
  },
  {
    id: 'bedroom',
    label: 'Bedrooms',
    blurb: 'Made beds, dusted surfaces, clean floors.',
    includes: [
      'Bed made or linens changed if selected',
      'Nightstands and dressers dusted',
      'Mirrors and glass wiped',
      'Under-bed edges vacuumed where reachable',
    ],
    plan: { col: 4, span: 4, row: 3, rowSpan: 1 },
    baseMinutes: 20,
  },
  {
    id: 'office',
    label: 'Office',
    blurb: 'Cleaned around your work, not through it.',
    includes: [
      'Desk surface cleaned around items left in place',
      'Screens dusted with a dry cloth',
      'Shelves and sills dusted',
      'Floors vacuumed on a schedule you choose',
    ],
    plan: { col: 8, span: 5, row: 3, rowSpan: 1 },
    baseMinutes: 18,
  },
  {
    id: 'laundry',
    label: 'Laundry room',
    blurb: 'Surfaces, machine exteriors and the floor around them.',
    includes: [
      'Machine exteriors and lint area wiped',
      'Counter and sink cleaned',
      'Shelving dusted',
      'Floor cleaned around and behind where reachable',
    ],
    plan: { col: 1, span: 4, row: 4, rowSpan: 1 },
    baseMinutes: 15,
  },
  {
    id: 'basement',
    label: 'Basement',
    blurb: 'Finished basement living and storage areas.',
    includes: [
      'Finished-area surfaces dusted',
      'Floors vacuumed and mopped',
      'Stair treads and railing cleaned',
      'Visible cobwebs removed',
    ],
    plan: { col: 5, span: 4, row: 4, rowSpan: 1 },
    baseMinutes: 25,
  },
  {
    id: 'balcony',
    label: 'Balcony / patio',
    blurb: 'A quick outdoor reset for the space just past the door.',
    includes: [
      'Swept and debris removed',
      'Railing and furniture wiped',
      'Door glass and track cleaned',
      'Cushions straightened',
    ],
    plan: { col: 9, span: 4, row: 4, rowSpan: 1 },
    baseMinutes: 18,
  },
];

export const roomPriorities = [
  { id: 'standard', label: 'Standard reset', hint: 'Our normal pass for this room' },
  { id: 'detailed', label: 'Detailed clean', hint: 'Slower, edges and buildup included' },
  { id: 'organize', label: 'Organization help', hint: 'Items returned to a logical order' },
  { id: 'pet-hair', label: 'Pet-hair attention', hint: 'Extra passes on fabric and edges' },
  { id: 'sanitize', label: 'High-touch sanitizing', hint: 'Handles, switches, pulls, remotes' },
  { id: 'fragrance-free', label: 'Fragrance-free products', hint: 'Unscented products in this room' },
] as const;

export type RoomPriorityId = (typeof roomPriorities)[number]['id'];

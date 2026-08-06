/**
 * PLACEHOLDER RATE CARD
 * ---------------------
 * Every number below is an illustrative default so the estimator, the plan
 * builder and the booking flow can share one honest source of truth. Replace
 * `rateCard` with real, approved pricing before the site goes live. Nothing
 * here invents a discount that is not actually offered — the only reduction is
 * the recurring-frequency adjustment, which is stated plainly to the customer.
 */

export type HomeType =
  | 'apartment'
  | 'condo'
  | 'townhouse'
  | 'single-family'
  | 'rental'
  | 'office';

export type CleaningLevel =
  | 'standard'
  | 'deep'
  | 'move'
  | 'recurring'
  | 'turnover';

export type Condition = 'light' | 'typical' | 'needs-attention' | 'first-visit';

export type Frequency = 'one-time' | 'weekly' | 'biweekly' | 'monthly';

export type Occupancy = 'occupied' | 'empty';

export const homeTypes: { id: HomeType; label: string; hint: string }[] = [
  { id: 'apartment', label: 'Apartment', hint: 'Single level, shared building' },
  { id: 'condo', label: 'Condo', hint: 'Owned unit, often shared entry' },
  { id: 'townhouse', label: 'Townhouse', hint: 'Multi-level, private entry' },
  { id: 'single-family', label: 'Single-family home', hint: 'Detached house' },
  { id: 'rental', label: 'Rental property', hint: 'Short or long-term rental' },
  { id: 'office', label: 'Office / small commercial', hint: 'Workspace under 3,000 sq ft' },
];

export const cleaningLevels: {
  id: CleaningLevel;
  label: string;
  blurb: string;
  href: string;
}[] = [
  {
    id: 'standard',
    label: 'Standard Cleaning',
    blurb: 'Maintenance for a home that is already in rhythm.',
    href: '/services/standard-cleaning',
  },
  {
    id: 'deep',
    label: 'Deep Cleaning',
    blurb: 'Detail work on buildup and the areas routine visits skip.',
    href: '/services/deep-cleaning',
  },
  {
    id: 'move',
    label: 'Move-In / Move-Out',
    blurb: 'An empty property returned to a clean baseline.',
    href: '/services/move-in-move-out',
  },
  {
    id: 'recurring',
    label: 'Recurring Cleaning',
    blurb: 'A repeating plan we keep consistent visit to visit.',
    href: '/services/recurring-cleaning',
  },
  {
    id: 'turnover',
    label: 'Airbnb / Rental Turnover',
    blurb: 'Guest-ready reset between stays.',
    href: '/services/airbnb-cleaning',
  },
];

export const conditions: { id: Condition; label: string; hint: string }[] = [
  { id: 'light', label: 'Recently cleaned', hint: 'Kept up in the last two weeks' },
  { id: 'typical', label: 'Normal everyday use', hint: 'Lived in, nothing unusual' },
  { id: 'needs-attention', label: 'Ready for extra attention', hint: 'A few areas have been waiting' },
  { id: 'first-visit', label: 'First professional visit', hint: 'We plan extra time for a baseline reset' },
];

export const frequencies: {
  id: Frequency;
  label: string;
  note: string;
  multiplier: number;
}[] = [
  { id: 'one-time', label: 'One-time visit', note: 'No commitment', multiplier: 1 },
  { id: 'weekly', label: 'Every week', note: 'Member rate applied per visit', multiplier: 0.82 },
  { id: 'biweekly', label: 'Every two weeks', note: 'Member rate applied per visit', multiplier: 0.88 },
  { id: 'monthly', label: 'Every four weeks', note: 'Member rate applied per visit', multiplier: 0.94 },
];

export type AddOn = {
  id: string;
  label: string;
  description: string;
  price: number;
  minutes: number;
  icon: string;
};

export const addOns: AddOn[] = [
  { id: 'fridge', label: 'Refrigerator interior', description: 'Shelves, drawers and door bins wiped and reset.', price: 35, minutes: 30, icon: 'fridge' },
  { id: 'oven', label: 'Oven interior', description: 'Interior degreasing with a non-caustic product.', price: 40, minutes: 40, icon: 'oven' },
  { id: 'windows', label: 'Interior windows', description: 'Reachable interior glass, sills and tracks.', price: 45, minutes: 40, icon: 'window' },
  { id: 'laundry', label: 'Laundry folding', description: 'One load folded and stacked where you prefer.', price: 25, minutes: 25, icon: 'laundry' },
  { id: 'linens', label: 'Bed-linen change', description: 'Fresh linens on the beds you specify.', price: 20, minutes: 15, icon: 'linen' },
  { id: 'cabinets', label: 'Cabinet interiors', description: 'Emptied, wiped and returned in order.', price: 50, minutes: 45, icon: 'cabinet' },
  { id: 'organization', label: 'Organization session', description: 'One focused hour on a space you choose.', price: 60, minutes: 60, icon: 'organize' },
  { id: 'pet-hair', label: 'Pet-hair treatment', description: 'Extra passes on upholstery, edges and vents.', price: 30, minutes: 30, icon: 'pet' },
  { id: 'balcony', label: 'Balcony or patio reset', description: 'Sweep, wipe-down and furniture straightening.', price: 35, minutes: 30, icon: 'balcony' },
  { id: 'post-event', label: 'Post-event cleaning', description: 'Added time for glassware, surfaces and floors.', price: 55, minutes: 50, icon: 'event' },
  { id: 'closets', label: 'Inside closets', description: 'Shelves wiped, floors cleared and vacuumed.', price: 40, minutes: 35, icon: 'closet' },
  { id: 'walls', label: 'Detailed wall spot-cleaning', description: 'Marks and smudges on paintable surfaces.', price: 35, minutes: 30, icon: 'wall' },
  { id: 'baseboards', label: 'Baseboards', description: 'Hand-wiped throughout the selected rooms.', price: 45, minutes: 40, icon: 'baseboard' },
  { id: 'fixtures', label: 'Light fixtures & fans', description: 'Reachable fixtures dusted and wiped.', price: 30, minutes: 25, icon: 'fixture' },
];

export const rateCard = {
  base: {
    standard: 129,
    deep: 209,
    move: 249,
    recurring: 129,
    turnover: 149,
  } as Record<CleaningLevel, number>,
  perSquareFoot: {
    standard: 0.045,
    deep: 0.075,
    move: 0.085,
    recurring: 0.042,
    turnover: 0.05,
  } as Record<CleaningLevel, number>,
  perBedroom: 16,
  perBathroom: 26,
  perPet: 12,
  homeTypeAdjustment: {
    apartment: 0,
    condo: 0,
    townhouse: 18,
    'single-family': 26,
    rental: 12,
    office: 30,
  } as Record<HomeType, number>,
  conditionMultiplier: {
    light: 0.94,
    typical: 1,
    'needs-attention': 1.14,
    'first-visit': 1.22,
  } as Record<Condition, number>,
  emptyHomeAdjustment: -0.06,
  minimum: 119,
  // Illustrative time model, used for arrival-window planning only.
  minutes: {
    base: { standard: 95, deep: 165, move: 195, recurring: 90, turnover: 105 } as Record<
      CleaningLevel,
      number
    >,
    perBedroom: 18,
    perBathroom: 25,
    perThousandSqFt: 26,
  },
} as const;

export type EstimateInput = {
  level: CleaningLevel;
  homeType: HomeType;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  pets: number;
  condition: Condition;
  frequency: Frequency;
  occupancy: Occupancy;
  addOnIds: string[];
};

export type LineItem = {
  label: string;
  detail?: string;
  amount: number;
};

export type EstimateResult = {
  lines: LineItem[];
  subtotal: number;
  frequencyAdjustment: number;
  total: number;
  low: number;
  high: number;
  minutes: number;
  teamSize: number;
  perCleanerMinutes: number;
};

export const defaultEstimateInput: EstimateInput = {
  level: 'standard',
  homeType: 'apartment',
  squareFeet: 1100,
  bedrooms: 2,
  bathrooms: 2,
  pets: 0,
  condition: 'typical',
  frequency: 'one-time',
  occupancy: 'occupied',
  addOnIds: [],
};

export function estimate(input: EstimateInput): EstimateResult {
  const lines: LineItem[] = [];

  const base = rateCard.base[input.level];
  lines.push({
    label: 'Base cleaning',
    detail: cleaningLevels.find((l) => l.id === input.level)?.label,
    amount: base,
  });

  const sizeAmount = Math.round(input.squareFeet * rateCard.perSquareFoot[input.level]);
  lines.push({
    label: 'Home size adjustment',
    detail: `${input.squareFeet.toLocaleString('en-US')} sq ft`,
    amount: sizeAmount,
  });

  const bedroomAmount = input.bedrooms * rateCard.perBedroom;
  if (bedroomAmount > 0) {
    lines.push({
      label: 'Bedroom adjustment',
      detail: `${input.bedrooms} ${input.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`,
      amount: bedroomAmount,
    });
  }

  const bathroomAmount = input.bathrooms * rateCard.perBathroom;
  if (bathroomAmount > 0) {
    lines.push({
      label: 'Bathroom adjustment',
      detail: `${input.bathrooms} ${input.bathrooms === 1 ? 'bathroom' : 'bathrooms'}`,
      amount: bathroomAmount,
    });
  }

  const homeTypeAmount = rateCard.homeTypeAdjustment[input.homeType];
  if (homeTypeAmount !== 0) {
    lines.push({
      label: 'Property type adjustment',
      detail: homeTypes.find((h) => h.id === input.homeType)?.label,
      amount: homeTypeAmount,
    });
  }

  const petAmount = input.pets * rateCard.perPet;
  if (petAmount > 0) {
    lines.push({
      label: 'Pet-friendly time',
      detail: `${input.pets} ${input.pets === 1 ? 'pet' : 'pets'} in the home`,
      amount: petAmount,
    });
  }

  const runningBeforeCondition = lines.reduce((sum, l) => sum + l.amount, 0);
  const conditionMultiplier = rateCard.conditionMultiplier[input.condition];
  const conditionAmount = Math.round(
    runningBeforeCondition * (conditionMultiplier - 1),
  );
  if (conditionAmount !== 0) {
    lines.push({
      label: 'Current condition',
      detail: conditions.find((c) => c.id === input.condition)?.label,
      amount: conditionAmount,
    });
  }

  if (input.occupancy === 'empty') {
    const emptyAmount = Math.round(
      (runningBeforeCondition + conditionAmount) * rateCard.emptyHomeAdjustment,
    );
    lines.push({
      label: 'Empty home',
      detail: 'No furniture to work around',
      amount: emptyAmount,
    });
  }

  const selectedAddOns = addOns.filter((a) => input.addOnIds.includes(a.id));
  for (const addOn of selectedAddOns) {
    lines.push({ label: addOn.label, detail: 'Add-on', amount: addOn.price });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);

  const freq = frequencies.find((f) => f.id === input.frequency)!;
  const frequencyAdjustment = Math.round(subtotal * (freq.multiplier - 1));

  const total = Math.max(rateCard.minimum, subtotal + frequencyAdjustment);

  const minutes =
    rateCard.minutes.base[input.level] +
    input.bedrooms * rateCard.minutes.perBedroom +
    input.bathrooms * rateCard.minutes.perBathroom +
    (input.squareFeet / 1000) * rateCard.minutes.perThousandSqFt +
    selectedAddOns.reduce((sum, a) => sum + a.minutes, 0);

  const adjustedMinutes = Math.round(minutes * conditionMultiplier);
  const teamSize = adjustedMinutes > 330 ? 3 : adjustedMinutes > 190 ? 2 : 1;

  return {
    lines,
    subtotal,
    frequencyAdjustment,
    total,
    low: Math.round(total * 0.92),
    high: Math.round(total * 1.12),
    minutes: adjustedMinutes,
    teamSize,
    perCleanerMinutes: Math.round(adjustedMinutes / teamSize),
  };
}

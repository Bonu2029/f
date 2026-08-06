import type { RoomId, RoomPriorityId } from '@/lib/content/rooms';
import type {
  CleaningLevel,
  Condition,
  EstimateInput,
  Frequency,
  HomeType,
  Occupancy,
} from '@/lib/pricing';

export type HouseholdPreferences = {
  pets: boolean;
  petCount: number;
  children: boolean;
  sensitivities: boolean;
  sensitivityNotes: string;
  workingFromHome: boolean;
  quietClean: boolean;
  noEntryNotes: string;
  shoeHandling: 'remove' | 'covers' | 'no-preference';
  fragileSurfaces: string;
  entryInstructions: string;
  productPreference: 'standard' | 'eco' | 'fragrance-free' | 'customer-supplied';
};

export type CleaningPlan = {
  homeType: HomeType;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  floors: number;
  occupancy: Occupancy;
  rooms: RoomId[];
  priorities: Partial<Record<RoomId, RoomPriorityId[]>>;
  tasks: string[];
  household: HouseholdPreferences;
  frequency: Frequency;
  customFrequencyNote: string;
  condition: Condition;
  mode: string;
};

export const emptyPlan: CleaningPlan = {
  homeType: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  squareFeet: 1100,
  floors: 1,
  occupancy: 'occupied',
  rooms: ['kitchen', 'bathroom', 'bedroom', 'living'],
  priorities: {},
  tasks: [],
  household: {
    pets: false,
    petCount: 0,
    children: false,
    sensitivities: false,
    sensitivityNotes: '',
    workingFromHome: false,
    quietClean: false,
    noEntryNotes: '',
    shoeHandling: 'no-preference',
    fragileSurfaces: '',
    entryInstructions: '',
    productPreference: 'standard',
  },
  frequency: 'biweekly',
  customFrequencyNote: '',
  condition: 'typical',
  mode: 'everyday-reset',
};

/**
 * Chooses the service that best matches a plan's scope, so the summary can name
 * a real service rather than leaving the customer to guess.
 */
export function recommendLevel(plan: CleaningPlan): CleaningLevel {
  if (plan.occupancy === 'empty') return 'move';
  if (plan.homeType === 'rental') return 'turnover';

  const detailedRooms = Object.values(plan.priorities).filter((list) =>
    list?.includes('detailed'),
  ).length;

  if (plan.condition === 'first-visit' || plan.condition === 'needs-attention') return 'deep';
  if (detailedRooms >= 3) return 'deep';
  if (plan.frequency !== 'one-time') return 'recurring';
  return 'standard';
}

export function planToEstimateInput(plan: CleaningPlan): EstimateInput {
  return {
    level: recommendLevel(plan),
    homeType: plan.homeType,
    squareFeet: plan.squareFeet,
    bedrooms: plan.bedrooms,
    bathrooms: plan.bathrooms,
    pets: plan.household.pets ? Math.max(1, plan.household.petCount) : 0,
    condition: plan.condition,
    frequency: plan.frequency,
    occupancy: plan.occupancy,
    addOnIds: plan.tasks,
  };
}

export function recommendMode(plan: CleaningPlan) {
  if (plan.household.quietClean) return 'Quiet Clean';
  if (plan.household.productPreference === 'fragrance-free') return 'Fragrance-Free Clean';
  if (plan.household.pets) return 'Pet-Friendly Clean';
  if (plan.condition === 'first-visit') return 'Deep Restore';
  return 'Everyday Reset';
}

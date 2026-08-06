import type { CleaningLevel } from '@/lib/pricing';

export type ServiceDetail = {
  slug: string;
  name: string;
  level: CleaningLevel;
  eyebrow: string;
  headline: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  heroImageId: string;
  bestFor: string[];
  included: { group: string; items: string[] }[];
  notIncluded: string[];
  addOnIds: string[];
  preparation: string[];
  duration: string;
  faqs: { q: string; a: string }[];
  relatedSlugs: string[];
};

export const services: ServiceDetail[] = [
  {
    slug: 'standard-cleaning',
    name: 'Standard Cleaning',
    level: 'standard',
    eyebrow: 'Everyday Reset',
    headline: 'The visit that keeps a home in rhythm.',
    summary:
      'A full pass through the rooms you use most: surfaces, floors, kitchen, bathrooms and the small resets that make a home feel settled again.',
    metaTitle: 'Standard Cleaning',
    metaDescription:
      'A maintenance cleaning visit covering surfaces, floors, kitchen, bathrooms and general reset — built around your saved preferences.',
    heroImageId: 'svc-standard-hero',
    bestFor: [
      'Homes cleaned within the last few weeks',
      'Busy professionals who want a dependable weekly or biweekly rhythm',
      'Families keeping ahead of everyday use',
      'Anyone maintaining the result of a previous deep clean',
    ],
    included: [
      {
        group: 'Throughout the home',
        items: [
          'Surface dusting on reachable surfaces',
          'Floors vacuumed and mopped by surface type',
          'Trash removed and liners replaced',
          'Mirrors and glass surfaces cleaned',
          'Beds straightened and cushions reset',
          'General tidying of visible clutter into logical places',
        ],
      },
      {
        group: 'Kitchen',
        items: [
          'Counters, backsplash and sink cleaned',
          'Exterior of appliances wiped',
          'Stovetop and range surface cleaned',
          'Table and seating surfaces wiped',
        ],
      },
      {
        group: 'Bathrooms',
        items: [
          'Toilets cleaned inside and out',
          'Showers, tubs and glass wiped down',
          'Vanities, sinks and fixtures polished',
          'Floors cleaned along edges and behind doors',
        ],
      },
    ],
    notIncluded: [
      'Interior of the refrigerator or oven (available as add-ons)',
      'Interior windows, tracks and screens (available as an add-on)',
      'Wall washing beyond light spot-cleaning',
      'Heavy buildup that needs deep-cleaning time',
      'Moving heavy furniture or appliances',
      'Exterior areas, garages and crawl spaces',
      'Biohazard, mold remediation or pest-related work',
    ],
    addOnIds: ['fridge', 'oven', 'windows', 'laundry', 'linens', 'pet-hair'],
    preparation: [
      'Clear counters of items you would like cleaned underneath',
      'Note any rooms marked as Do Not Disturb Zones in your profile',
      'Secure valuables, medications and personal documents',
      'Let us know where pets will be during the visit',
    ],
    duration: 'Most homes: 1.5–3 hours, depending on size and condition.',
    faqs: [
      {
        q: 'Do I need to be home during the cleaning?',
        a: 'No. Many customers save entry instructions in their home profile and are out during the visit. If you prefer to be home, that is completely fine — you can also set Quiet Clean preferences so the visit stays low-interruption.',
      },
      {
        q: 'Do you bring supplies and equipment?',
        a: 'Yes. Our team arrives with professional products and equipment. If you prefer eco-conscious, fragrance-free or customer-provided products, set that in the Product Preference Center and we will follow it.',
      },
      {
        q: 'What if my home needs more than a standard visit?',
        a: 'We will tell you before we start rather than quietly running long. For homes with buildup or a long gap since the last cleaning, a Deep Cleaning first visit usually produces a better baseline.',
      },
    ],
    relatedSlugs: ['deep-cleaning', 'recurring-cleaning'],
  },
  {
    slug: 'deep-cleaning',
    name: 'Deep Cleaning',
    level: 'deep',
    eyebrow: 'Deep Restore',
    headline: 'For everything a routine visit passes by.',
    summary:
      'Detailed, slower work on buildup, edges, frames and fixtures — the reset that gives a home a clean baseline to maintain.',
    metaTitle: 'Deep Cleaning',
    metaDescription:
      'A detailed cleaning visit covering baseboards, door frames, fixtures, buildup removal and hard-to-reach areas throughout the home.',
    heroImageId: 'svc-deep-hero',
    bestFor: [
      'First-time LumaNest visits',
      'Homes that have gone a while between cleanings',
      'Seasonal resets in spring and autumn',
      'Preparing for a new baby, a houseguest or a photo shoot',
      'Anyone starting a recurring plan on a strong baseline',
    ],
    included: [
      {
        group: 'Detail work',
        items: [
          'Baseboards hand-wiped throughout',
          'Door frames, doors and switch plates cleaned',
          'Reachable light fixtures and ceiling fans dusted',
          'Vent covers and register faces wiped',
          'Corners, edges and behind-door floor areas addressed',
        ],
      },
      {
        group: 'Kitchen detail',
        items: [
          'Cabinet exteriors degreased and detailed',
          'Backsplash grout lines addressed',
          'Range hood exterior and filter face cleaned',
          'Small appliance exteriors detailed',
          'Sink fixtures descaled where possible',
        ],
      },
      {
        group: 'Bathroom detail',
        items: [
          'Soap and mineral buildup removed from tile and glass',
          'Grout lines scrubbed where the surface allows',
          'Fixtures, tracks and drains detailed',
          'High-touch surfaces sanitized',
        ],
      },
    ],
    notIncluded: [
      'Refinishing, resealing or re-grouting',
      'Stain removal that requires restoration work',
      'Interior of appliances unless added as an add-on',
      'Exterior windows or anything requiring a tall ladder',
      'Mold remediation or water-damage response',
      'Moving heavy furniture or appliances',
    ],
    addOnIds: ['fridge', 'oven', 'windows', 'cabinets', 'walls', 'fixtures', 'closets'],
    preparation: [
      'Clear surfaces you want detailed underneath',
      'Point out any fragile or antique finishes in your home profile',
      'Plan for a longer visit than a standard cleaning',
      'Tell us your three Priority Zones so the extra time lands where it matters',
    ],
    duration: 'Most homes: 3–6 hours, often with a two-person team.',
    faqs: [
      {
        q: 'How often does a home need a deep cleaning?',
        a: 'Many households do one or two per year alongside a recurring plan. Homes with pets, heavy cooking or high traffic sometimes prefer a quarterly cadence.',
      },
      {
        q: 'Will a deep cleaning remove every stain?',
        a: 'No, and we would rather say that clearly. Some marks are permanent surface damage rather than soil. We will tell you what we found and what would need a restoration specialist.',
      },
      {
        q: 'Can I book a deep clean for only part of the home?',
        a: 'Yes. In Build Your Clean you can set a detailed clean on specific rooms and a standard reset elsewhere.',
      },
    ],
    relatedSlugs: ['standard-cleaning', 'move-in-move-out'],
  },
  {
    slug: 'move-in-move-out',
    name: 'Move-In & Move-Out Cleaning',
    level: 'move',
    eyebrow: 'Transitions',
    headline: 'An empty property, returned to a clean baseline.',
    summary:
      'Cabinets, closets, baseboards, bathrooms and floors handled end to end — for the day a property changes hands.',
    metaTitle: 'Move-In & Move-Out Cleaning',
    metaDescription:
      'Empty-home cleaning covering cabinets, drawers, closets, baseboards, bathrooms and floors, with appliance interiors available as add-ons.',
    heroImageId: 'svc-move-hero',
    bestFor: [
      'Tenants preparing for a final walkthrough',
      'Buyers who want a clean start before furniture arrives',
      'Property managers turning a unit between residents',
      'Anyone handing over keys on a deadline',
    ],
    included: [
      {
        group: 'Whole property',
        items: [
          'Floors cleaned throughout, edges included',
          'Baseboards, door frames and switch plates wiped',
          'Reachable light fixtures dusted',
          'Interior window sills and tracks wiped',
          'Final walkthrough reset',
        ],
      },
      {
        group: 'Storage',
        items: [
          'Cabinet and drawer interiors wiped',
          'Closet shelves and floors cleaned',
          'Pantry shelving wiped',
          'Laundry area cleaned around connections',
        ],
      },
      {
        group: 'Kitchen & bathrooms',
        items: [
          'Counters, sinks and fixtures detailed',
          'Appliance exteriors cleaned',
          'Showers, tubs and toilets fully cleaned',
          'Mirrors and glass finished',
        ],
      },
    ],
    notIncluded: [
      'Trash, debris or belongings left behind',
      'Paint touch-ups, patching or repairs',
      'Carpet shampooing or floor refinishing',
      'Garages, balconies or exterior areas unless added',
      'Appliance interiors unless selected as add-ons',
      'Anything requiring utilities that are already shut off',
    ],
    addOnIds: ['fridge', 'oven', 'windows', 'cabinets', 'closets', 'balcony', 'walls'],
    preparation: [
      'Have the property fully empty of belongings and trash',
      'Confirm water and electricity will be on during the visit',
      'Share entry details, lockbox codes or building access rules',
      'Send your lease or management checklist if there is one to match',
    ],
    duration: 'Most units: 4–8 hours, usually with a two- or three-person team.',
    faqs: [
      {
        q: 'Can you match my landlord or management checklist?',
        a: 'Send it with your booking and we will build the plan around it. We will flag anything on the list that falls outside cleaning work — repairs, painting or replacements — so nothing is assumed.',
      },
      {
        q: 'What if the property is not empty yet?',
        a: 'We can still clean, but the result is different and the estimate changes. Tell us in advance so the plan reflects what is actually there.',
      },
      {
        q: 'Do you guarantee a deposit refund?',
        a: 'No. That decision belongs to your landlord or management company. We can document the completed checklist so you have a clear record of what was done.',
      },
    ],
    relatedSlugs: ['deep-cleaning', 'airbnb-cleaning'],
  },
  {
    slug: 'recurring-cleaning',
    name: 'Recurring Cleaning',
    level: 'recurring',
    eyebrow: 'Consistency',
    headline: 'A plan we keep, so you never re-explain your home.',
    summary:
      'Weekly, biweekly, every four weeks or a custom rhythm — with your saved plan, preferences and rotating detail focus applied every visit.',
    metaTitle: 'Recurring Cleaning',
    metaDescription:
      'Weekly, biweekly or every-four-week cleaning with a saved plan, preferred scheduling, rotating detail focus and member pricing.',
    heroImageId: 'svc-recurring-hero',
    bestFor: [
      'Households where cleaning keeps sliding down the list',
      'Homes with pets, children or heavy daily use',
      'People who want the same plan followed without repeating it',
      'Anyone maintaining a deep-clean baseline',
    ],
    included: [
      {
        group: 'Every visit',
        items: [
          'Your saved room plan, followed the same way each time',
          'Priority Zones handled first',
          'Do Not Disturb Zones respected without asking again',
          'Product and fragrance preferences applied',
          'A completed-service checklist after each visit',
        ],
      },
      {
        group: 'Rotating detail focus',
        items: [
          'One detailed area per visit, chosen from your rotation',
          'Baseboards, cabinet fronts, doors and frames',
          'Light fixtures and interior windows',
          'Laundry area or closet organization',
        ],
      },
      {
        group: 'Scheduling',
        items: [
          'Preferred day and arrival window',
          'Priority rescheduling for members',
          'Seasonal reset reminders you can decline',
          'Guest-Ready conversion for any upcoming visit',
        ],
      },
    ],
    notIncluded: [
      'Deep-clean scope on every visit — that is a separate service',
      'Appliance interiors unless part of your rotation or added',
      'Post-construction or post-renovation cleanup',
      'Unlimited add-ons; each one is priced and shown before the visit',
    ],
    addOnIds: ['fridge', 'oven', 'linens', 'laundry', 'pet-hair', 'organization'],
    preparation: [
      'Complete your Home Profile once so future visits need no setup',
      'Choose your three Priority Zones',
      'Pick a rotating detail focus order',
      'Tell us your preferred arrival window and communication style',
    ],
    duration: 'Most homes: 1.5–3 hours per visit once the plan settles.',
    faqs: [
      {
        q: 'Will I have the same cleaner each time?',
        a: 'We aim for consistency and note it as a preference on your profile. We will not promise it absolutely, because schedules, illness and time off are real. When the assigned person changes, your saved plan travels with the appointment.',
      },
      {
        q: 'Can I skip or reschedule a visit?',
        a: 'Yes. Reschedule from your dashboard. Members get priority access to alternate windows. Cancellation timing rules are stated on the membership page.',
      },
      {
        q: 'Does the price change between visits?',
        a: 'Only if the scope changes — you add rooms, add-ons or the property details differ substantially from what was submitted.',
      },
    ],
    relatedSlugs: ['standard-cleaning', 'airbnb-cleaning'],
  },
  {
    slug: 'airbnb-cleaning',
    name: 'Airbnb & Rental Turnover',
    level: 'turnover',
    eyebrow: 'Turnover',
    headline: 'Guest-ready, documented, and on the clock.',
    summary:
      'A reset built for hosting: linens coordinated, supplies restocked, photo confirmation sent and anything missing or damaged reported before the next check-in.',
    metaTitle: 'Airbnb & Rental Turnover Cleaning',
    metaDescription:
      'Short-term rental turnover cleaning with linen coordination, restocking checklists, photo confirmation and damage or missing-item reporting.',
    heroImageId: 'svc-airbnb-hero',
    bestFor: [
      'Short-term rental hosts',
      'Property managers with several units',
      'Owners handling same-day check-outs and check-ins',
      'Anyone who needs proof the unit was reset',
    ],
    included: [
      {
        group: 'Guest-ready reset',
        items: [
          'Full clean of living areas, kitchen and bathrooms',
          'Beds stripped and remade with fresh linens',
          'Towels replaced and folded to your standard',
          'Presentation details staged to your reference photos',
        ],
      },
      {
        group: 'Operations',
        items: [
          'Restocking checklist completed from your supply list',
          'Photo confirmation of each finished room',
          'Damage or missing-item notes with photos',
          'Low-supply alerts before you run out',
          'Same-day turnover scheduling where availability allows',
        ],
      },
    ],
    notIncluded: [
      'Guest communication or listing management',
      'Laundry taken off site unless arranged separately',
      'Maintenance, repairs or furniture assembly',
      'Storing or shipping items guests leave behind',
      'Guaranteed same-day availability during peak periods',
    ],
    addOnIds: ['linens', 'laundry', 'fridge', 'windows', 'balcony', 'post-event'],
    preparation: [
      'Share your restocking list and preferred staging photos',
      'Confirm linen storage location and par levels',
      'Provide access details and any building rules',
      'Tell us the check-out and check-in times we are working between',
    ],
    duration: 'Most units: 1.5–4 hours depending on size and linen scope.',
    faqs: [
      {
        q: 'Can you handle same-day turnovers?',
        a: 'Often, but we will not guarantee it in advance. Send the dates and we will confirm the nearest available window in writing.',
      },
      {
        q: 'What happens if something is damaged or missing?',
        a: 'We document it with photos and notes and send it to you before the next guest arrives. We do not dispose of anything or make judgment calls about guest belongings.',
      },
      {
        q: 'Do you provide linens?',
        a: 'We coordinate the linens you supply and can arrange laundry as an add-on. Linen purchasing is not included.',
      },
    ],
    relatedSlugs: ['recurring-cleaning', 'move-in-move-out'],
  },
];

export function getService(slug: string) {
  return services.find((s) => s.slug === slug);
}

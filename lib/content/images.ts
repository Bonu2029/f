/**
 * Image slots
 * -----------
 * Every visual placeholder on the site is registered here with the alt text it
 * should ship with, a tone (which drives the placeholder gradient) and the
 * art-direction prompt used to commission or generate the final photograph.
 *
 * When a real asset arrives, set `src` to its path in /public and the
 * <EditorialImage> component renders the photograph instead of the placeholder.
 *
 * Before/after slots carry two frames: `src` is the cleaned result and
 * `beforeSrc` the starting state. Until both exist, <ComparisonSlider> simulates
 * the before state by desaturating the single image it has.
 */

export type ImageTone = 'mint' | 'airy' | 'champagne' | 'lavender' | 'pearl';

export type ImageSlot = {
  id: string;
  alt: string;
  tone: ImageTone;
  label: string;
  prompt: string;
  src?: string;
  /** Before/after pairs only — must be shot from an identical camera position. */
  beforeSrc?: string;
  beforeAlt?: string;
};

export const imageSlots: ImageSlot[] = [
  {
    id: 'home-hero',
    label: 'Homepage hero',
    tone: 'mint',
    alt: 'Morning light crossing a bright living room with a cream linen sofa, a slender potted tree and a low wooden table holding eucalyptus',
    prompt:
      'Editorial interior photograph of a bright, uncluttered living room in warm ivory and soft sage tones, early morning sunlight raking across a linen sofa and pale oak floor, sheer curtains diffusing the light, a low wooden coffee table with a ceramic vase of eucalyptus, faint dust motes visible in the light beam, no people, no text, no logos, natural color grading, shallow depth of field, 35mm, horizontal composition with generous empty space on the left for headline text.',
    src: '/images/home-hero.jpg',
  },
  {
    id: 'home-reset-editorial',
    label: 'Homepage — home reset editorial',
    tone: 'champagne',
    alt: 'A calm entryway with a light oak bench, a folded cream throw, a stone tray holding keys and a pair of shoes set squarely beneath',
    prompt:
      'Editorial photograph of a calm residential entryway: pale plaster wall, light oak bench with a neatly folded cream throw, a small ceramic tray holding keys, a pair of shoes set squarely beneath the bench, soft daylight from a side window, warm ivory and champagne beige palette, no people, no readable text or brand marks, quiet luxury magazine styling, vertical composition.',
    src: '/images/home-reset-editorial.jpg',
  },
  {
    id: 'home-modes',
    label: 'Homepage — cleaning modes band',
    tone: 'airy',
    alt: 'Folded white and sage towels stacked on a pale shelf beside a blank-labelled glass bottle and a sprig of eucalyptus',
    prompt:
      'Close editorial still life of freshly folded white and sage towels stacked on a pale wooden shelf beside a small glass bottle of unscented cleaner with a blank label, soft directional daylight, warm white background, minimal styling, no text, no logos, no hands, 50mm macro feel, horizontal composition.',
    src: '/images/home-modes.jpg',
  },
  {
    id: 'home-membership',
    label: 'Homepage — membership preview',
    tone: 'lavender',
    alt: 'A peaceful bedroom with white and soft lavender linen bedding, a rectangle of morning light on the plaster wall, and a nightstand holding a glass of water and a blank-covered book',
    prompt:
      'Editorial photograph of a peaceful bedroom with crisp white and soft lavender bedding, a single linen cushion, pale plaster walls, morning light falling in a soft rectangle across the wall and duvet, minimal nightstand with a glass of water and a small book with a blank cover, no people, no text, no logos, calm quiet-luxury styling, horizontal composition.',
    src: '/images/home-membership.jpg',
  },
  {
    id: 'services-hero',
    label: 'Services index hero',
    tone: 'mint',
    alt: 'A bright kitchen with sage-green cabinets, clear pale stone counters and a bowl of lemons',
    prompt:
      'Editorial photograph of a bright modern kitchen with clear pale stone counters, matte sage lower cabinets, warm white uppers, a shallow bowl of lemons, brushed brass tap catching daylight, no clutter, no people, no visible brand names or text, soft natural light from a window on the right, horizontal composition with room for an overlay on the left.',
    src: '/images/services-hero.jpg',
  },
  {
    id: 'svc-standard-hero',
    label: 'Standard Cleaning hero',
    tone: 'pearl',
    alt: 'A tidy living area with a neutral sofa, straightened cushions, a folded throw over the arm and a wool rug on a clear floor',
    prompt:
      'Editorial interior photograph of a tidy everyday living area: neutral sofa with cushions straightened, a soft wool rug, clear pale floor, folded throw over the sofa arm, small stack of magazines with blank covers, warm ivory light, no people, no text, no logos, calm realistic styling, horizontal composition.',
    src: '/images/svc-standard-hero.jpg',
  },
  {
    id: 'svc-deep-hero',
    label: 'Deep Cleaning hero',
    tone: 'airy',
    alt: 'Close detail of a spotless white baseboard meeting a pale oak floor, with low raking daylight across the grain',
    prompt:
      'Close editorial detail photograph of a spotless white baseboard meeting a pale oak floor, low raking daylight revealing clean edges and grain, soft shadow gradient, warm neutral palette, extremely minimal, no people, no cleaning products in frame, no text, horizontal composition, shallow depth of field.',
    src: '/images/svc-deep-hero.jpg',
  },
  {
    id: 'svc-move-hero',
    label: 'Move-In / Move-Out hero',
    tone: 'pearl',
    alt: 'An empty room with bare pale wood floors, two tall windows casting rectangles of light, and an open door onto an empty hallway',
    prompt:
      'Editorial photograph of a completely empty residential room with bare pale wood floors, freshly cleaned white walls, two tall windows casting overlapping rectangles of daylight on the floor, a single open door to an empty hallway, no furniture, no people, no boxes, no text, quiet architectural composition, horizontal.',
    src: '/images/svc-move-hero.jpg',
  },
  {
    id: 'svc-recurring-hero',
    label: 'Recurring Cleaning hero',
    tone: 'mint',
    alt: 'An organized open shelving unit holding ceramic bowls, folded linens, a small potted plant and blank-spined books',
    prompt:
      'Editorial photograph of an organized open shelving unit in a bright home: neatly spaced ceramic bowls, folded linens, a small potted plant, books with blank spines, pale wood and warm white palette, soft even daylight, no people, no readable text, calm minimal styling, horizontal composition.',
    src: '/images/svc-recurring-hero.jpg',
  },
  {
    id: 'svc-airbnb-hero',
    label: 'Airbnb Turnover hero',
    tone: 'champagne',
    alt: 'A guest bedroom staged for arrival with crisp white bedding, a linen runner, and two folded towels with olive sprigs at the foot of the bed',
    prompt:
      'Editorial photograph of a guest bedroom staged for arrival: crisp white bedding with hotel-style folded corners, two folded towels with a sprig of greenery at the foot of the bed, warm champagne and ivory palette, bedside carafe and glass, soft afternoon light through a linen curtain, no people, no text, no logos, horizontal composition.',
    src: '/images/svc-airbnb-hero.jpg',
  },
  {
    id: 'how-it-works-hero',
    label: 'How It Works hero',
    tone: 'airy',
    alt: 'Window-frame shadows falling across a clean pale stone counter, with a glass of water and a folded cloth',
    prompt:
      'Editorial photograph of sunlight moving across a clean, empty kitchen counter, window frame shadow falling across pale stone, a single glass of water and a folded cloth at the edge of frame, warm ivory and airy blue reflections, no people, no text, no products with labels, horizontal composition with generous negative space.',
    src: '/images/how-it-works-hero.jpg',
  },
  {
    id: 'about-hero',
    label: 'About hero',
    tone: 'champagne',
    alt: 'A sunlit dining nook with a round wooden table, a jug of white flowers and a sheer curtain glowing with backlight',
    prompt:
      'Editorial photograph of a sunlit dining nook: round pale wood table, two simple chairs, a small jug of fresh white flowers, warm plaster wall, sheer curtain glowing with backlight, warm ivory and champagne palette, no people, no text, no logos, gentle film grain, horizontal composition.',
    src: '/images/about-hero.jpg',
  },
  {
    id: 'trust-hero',
    label: 'Trust & Safety hero',
    tone: 'lavender',
    alt: 'A sage-green front door with the porch lantern lit above a clean stone step and a planted pot',
    prompt:
      'Editorial photograph of a residential front door in soft sage green with a brushed handle, clean stone step, small planted pot beside the frame, early evening light, calm and secure feeling, no house numbers, no text, no people, no signage, vertical-friendly horizontal composition.',
    src: '/images/trust-hero.jpg',
  },
  {
    id: 'locations-hero',
    label: 'Locations hero',
    tone: 'airy',
    alt: 'A quiet tree-lined residential street at morning, sunlight filtering through the canopy onto pale sidewalks and hydrangea beds',
    prompt:
      'Editorial photograph of a quiet residential street at morning: soft light filtering through street trees onto pale sidewalks and low front gardens, no readable street signs, no license plates, no people, no text, gentle haze, warm neutral grading, horizontal composition.',
    src: '/images/locations-hero.jpg',
  },
  {
    id: 'membership-hero',
    label: 'Membership hero',
    tone: 'lavender',
    alt: 'A serene reading corner with a cream armchair, a soft lavender throw and cushion, and a marble side table holding a ceramic cup',
    prompt:
      'Editorial photograph of a serene reading corner: a pale upholstered armchair, a soft folded blanket, a small side table with a ceramic cup, tall window with sheer curtain behind, warm ivory with soft lavender shadows, no people, no text, no logos, quiet luxury styling, horizontal composition.',
    src: '/images/membership-hero.jpg',
  },
  {
    id: 'contact-hero',
    label: 'Contact hero',
    tone: 'mint',
    alt: 'A sunlit sill with a closed blank-covered notebook, a glass of water and a small sage vase holding a single white stem',
    prompt:
      'Editorial photograph of a clean pale desk surface beside a window: a closed notebook with a blank cover, a glass of water, a small vase with a single stem, soft daylight and a long clean shadow, warm ivory and mint tones, no people, no text, no screens, horizontal composition.',
    src: '/images/contact-hero.jpg',
  },
  {
    id: 'ba-kitchen',
    label: 'Before/After — kitchen',
    tone: 'mint',
    alt: 'The same kitchen island after cleaning: the stone counter cleared and polished, the cooktop wiped and a bowl of lemons on the back counter',
    beforeAlt:
      'A kitchen island in everyday use: crumbs and a used plate on the counter, a cafetière, a mug, a glass and a bunched tea towel',
    prompt:
      'A matched pair of editorial photographs of the same kitchen counter and stovetop from an identical camera position and identical lighting. Frame A: everyday use — crumbs, a few dishes, cluttered counter, dull surfaces. Frame B: the same counter fully cleaned, clear, polished stone, appliances wiped, a small bowl of lemons added. Warm ivory palette, natural daylight, no people, no readable brand names or text, horizontal composition, identical framing between the two frames.',
    src: '/images/ba-kitchen.jpg',
    beforeSrc: '/images/ba-kitchen-before.jpg',
  },
  {
    id: 'ba-bathroom',
    label: 'Before/After — bathroom',
    tone: 'airy',
    alt: 'The same bathroom after cleaning: shower glass clear and streak-free, the vanity cleared and polished, and two folded white towels set on the counter',
    beforeAlt:
      'A bathroom with water spots across the shower glass, a cluttered vanity holding bottles and a hairbrush, and a used cloth on the counter',
    prompt:
      'A matched pair of editorial photographs of the same bathroom vanity and shower glass from an identical camera position. Frame A: water spots on glass, cluttered vanity, dull chrome. Frame B: the same space clear and cleaned, glass streak-free, chrome polished, two folded white towels added. Soft airy blue and warm white palette, daylight from a frosted window, no people, no readable labels or text, horizontal composition, identical framing.',
    src: '/images/ba-bathroom.jpg',
    beforeSrc: '/images/ba-bathroom-before.jpg',
  },
  {
    id: 'ba-living',
    label: 'Before/After — living room',
    tone: 'pearl',
    alt: 'Living room comparison, demonstration image',
    prompt:
      'A matched pair of editorial photographs of the same living room from an identical camera position. Frame A: cushions askew, throw blanket bunched, items scattered on the coffee table, dusty surfaces. Frame B: the same room reset — cushions straightened, throw folded, table clear with a single ceramic vase, floors vacuumed with visible clean lines in the rug. Warm neutral palette, soft daylight, no people, no text, horizontal composition, identical framing.',
  },
  {
    id: 'ba-moveout',
    label: 'Before/After — move-out apartment',
    tone: 'champagne',
    alt: 'Empty apartment comparison, demonstration image',
    prompt:
      'A matched pair of editorial photographs of the same empty apartment room from an identical camera position. Frame A: post-move state — scuffed floor, dust along baseboards, marks on the wall, an empty closet with debris. Frame B: the same room fully cleaned — floor gleaming, baseboards spotless, walls spot-cleaned, closet empty and wiped. Pale neutral palette, daylight from an uncovered window, no furniture, no people, no text, horizontal composition, identical framing.',
  },
  {
    id: 'ba-bedroom',
    label: 'Before/After — bedroom',
    tone: 'lavender',
    alt: 'Bedroom comparison, demonstration image',
    prompt:
      'A matched pair of editorial photographs of the same bedroom from an identical camera position. Frame A: unmade bed, clothes over a chair, cluttered nightstand. Frame B: the same bedroom reset — crisp linens neatly made, chair clear, nightstand holding only a lamp and a glass of water, floor vacuumed. Warm ivory with soft lavender shadows, morning light, no people, no text, horizontal composition, identical framing.',
  },
  {
    id: 'ba-turnover',
    label: 'Before/After — rental turnover',
    tone: 'champagne',
    alt: 'Short-term rental turnover comparison, demonstration image',
    prompt:
      'A matched pair of editorial photographs of the same short-term rental living space from an identical camera position. Frame A: post-checkout — used glasses on the table, cushions displaced, towels left on a chair. Frame B: the same space guest-ready — surfaces cleared and polished, cushions staged, fresh folded towels with greenery, a welcome tray with blank-labelled items. Warm champagne and ivory palette, afternoon light, no people, no readable text or branding, horizontal composition, identical framing.',
  },
  {
    id: 'ba-deep-kitchen',
    label: 'Before/After — deep clean detail',
    tone: 'mint',
    alt: 'Oven and range detail comparison, demonstration image',
    prompt:
      'A matched pair of close editorial detail photographs of the same range and backsplash from an identical camera position. Frame A: cooking residue on the backsplash, dull burner grates, grease film. Frame B: the same surfaces fully degreased, grates dark and matte-clean, backsplash tile bright and streak-free. Neutral warm palette, soft directional light, no people, no cleaning products in frame, no text, horizontal composition, identical framing.',
  },
  {
    id: 'dashboard-report',
    label: 'Cleaning report — sample photo slot',
    tone: 'pearl',
    alt: 'Placeholder for a customer-approved completed-room photograph',
    prompt:
      'Editorial photograph of a finished, freshly cleaned room corner — clear surfaces, straightened cushions, vacuum lines on a light rug, soft daylight. Deliberately generic and non-identifying: no personal items, no photographs on walls, no mail, no people, no text. Warm neutral palette, horizontal composition. Used only as a demonstration stand-in for customer-approved report photos.',
  },
];

export function getImage(id: string) {
  return imageSlots.find((slot) => slot.id === id);
}

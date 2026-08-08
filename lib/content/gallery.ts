/**
 * DEMONSTRATION GALLERY
 * ---------------------
 * Every entry below is a demonstration example created for this website. None
 * of it represents a verified customer project, and the UI labels each item as
 * a demonstration. Verified customer work — published only with written
 * permission — should be added with `verified: true` and a real project date.
 */

export type GalleryFilter =
  | 'kitchens'
  | 'bathrooms'
  | 'bedrooms'
  | 'living-rooms'
  | 'move-out'
  | 'deep-cleaning'
  | 'rental-turnover';

export type GalleryItem = {
  id: string;
  title: string;
  imageId: string;
  filters: GalleryFilter[];
  serviceType: string;
  serviceHref: string;
  duration: string;
  areas: string[];
  description: string;
  verified: false;
};

export const galleryFilters: { id: GalleryFilter; label: string }[] = [
  { id: 'kitchens', label: 'Kitchens' },
  { id: 'bathrooms', label: 'Bathrooms' },
  { id: 'bedrooms', label: 'Bedrooms' },
  { id: 'living-rooms', label: 'Living rooms' },
  { id: 'move-out', label: 'Move-out cleaning' },
  { id: 'deep-cleaning', label: 'Deep cleaning' },
  { id: 'rental-turnover', label: 'Rental turnover' },
];

export const galleryItems: GalleryItem[] = [
  {
    id: 'kitchen-reset',
    title: 'Kitchen counter and stovetop reset',
    imageId: 'ba-kitchen',
    filters: ['kitchens', 'deep-cleaning'],
    serviceType: 'Deep Cleaning',
    serviceHref: '/services/deep-cleaning',
    duration: 'About 90 minutes for this area',
    areas: ['Counters and backsplash', 'Stovetop and grates', 'Sink and fixtures', 'Cabinet fronts'],
    description:
      'Cooking residue lifted from the backsplash and range, counters cleared and polished, cabinet fronts degreased along the handle line.',
    verified: false,
  },
  {
    id: 'bathroom-glass',
    title: 'Shower glass and vanity detail',
    imageId: 'ba-bathroom',
    filters: ['bathrooms', 'deep-cleaning'],
    serviceType: 'Deep Cleaning',
    serviceHref: '/services/deep-cleaning',
    duration: 'About 60 minutes for this area',
    areas: ['Shower glass', 'Tile and grout lines', 'Vanity and fixtures', 'Floor edges'],
    description:
      'Mineral buildup addressed on glass and fixtures, grout lines scrubbed where the surface allowed, vanity cleared and finished streak-free.',
    verified: false,
  },
  {
    id: 'living-room-reset',
    title: 'Living room everyday reset',
    imageId: 'ba-living',
    filters: ['living-rooms'],
    serviceType: 'Standard Cleaning',
    serviceHref: '/services/standard-cleaning',
    duration: 'About 35 minutes for this area',
    areas: ['Surfaces and shelves', 'Upholstery', 'Rug and floor edges', 'Glass and screens'],
    description:
      'Surfaces dusted and cleared, cushions and throws reset, upholstery vacuumed and floors finished to the edges.',
    verified: false,
  },
  {
    id: 'moveout-unit',
    title: 'Move-out apartment, final reset',
    imageId: 'ba-moveout',
    filters: ['move-out'],
    serviceType: 'Move-Out Cleaning',
    serviceHref: '/services/move-in-move-out',
    duration: 'About 5 hours, two-person team',
    areas: ['Floors throughout', 'Baseboards and frames', 'Closets and cabinets', 'Bathrooms'],
    description:
      'An empty one-bedroom returned to a clean baseline: floors cleaned to the edges, baseboards hand-wiped, closets and cabinet interiors emptied and cleaned.',
    verified: false,
  },
  {
    id: 'bedroom-refresh',
    title: 'Bedroom refresh with linen change',
    imageId: 'ba-bedroom',
    filters: ['bedrooms'],
    serviceType: 'Standard Cleaning + linen change',
    serviceHref: '/services/standard-cleaning',
    duration: 'About 30 minutes for this room',
    areas: ['Bed and linens', 'Nightstands and dresser', 'Mirrors', 'Floors'],
    description:
      'Fresh linens, surfaces dusted and cleared, mirrors finished and floors vacuumed including reachable under-bed edges.',
    verified: false,
  },
  {
    id: 'turnover-unit',
    title: 'Short-term rental turnover',
    imageId: 'ba-turnover',
    filters: ['rental-turnover', 'living-rooms'],
    serviceType: 'Airbnb & Rental Turnover',
    serviceHref: '/services/airbnb-cleaning',
    duration: 'About 2 hours between stays',
    areas: ['Living area', 'Kitchen', 'Linens and towels', 'Restocking checklist'],
    description:
      'Guest-ready reset with linens changed, supplies restocked against the host checklist and photo confirmation sent before the next check-in.',
    verified: false,
  },
  {
    id: 'range-detail',
    title: 'Range and backsplash degreasing',
    imageId: 'ba-deep-kitchen',
    filters: ['kitchens', 'deep-cleaning'],
    serviceType: 'Deep Cleaning',
    serviceHref: '/services/deep-cleaning',
    duration: 'About 45 minutes for this detail',
    areas: ['Range surface', 'Burner grates', 'Backsplash tile', 'Range hood face'],
    description:
      'Layered cooking residue removed with a non-caustic degreaser, grates cleaned and the backsplash returned to an even finish.',
    verified: false,
  },
];

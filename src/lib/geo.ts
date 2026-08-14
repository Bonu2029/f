/**
 * Geo helpers. Distance is computed locally so the marketplace ranks results
 * without a network round-trip; when a real geocoder is added, only
 * `resolveLocation` needs to change.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 0.83 → "0.8 mi" · 12.4 → "12 mi" */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return "Nearby";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/**
 * Project a lat/lng into 0–1 space within a bounding box, for the map canvas.
 * Keeping this pure means swapping in Mapbox/Google later touches one file.
 */
export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function project(point: LatLng, bounds: Bounds): { x: number; y: number } {
  const x = (point.lng - bounds.west) / (bounds.east - bounds.west);
  const y = (bounds.north - point.lat) / (bounds.north - bounds.south);
  return { x: clamp01(x), y: clamp01(y) };
}

export function boundsFor(points: LatLng[], padding = 0.012): Bounds {
  if (points.length === 0) {
    return { north: 40.02, south: 39.9, east: -75.1, west: -75.23 };
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    north: Math.max(...lats) + padding,
    south: Math.min(...lats) - padding,
    east: Math.max(...lngs) + padding,
    west: Math.min(...lngs) - padding,
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/* ============================================================================
 * GOOGLE REVIEWS — LIVE, OR NOTHING
 * ----------------------------------------------------------------------------
 * The salon already has Google reviews, so the site reads them from Google
 * rather than storing copies. There is deliberately no hard-coded fallback
 * review anywhere in this codebase: if the API is not configured or is down,
 * the section renders an honest empty state instead of invented testimonials.
 *
 * Setup (see README):
 *   GOOGLE_PLACES_API_KEY=...   Places API (New), server-side only
 *   GOOGLE_PLACE_ID=...         the salon's place id
 * ========================================================================== */

import { site } from "./site";

export type GoogleReview = {
  author: string;
  authorPhoto?: string;
  rating: number;
  relativeTime: string;
  text: string;
  uri?: string;
};

export type ReviewsPayload = {
  configured: boolean;
  ok: boolean;
  rating: number | null;
  total: number | null;
  reviews: GoogleReview[];
  /** Surfaced in the UI only as a neutral empty state, never as an error dump. */
  reason?: "unconfigured" | "unreachable" | "empty";
};

const EMPTY: ReviewsPayload = {
  configured: false,
  ok: false,
  rating: null,
  total: null,
  reviews: [],
  reason: "unconfigured",
};

type PlacesResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string; photoUri?: string; uri?: string };
  }[];
};

export async function getGoogleReviews(): Promise<ReviewsPayload> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = site.google.placeId;

  if (!key || !placeId) return EMPTY;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "rating,userRatingCount,googleMapsUri,reviews.rating,reviews.text,reviews.originalText,reviews.relativePublishTimeDescription,reviews.authorAttribution",
        },
        // Reviews change slowly; an hour keeps the page fast and the quota low.
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      return { ...EMPTY, configured: true, reason: "unreachable" };
    }

    const data = (await res.json()) as PlacesResponse;

    const reviews: GoogleReview[] = (data.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName?.trim() ?? "Google reviewer",
        authorPhoto: r.authorAttribution?.photoUri,
        rating: typeof r.rating === "number" ? r.rating : 5,
        relativeTime: r.relativePublishTimeDescription ?? "",
        text: (r.text?.text ?? r.originalText?.text ?? "").trim(),
        uri: r.authorAttribution?.uri,
      }))
      .filter((r) => r.text.length > 0);

    return {
      configured: true,
      ok: true,
      rating: typeof data.rating === "number" ? data.rating : null,
      total: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
      reviews,
      reason: reviews.length === 0 ? "empty" : undefined,
    };
  } catch {
    return { ...EMPTY, configured: true, reason: "unreachable" };
  }
}

/** Where "Read more" / "Leave a review" point, with sensible fallbacks. */
export function reviewLinks(payload: ReviewsPayload) {
  const search = `https://www.google.com/search?q=${encodeURIComponent(
    `${site.name} ${site.address.locality} ${site.address.region} reviews`,
  )}`;

  const read = site.google.profileUrl || search;
  const write =
    site.google.writeReviewUrl ||
    (site.google.placeId
      ? `https://search.google.com/local/writereview?placeid=${site.google.placeId}`
      : search);

  return { read, write, hasProfile: Boolean(site.google.profileUrl || payload.ok) };
}

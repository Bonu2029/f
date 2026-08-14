import { CATEGORIES } from "./data/categories";
import type { Availability, SearchFilters, SortKey } from "./store/selectors";
import { EMPTY_FILTERS } from "./store/selectors";

/**
 * Query understanding.
 *
 * The prototype resolves natural phrases with ordered pattern matching rather
 * than a model: it reads intent (category, when, price ceiling, radius) off
 * the query and leaves the rest as keywords. The important part is the shape —
 * `parseQuery` returns structured filters, so a smarter parser can be dropped
 * in behind the same signature without touching the search UI.
 */

export interface ParsedQuery {
  filters: SearchFilters;
  /** Human-readable chips describing what we understood, shown under the box. */
  understood: string[];
  /** Terms left over after intent extraction — used for keyword matching. */
  keywords: string;
}

const TIME_WORDS: Array<[RegExp, { from?: number; to?: number; label: string }]> = [
  [/\bthis morning\b|\bmorning\b/, { from: 6 * 60, to: 12 * 60, label: "Morning" }],
  [/\bthis afternoon\b|\bafternoon\b/, { from: 12 * 60, to: 17 * 60, label: "Afternoon" }],
  [/\bthis evening\b|\bevening\b|\btonight\b/, { from: 17 * 60, to: 23 * 60, label: "Evening" }],
  [/\bafter work\b/, { from: 17 * 60, label: "After work" }],
  [/\blunch\b|\blunchtime\b/, { from: 11 * 60 + 30, to: 14 * 60, label: "Lunchtime" }],
];

export function parseQuery(raw: string, base: Partial<SearchFilters> = {}): ParsedQuery {
  const filters: SearchFilters = { ...EMPTY_FILTERS, ...base, q: raw };
  const understood: string[] = [];
  let text = ` ${raw.toLowerCase().trim()} `;

  const consume = (pattern: RegExp) => {
    text = text.replace(pattern, " ");
  };

  /* ---- Category --------------------------------------------------------- */
  // Longest synonym first so "hair salon" wins over "hair".
  const synonyms = CATEGORIES.flatMap((c) =>
    [c.name, c.plural_name, ...c.synonyms].map((s) => ({ slug: c.slug, term: s.toLowerCase(), label: c.name })),
  ).sort((a, b) => b.term.length - a.term.length);

  for (const { slug, term, label } of synonyms) {
    const pattern = new RegExp(`\\b${escape(term)}s?\\b`);
    if (pattern.test(text)) {
      filters.categorySlug = slug;
      understood.push(label);
      consume(pattern);
      break;
    }
  }

  /* ---- When ------------------------------------------------------------- */
  if (/\bright now\b|\bnow\b|\basap\b|\bimmediately\b/.test(text)) {
    filters.availability = "now";
    understood.push("Available now");
    consume(/\bright now\b|\bnow\b|\basap\b|\bimmediately\b/);
  } else if (/\btomorrow\b/.test(text)) {
    filters.availability = "tomorrow";
    understood.push("Tomorrow");
    consume(/\btomorrow\b/);
  } else if (/\btoday\b/.test(text)) {
    filters.availability = "today";
    understood.push("Today");
    consume(/\btoday\b/);
  }

  /* ---- Time of day ------------------------------------------------------ */
  for (const [pattern, window] of TIME_WORDS) {
    if (pattern.test(text)) {
      if (window.from != null) filters.timeFrom = window.from;
      if (window.to != null) filters.timeTo = window.to;
      if (filters.availability === "any") filters.availability = "today";
      understood.push(window.label);
      consume(pattern);
      break;
    }
  }

  // "after 5", "after 5pm", "before 11am"
  const after = text.match(/\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (after) {
    filters.timeFrom = toMinutes(after[1], after[2], after[3], "pm");
    understood.push(`After ${formatHint(filters.timeFrom)}`);
    consume(/\bafter\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/);
  }
  const before = text.match(/\bbefore\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (before) {
    filters.timeTo = toMinutes(before[1], before[2], before[3], "am");
    understood.push(`Before ${formatHint(filters.timeTo)}`);
    consume(/\bbefore\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/);
  }

  /* ---- Price ------------------------------------------------------------ */
  const price = text.match(/\b(?:under|below|less than|max|up to)\s*\$?\s*(\d{1,4})\b/);
  if (price) {
    filters.maxPriceCents = Number(price[1]) * 100;
    understood.push(`Under $${price[1]}`);
    consume(/\b(?:under|below|less than|max|up to)\s*\$?\s*\d{1,4}\b/);
  }

  /* ---- Distance --------------------------------------------------------- */
  const distance = text.match(/\b(?:within|under|inside)\s*(\d{1,2})\s*(?:mi|mile|miles)\b/);
  if (distance) {
    filters.maxDistanceMiles = Number(distance[1]);
    understood.push(`Within ${distance[1]} mi`);
    consume(/\b(?:within|under|inside)\s*\d{1,2}\s*(?:mi|mile|miles)\b/);
  } else {
    const nearby = text.match(/\b(\d{1,2})\s*(?:mi|mile|miles)\b/);
    if (nearby) {
      filters.maxDistanceMiles = Number(nearby[1]);
      understood.push(`Within ${nearby[1]} mi`);
      consume(/\b\d{1,2}\s*(?:mi|mile|miles)\b/);
    }
  }

  /* ---- Deals & rating --------------------------------------------------- */
  if (/\bdeal\b|\bdeals\b|\bdiscount\b|\bcheap\b|\bspecial\b/.test(text)) {
    filters.dealsOnly = true;
    understood.push("Deals only");
    consume(/\bdeals?\b|\bdiscount\b|\bcheap\b|\bspecial\b/);
  }
  if (/\bbest\b|\btop rated\b|\bhighest rated\b|\b5 star\b/.test(text)) {
    filters.minRating = 4.5;
    filters.sort = "rating";
    understood.push("Top rated");
    consume(/\bbest\b|\btop rated\b|\bhighest rated\b|\b5 star\b/);
  }

  const keywords = text
    .replace(/\b(near|nearby|me|a|an|the|for|at|in|on|my|need|want|please|around)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // The category match is stronger than leftover keywords, so only keep the
  // remainder as free text when we didn't resolve a category.
  filters.q = filters.categorySlug ? keywords : raw.trim();

  return { filters, understood, keywords };
}

function toMinutes(
  hourRaw: string,
  minuteRaw: string | undefined,
  meridiem: string | undefined,
  assume: "am" | "pm",
): number {
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw ?? 0);
  const mer = meridiem ?? (hour <= 7 || (assume === "pm" && hour < 12) ? assume : "am");
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  return Math.min(23 * 60 + 59, hour * 60 + minute);
}

function formatHint(minutes: number | null): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${`${m}`.padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}` : `${h12} ${h >= 12 ? "PM" : "AM"}`;
}

function escape(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Example phrases surfaced in the search sheet to teach the syntax. */
export const SEARCH_EXAMPLES = [
  "haircut right now",
  "nails after 5",
  "car detailing tomorrow under $100",
  "dog groomer this afternoon",
  "massage within 3 miles",
  "deep clean tomorrow morning",
] as const;

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: "Recommended",
  soonest: "Soonest",
  nearest: "Nearest",
  price: "Lowest price",
  rating: "Highest rated",
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  any: "Any time",
  now: "Available now",
  today: "Today",
  tomorrow: "Tomorrow",
  date: "Pick a date",
};

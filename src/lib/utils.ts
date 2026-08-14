import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic UUID-shaped ids for demo data.
 *
 * Demo entities must produce the *same* ids on the server and in the browser,
 * otherwise React would hydrate a different tree than it rendered. So seeded
 * data uses `stableId(namespace, key)` while genuinely new records created at
 * runtime use `newId()`.
 */
export function stableId(namespace: string, key: string | number): string {
  const h = fnv1a(`${namespace}:${key}`);
  const h2 = fnv1a(`${h}:${namespace}`);
  const h3 = fnv1a(`${h2}:${key}`);
  const h4 = fnv1a(`${h3}:now`);
  const hex = (n: number, len: number) => n.toString(16).padStart(8, "0").slice(0, len);
  return [
    hex(h, 8),
    hex(h2, 4),
    `4${hex(h2 >>> 8, 3)}`,
    `${((h3 & 0x3) | 0x8).toString(16)}${hex(h3, 3)}`,
    `${hex(h3, 4)}${hex(h4, 8)}`,
  ].join("-");
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return stableId("runtime", `${Date.now()}-${Math.random()}`);
}

export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic pseudo-random generator so demo data never shifts. */
export function seededRandom(seed: string) {
  let state = fnv1a(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

export function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length) % items.length];
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

/** "127" → "127" · "1240" → "1.2k" */
export function compactNumber(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Sort helper that never mutates its input. */
export function sortBy<T>(items: T[], score: (item: T) => number): T[] {
  return [...items].sort((a, b) => score(a) - score(b));
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function groupBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

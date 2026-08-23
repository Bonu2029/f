type ClassValue = string | false | null | undefined;

/** Tiny class name joiner — keeps component APIs tidy without a dependency. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

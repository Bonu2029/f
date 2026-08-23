/**
 * Brand configuration.
 *
 * This is the single source of truth for the product name and voice.
 * Change the values here and the entire site, app and customer-facing
 * pages update — no other file hard-codes the brand.
 */

export const brand = {
  /** Product name shown in the logo, page titles and customer pages. */
  name: "ServiceTag",
  /** Lowercase, URL-safe version of the name. */
  slug: "servicetag",
  /** What a single physical tag is called, in copy. */
  tagNoun: "ServiceTag",
  tagNounPlural: "ServiceTags",
  tagline: "Turn every installation into a returning customer.",
  secondaryMessage:
    "Tap. Request service. Come back to the business you trust.",
  description:
    "Place a tag on every installation. When your customer needs you again, they tap their phone and come straight back to your business.",
  domain: "servicetag.com",
  supportEmail: "support@servicetag.com",
  /** Public base URL used to build the URL written to each NFC chip. */
  get url() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? `https://${this.domain}`;
  },
  /** Path prefix for public tag pages, e.g. /t/AB72KD */
  tagPathPrefix: "/t",
} as const;

/** Full public URL for a tag code, e.g. https://servicetag.com/t/AB72KD */
export function tagUrl(code: string): string {
  return `${brand.url}${brand.tagPathPrefix}/${code}`;
}

/** Shorter, human-readable version used in the UI, e.g. servicetag.com/t/AB72KD */
export function tagUrlDisplay(code: string): string {
  return `${brand.domain}${brand.tagPathPrefix}/${code}`;
}

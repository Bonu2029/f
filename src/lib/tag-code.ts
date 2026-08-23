/**
 * Tag codes.
 *
 * A code is the only thing written to an NFC chip — as part of the URL, e.g.
 * https://servicetag.com/t/AB72KD. It carries no customer data, so the record
 * behind it can be updated forever without touching the physical tag.
 *
 * The alphabet omits characters people misread when typing a code by hand
 * (I, O, 0, 1) and the length gives plenty of room before collisions matter.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 6;

export function generateTagCode(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);

  let code = "";
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}

/** Accepts what a person typed and returns the canonical form, or null. */
export function normalizeTagCode(input: string): string | null {
  const code = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null;
}

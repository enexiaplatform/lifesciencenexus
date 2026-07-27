/**
 * Identifier helpers. Zero dependencies; safe in browser, Node and tests.
 */

/** New random UUID (v4). Uses the platform CSPRNG. */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * URL/anchor-safe slug: lowercase, diacritics stripped (NFD decomposition),
 * every non-alphanumeric run collapsed to a single dash, dashes trimmed.
 *
 * Examples: 'Tryptic Soy Agar (TSA)' -> 'tryptic-soy-agar-tsa',
 *           'Bộ Y tế' -> 'bo-y-te'.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

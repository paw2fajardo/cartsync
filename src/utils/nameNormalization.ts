/**
 * Clean Name Normalization Utility
 *
 * Prepares item names for deduplication and personal device purchase history:
 * - Strips leading/trailing whitespace and collapses repeated spaces
 * - Strips trailing punctuation, asterisks, status tags, or parenthesized status indicators (e.g. "[Out of Stock]", "(Unavailable)")
 * - Cleans surrounding quotes
 * - Preserves readable title case / proper brand casing
 */
export function normalizeCleanName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  let cleaned = name.trim();

  // 1. Remove bracketed or parenthesized tags like [Unavailable], (Out of Stock), (reverted), [Restocked], (urgent!), [Ripened], (Costco), etc.
  cleaned = cleaned.replace(/\s*(\[|\()(unavailable|out of stock|restocked|reverted|oos|revert|urgent!?|ripene?d?|costco)(\]|\))\s*/gi, ' ');

  // 2. Remove trailing quantity markers in parentheses like (2L) or (500g)
  cleaned = cleaned.replace(/\s*\(\d+\s*[a-zA-Z]+\)\s*$/g, '');

  // 3. Remove trailing status notes like "- fresh"
  cleaned = cleaned.replace(/\s*-\s*fresh\s*$/gi, '');

  // 4. Remove leading or trailing hashtag tags like #Produce, but leave words intact if leading symbol stripped
  cleaned = cleaned.replace(/\s+#\w+/g, ' ');

  // 5. Remove trailing / leading modifier punctuation like colons, dashes, asterisks, hashtags, quotes
  cleaned = cleaned.replace(/^[\s\-–—:*#"'`]+|[\s\-–—:*#"'`]+$/g, '');

  // 6. Collapse repeated internal whitespace and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 7. Final pass to remove edge punctuation
  cleaned = cleaned.replace(/^[\s\-–—:*#"'`]+|[\s\-–—:*#"'`]+$/g, '').trim();

  return cleaned;
}

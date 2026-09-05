import { GroceryItem } from '../types';

/**
 * Checks whether an item name contains explicit modifiers, qualifiers, or owner tags
 * such as "Soap - Daddy", "Soap - Mommy", "Milk (Almond)", "Bread: Whole Wheat", etc.
 */
export function hasExplicitModifier(name: string): boolean {
  if (!name) return false;
  // Modifiers include hyphens with surrounding spaces, em dashes, en dashes, parenthesized tags, brackets, colons, or slashes
  return (
    /\s+[-–—]\s+/.test(name) ||
    /\(.*\)/.test(name) ||
    /\[.*\]/.test(name) ||
    /:|\//.test(name)
  );
}

/**
 * Normalizes minor plural endings in English for grocery items.
 * e.g., 'apples' -> 'apple', 'berries' -> 'berry', 'tomatoes' -> 'tomato', 'boxes' -> 'box'
 */
export function normalizePlural(word: string): string {
  const w = word.trim().toLowerCase();
  if (w.length <= 3) return w;

  if (w.endsWith('ies') && w.length > 4) {
    // berries -> berry, strawberries -> strawberry
    return w.slice(0, -3) + 'y';
  }
  if (w.endsWith('oes') && w.length > 4) {
    // tomatoes -> tomato, potatoes -> potato
    return w.slice(0, -2);
  }
  if (w.endsWith('xes') || w.endsWith('ches') || w.endsWith('shes')) {
    // boxes -> box, peaches -> peach, radishes -> radish
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) {
    // apples -> apple, bananas -> banana, carrots -> carrot
    return w.slice(0, -1);
  }
  return w;
}

/**
 * Normalizes item text for generic / exact duplicate matching:
 * - Collapses repeated whitespace
 * - Converts to lower case
 * - Normalizes words for minor plural variants if no explicit modifier is present
 */
export function normalizeItemKey(name: string): { key: string; isModified: boolean } {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (hasExplicitModifier(trimmed)) {
    // Explicit modifiers must preserve their exact distinction
    return {
      key: trimmed.toLowerCase(),
      isModified: true,
    };
  }

  // Generic / non-modified item: normalize casing, whitespace, and final token plural
  const tokens = trimmed.toLowerCase().split(' ');
  const normalizedTokens = tokens.map((token, idx) => {
    // If last token or single token, normalize plural
    if (idx === tokens.length - 1) {
      return normalizePlural(token);
    }
    return token;
  });

  return {
    key: normalizedTokens.join(' '),
    isModified: false,
  };
}

/**
 * Finds an existing active (uncompleted) duplicate item on the target list.
 *
 * Rules:
 * 1. Only active items (`!item.completed`) on `item.listId === targetListId` are eligible.
 * 2. Explicit modifiers (e.g. "Soap - Daddy" vs "Soap - Mommy") are NEVER merged with one another
 *    or with generic items (e.g. "Soap").
 * 3. Generic matches (e.g. "Gardenia" vs "gardenia", "apple" vs "apples") match and return the existing item.
 */
export function findDuplicateItem(
  incomingName: string,
  items: GroceryItem[],
  targetListId: string
): GroceryItem | null {
  if (!incomingName || !incomingName.trim()) return null;

  const incomingNorm = normalizeItemKey(incomingName);

  for (const item of items) {
    if (item.listId !== targetListId) continue;
    if (item.completed) continue; // Only active items

    const existingNorm = normalizeItemKey(item.name);

    // If one has an explicit modifier and the other doesn't, they are NOT duplicates
    if (incomingNorm.isModified !== existingNorm.isModified) {
      continue;
    }

    // If both have explicit modifiers, they only match if their modified keys match exactly
    if (incomingNorm.isModified && existingNorm.isModified) {
      if (incomingNorm.key === existingNorm.key) {
        return item;
      }
      continue;
    }

    // Both are generic items without modifiers: match normalized keys (casing, whitespace, plural)
    if (incomingNorm.key === existingNorm.key) {
      return item;
    }
  }

  return null;
}

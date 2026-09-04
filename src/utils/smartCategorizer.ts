import { ItemCategory } from '../types';

const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
  Produce: [
    'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'lemon', 'lime', 'berry', 'berries',
    'strawberry', 'blueberry', 'raspberry', 'avocado', 'tomato', 'tomatoes', 'potato', 'potatoes',
    'onion', 'onions', 'garlic', 'ginger', 'carrot', 'carrots', 'lettuce', 'spinach', 'kale',
    'broccoli', 'cucumber', 'pepper', 'peppers', 'mushroom', 'mushrooms', 'herb', 'cilantro',
    'parsley', 'basil', 'zucchini', 'celery', 'grapes', 'peach', 'watermelon', 'salad', 'corn', 'fruit', 'vegetable'
  ],
  'Dairy & Eggs': [
    'milk', 'oat milk', 'almond milk', 'soy milk', 'cheese', 'cheddar', 'mozzarella', 'parmesan',
    'butter', 'yogurt', 'yoghurt', 'greek yogurt', 'cream', 'heavy cream', 'sour cream', 'egg', 'eggs',
    'cottage cheese', 'ricotta', 'brie', 'gouda', 'ghee'
  ],
  Bakery: [
    'bread', 'bagel', 'bagels', 'croissant', 'croissants', 'sourdough', 'tortilla', 'tortillas',
    'pita', 'bun', 'buns', 'roll', 'rolls', 'muffin', 'muffins', 'baguette', 'toast', 'brioche', 'naan'
  ],
  'Meat & Seafood': [
    'chicken', 'chicken breast', 'chicken thighs', 'beef', 'ground beef', 'steak', 'pork', 'pork chops',
    'bacon', 'sausage', 'sausages', 'turkey', 'ham', 'salmon', 'tuna', 'shrimp', 'fish', 'cod', 'meat',
    'lamb', 'tilapia', 'crab', 'lobster'
  ],
  Pantry: [
    'rice', 'pasta', 'spaghetti', 'penne', 'noodles', 'flour', 'sugar', 'salt', 'pepper', 'olive oil',
    'oil', 'canola oil', 'vinegar', 'soy sauce', 'tomato sauce', 'canned tomatoes', 'beans', 'black beans',
    'chickpeas', 'lentils', 'cereal', 'oats', 'oatmeal', 'quinoa', 'soup', 'broth', 'peanut butter',
    'jam', 'honey', 'mayo', 'mayonnaise', 'ketchup', 'mustard', 'taco seasoning', 'spice', 'spices'
  ],
  Frozen: [
    'frozen', 'ice cream', 'frozen pizza', 'frozen peas', 'frozen berries', 'frozen vegetables', 'waffles',
    'frozen fries', 'dumplings', 'popsicles', 'frozen corn', 'frozen shrimp'
  ],
  'Snacks & Sweets': [
    'chips', 'potato chips', 'tortilla chips', 'popcorn', 'pretzel', 'pretzels', 'nuts', 'almonds', 'peanuts',
    'cashews', 'cookies', 'cookie', 'chocolate', 'candy', 'crackers', 'granola bar', 'protein bar',
    'gummies', 'snack'
  ],
  Beverages: [
    'coffee', 'coffee beans', 'ground coffee', 'tea', 'green tea', 'black tea', 'juice', 'orange juice',
    'apple juice', 'soda', 'coke', 'diet coke', 'sparkling water', 'seltzer', 'water', 'bottled water',
    'beer', 'wine', 'kombucha', 'energy drink'
  ],
  'Household & Cleaning': [
    'paper towels', 'toilet paper', 'tissues', 'dish soap', 'sponge', 'sponges', 'trash bags',
    'garbage bags', 'laundry detergent', 'fabric softener', 'foil', 'aluminum foil', 'plastic wrap',
    'ziploc', 'ziploc bags', 'cleaning spray', 'wipes', 'disinfectant', 'bleach', 'dishwasher pods'
  ],
  'Pharmacy & Health': [
    'tylenol', 'advil', 'ibuprofen', 'aspirin', 'vitamins', 'vitamin c', 'vitamin d', 'vitamin d3',
    'vitamin', 'bandaids', 'band-aids', 'cough drops', 'allergy', 'medicine', 'toothpaste', 'floss',
    'first aid', 'sunscreen'
  ],
  'Personal Care': [
    'shampoo', 'conditioner', 'body wash', 'soap', 'deodorant', 'razor', 'shaving cream',
    'lotion', 'face wash', 'moisturizer', 'hand soap', 'cotton pads', 'q-tips'
  ],
  'Baby & Pet': [
    'diapers', 'baby wipes', 'baby food', 'formula', 'dog food', 'cat food', 'dog treats',
    'cat treats', 'pet treats', 'cat litter'
  ],
  Other: []
};

// Flatten and prioritize multi-word and longer phrases first
const SORTED_KEYWORD_RULES: Array<{ keyword: string; category: ItemCategory; regex: RegExp }> = (() => {
  const rules: Array<{ keyword: string; category: ItemCategory; regex: RegExp }> = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Other') continue;
    for (const kw of keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Require word boundaries so 'ham' does not match 'shampoo' and 'oil' does not match 'toilet'
      const regex = new RegExp(`\\b${escaped}s?\\b`, 'i');
      rules.push({
        keyword: kw,
        category: category as ItemCategory,
        regex,
      });
    }
  }

  // Sort: multi-word phrases first, then longer keywords first
  return rules.sort((a, b) => {
    const aWords = a.keyword.split(' ').length;
    const bWords = b.keyword.split(' ').length;
    if (aWords !== bWords) return bWords - aWords;
    return b.keyword.length - a.keyword.length;
  });
})();

export function categorizeItem(name: string): ItemCategory {
  const trimmed = name.trim();
  if (!trimmed) return 'Other';

  for (const rule of SORTED_KEYWORD_RULES) {
    if (rule.regex.test(trimmed)) {
      return rule.category;
    }
  }

  return 'Other';
}

export interface ParsedItemInput {
  name: string;
  quantity: number;
  unit?: string;
  category: ItemCategory;
}

export function parseItemInput(raw: string): ParsedItemInput {
  let text = raw.trim();
  let quantity = 1;
  let unit: string | undefined = undefined;

  // Patterns like:
  // "3 apples"
  // "2.5 kg bananas"
  // "1 carton milk"
  // "avocados x4"
  // "bread 2"
  // "dozen eggs"

  if (/^dozen\b/i.test(text)) {
    quantity = 12;
    text = text.replace(/^dozen\s*/i, '');
  } else {
    // Check leading number with optional unit: "2.5 kg bananas", "3 apples", "2x eggs"
    const leadingMatch = text.match(/^(\d+(?:\.\d+)?)\s*(x|kg|g|lbs|lb|oz|l|ml|pack|packs|can|cans|box|boxes|bag|bags|bottle|bottles|carton|cartons|bunch|bunches|bunch of|pcs|pc)?\s+(.*)$/i);
    if (leadingMatch) {
      quantity = parseFloat(leadingMatch[1]);
      if (leadingMatch[2] && leadingMatch[2].toLowerCase() !== 'x') {
        unit = leadingMatch[2].toLowerCase();
      }
      text = leadingMatch[3];
    } else {
      // Check trailing: "bananas x3" or "apples 2"
      const trailingMatch = text.match(/^(.*?)\s+(?:x\s*|qty:\s*)?(\d+(?:\.\d+)?)\s*(kg|g|lbs|lb|oz|l|ml|pack|packs|can|cans|box|boxes|bag|bags|bottle|bottles|carton|cartons|pcs|pc)?$/i);
      if (trailingMatch && trailingMatch[1].trim().length > 0) {
        text = trailingMatch[1].trim();
        quantity = parseFloat(trailingMatch[2]);
        if (trailingMatch[3]) {
          unit = trailingMatch[3].toLowerCase();
        }
      }
    }
  }

  // Capitalize name neatly
  const cleanName = text.trim();
  const formattedName = cleanName.length > 0
    ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
    : 'Item';

  const category = categorizeItem(formattedName);

  return {
    name: formattedName,
    quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
    unit,
    category,
  };
}

export const CATEGORY_COLORS: Record<ItemCategory, { bg: string; text: string; border: string; dot: string }> = {
  Produce: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  'Dairy & Eggs': { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', dot: 'bg-sky-500' },
  Bakery: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  'Meat & Seafood': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
  Pantry: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  Frozen: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-500' },
  'Snacks & Sweets': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  Beverages: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
  'Household & Cleaning': { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500' },
  'Pharmacy & Health': { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
  'Personal Care': { bg: 'bg-pink-50 dark:bg-pink-950/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800', dot: 'bg-pink-500' },
  'Baby & Pet': { bg: 'bg-lime-50 dark:bg-lime-950/40', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800', dot: 'bg-lime-500' },
  Other: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-200 dark:border-zinc-700', dot: 'bg-zinc-500' },
};

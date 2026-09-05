import { describe, it, expect, beforeEach } from 'vitest';
import { parseItemInput, findMatchingAutoListRule } from '../src/utils/smartCategorizer';
import { AutoListRule } from '../src/types';

describe('Auto-List Keyword Routing & Rule Evaluation', () => {
  const sampleRules: AutoListRule[] = [
    {
      id: 'rule_gardenia',
      keyword: 'gardenia',
      targetListId: 'list_supermarket',
      category: 'Bakery',
      createdAt: 1000,
    },
    {
      id: 'rule_kirkland',
      keyword: 'kirkland',
      targetListId: 'list_costco',
      category: 'Household & Cleaning',
      createdAt: 1000,
    },
    {
      id: 'rule_tylenol',
      keyword: 'tylenol',
      targetListId: 'list_pharmacy',
      category: 'Pharmacy & Health',
      createdAt: 1000,
    },
  ];

  it('should match keyword "Gardenia" and identify target list as "list_supermarket" and category as "Bakery"', () => {
    const matched = findMatchingAutoListRule('Gardenia white bread', sampleRules);
    expect(matched).not.toBeNull();
    expect(matched?.targetListId).toBe('list_supermarket');
    expect(matched?.category).toBe('Bakery');

    const parsed = parseItemInput('Gardenia 2 loaves', sampleRules);
    expect(parsed.name).toBe('Gardenia');
    expect(parsed.quantity).toBe(2);
    expect(parsed.unit).toBe('loaves');
    expect(parsed.category).toBe('Bakery');
    expect(parsed.matchedRule?.targetListId).toBe('list_supermarket');
  });

  it('should match brand "Kirkland" and route to Costco', () => {
    const parsed = parseItemInput('Kirkland Paper Towels', sampleRules);
    expect(parsed.matchedRule?.targetListId).toBe('list_costco');
    expect(parsed.category).toBe('Household & Cleaning');
  });

  it('should return null matchedRule if item does not match any custom rule', () => {
    const parsed = parseItemInput('Organic Avocados 4 pcs', sampleRules);
    expect(parsed.matchedRule).toBeNull();
    expect(parsed.category).toBe('Produce');
  });

  it('should prioritize longer matching keyword phrase over shorter substrings', () => {
    const rulesWithSubstrings: AutoListRule[] = [
      {
        id: 'rule_short',
        keyword: 'tea',
        targetListId: 'list_supermarket',
        category: 'Beverages',
        createdAt: 1000,
      },
      {
        id: 'rule_long',
        keyword: 'green tea extract',
        targetListId: 'list_pharmacy',
        category: 'Pharmacy & Health',
        createdAt: 1000,
      },
    ];

    const parsed = parseItemInput('Green Tea Extract 100mg', rulesWithSubstrings);
    expect(parsed.matchedRule?.targetListId).toBe('list_pharmacy');
    expect(parsed.category).toBe('Pharmacy & Health');
  });
});

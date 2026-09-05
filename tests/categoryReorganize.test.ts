import { describe, it, expect } from 'vitest';
import { categorizeItem } from '../src/utils/smartCategorizer';

describe('Category Auto-Reorganize on Edit', () => {
  it('should categorize misspelled "Saop" as Other and "Soap" as Personal Care', () => {
    const misspelledCategory = categorizeItem('Saop');
    expect(misspelledCategory).toBe('Other');

    const correctedCategory = categorizeItem('Soap');
    expect(correctedCategory).toBe('Personal Care');
  });

  it('should categorize other common items accurately', () => {
    expect(categorizeItem('Apples')).toBe('Produce');
    expect(categorizeItem('Whole Milk')).toBe('Dairy & Eggs');
    expect(categorizeItem('Paper Towels')).toBe('Household & Cleaning');
    expect(categorizeItem('Tylenol')).toBe('Pharmacy & Health');
    expect(categorizeItem('RandomUnknownItem123')).toBe('Other');
  });
});

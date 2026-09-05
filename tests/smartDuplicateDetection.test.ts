import { describe, it, expect } from 'vitest';
import { findDuplicateItem, hasExplicitModifier, normalizePlural, normalizeItemKey } from '../src/utils/itemMatching';
import { GroceryItem } from '../src/types';

describe('Smart Duplicate Detection & Modifier Distinction', () => {
  const baseItem: GroceryItem = {
    id: 'item_soap_daddy',
    listId: 'list_supermarket',
    name: 'Soap - Daddy',
    quantity: 1,
    category: 'Personal Care',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: { deviceId: 'dev_1', deviceName: 'Dad Phone' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const gardeniaItem: GroceryItem = {
    id: 'item_gardenia',
    listId: 'list_supermarket',
    name: 'Gardenia',
    quantity: 1,
    category: 'Bakery',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: { deviceId: 'dev_1', deviceName: 'Dad Phone' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const appleItem: GroceryItem = {
    id: 'item_apple',
    listId: 'list_supermarket',
    name: 'Apple',
    quantity: 2,
    category: 'Produce',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: { deviceId: 'dev_1', deviceName: 'Dad Phone' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const activeItems: GroceryItem[] = [baseItem, gardeniaItem, appleItem];

  describe('Explicit Modifier Detection', () => {
    it('detects hyphens with spaces as distinct modifiers', () => {
      expect(hasExplicitModifier('Soap - Daddy')).toBe(true);
      expect(hasExplicitModifier('Soap - Mommy')).toBe(true);
      expect(hasExplicitModifier('Ice Cream - Vanilla')).toBe(true);
      expect(hasExplicitModifier('Gardenia')).toBe(false);
      expect(hasExplicitModifier('Organic Apples')).toBe(false);
    });

    it('detects parenthesized and colon tags as distinct modifiers', () => {
      expect(hasExplicitModifier('Milk (Almond)')).toBe(true);
      expect(hasExplicitModifier('Milk (Oat)')).toBe(true);
      expect(hasExplicitModifier('Bread: Whole Wheat')).toBe(true);
    });
  });

  describe('Plural Normalization', () => {
    it('normalizes common plural endings', () => {
      expect(normalizePlural('apples')).toBe('apple');
      expect(normalizePlural('bananas')).toBe('banana');
      expect(normalizePlural('berries')).toBe('berry');
      expect(normalizePlural('tomatoes')).toBe('tomato');
      expect(normalizePlural('boxes')).toBe('box');
      expect(normalizePlural('apple')).toBe('apple');
    });
  });

  describe('Duplicate Finding Behavior', () => {
    it('matches exact/generic matches regardless of casing (e.g. Gardenia vs gardenia)', () => {
      const match = findDuplicateItem('gardenia', activeItems, 'list_supermarket');
      expect(match).not.toBeNull();
      expect(match?.id).toBe('item_gardenia');
    });

    it('matches minor plural variants for generic items (e.g. apples vs apple)', () => {
      const match = findDuplicateItem('apples', activeItems, 'list_supermarket');
      expect(match).not.toBeNull();
      expect(match?.id).toBe('item_apple');
    });

    it('treats distinct owner tags as separate items (Soap - Daddy vs Soap - Mommy)', () => {
      const match = findDuplicateItem('Soap - Mommy', activeItems, 'list_supermarket');
      expect(match).toBeNull(); // Must NOT merge into Soap - Daddy!
    });

    it('matches identical modifier items if added again (Soap - Daddy matches Soap - Daddy)', () => {
      const match = findDuplicateItem('Soap - Daddy', activeItems, 'list_supermarket');
      expect(match).not.toBeNull();
      expect(match?.id).toBe('item_soap_daddy');
    });

    it('does NOT match across different lists', () => {
      const match = findDuplicateItem('Gardenia', activeItems, 'list_costco');
      expect(match).toBeNull();
    });

    it('does NOT match completed items', () => {
      const itemsWithCompleted: GroceryItem[] = [
        {
          ...gardeniaItem,
          completed: true,
        },
      ];
      const match = findDuplicateItem('Gardenia', itemsWithCompleted, 'list_supermarket');
      expect(match).toBeNull();
    });
  });
});

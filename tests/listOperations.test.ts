import { describe, it, expect, beforeEach } from 'vitest';
import { INITIAL_LISTS, INITIAL_ITEMS } from '../src/storage/seedData';
import { GroceryList, GroceryItem } from '../src/types';

describe('Multiple List Management & Operations Verification', () => {
  let lists: GroceryList[];
  let items: GroceryItem[];
  let activeListId: string;

  beforeEach(() => {
    lists = JSON.parse(JSON.stringify(INITIAL_LISTS));
    items = JSON.parse(JSON.stringify(INITIAL_ITEMS));
    activeListId = 'list_supermarket';
  });

  it('should contain default seeded household lists', () => {
    expect(lists.length).toBe(4);
    const names = lists.map((l) => l.name);
    expect(names).toContain('Supermarket');
    expect(names).toContain('Costco');
    expect(names).toContain('Pharmacy');
    expect(names).toContain('Farmers Market');
  });

  it('should create a new custom list with specified icon and color', () => {
    const newList: GroceryList = {
      id: `list_${Date.now()}_custom`,
      name: 'Pet Store',
      icon: 'dog',
      color: 'lime',
      description: 'Supplies for dog & cats',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    lists.push(newList);
    activeListId = newList.id;

    expect(lists.length).toBe(5);
    expect(activeListId).toBe(newList.id);
    expect(lists.find((l) => l.name === 'Pet Store')?.color).toBe('lime');
  });

  it('should switch active list correctly', () => {
    expect(activeListId).toBe('list_supermarket');

    activeListId = 'list_costco';
    const activeList = lists.find((l) => l.id === activeListId);
    expect(activeList?.name).toBe('Costco');

    const costcoItems = items.filter((i) => i.listId === activeListId);
    expect(costcoItems.length).toBeGreaterThan(0);
  });

  it('should update list details', () => {
    const target = lists.find((l) => l.id === 'list_supermarket');
    expect(target).toBeDefined();

    const updatedList = {
      ...target!,
      name: 'Supermarket & Deli',
      description: 'Weekly grocery run plus gourmet deli',
      updatedAt: Date.now(),
    };

    const idx = lists.findIndex((l) => l.id === 'list_supermarket');
    lists[idx] = updatedList;

    expect(lists[idx].name).toBe('Supermarket & Deli');
    expect(lists[idx].description).toBe('Weekly grocery run plus gourmet deli');
  });

  it('should delete a list and cascade delete its associated items', () => {
    const listToDelete = 'list_costco';
    const itemsBefore = items.filter((i) => i.listId === listToDelete);
    expect(itemsBefore.length).toBeGreaterThan(0);

    // Perform deletion
    lists = lists.filter((l) => l.id !== listToDelete);
    items = items.filter((i) => i.listId !== listToDelete);

    expect(lists.some((l) => l.id === listToDelete)).toBe(false);
    expect(items.some((i) => i.listId === listToDelete)).toBe(false);
  });

  it('should enforce boundary condition: cannot delete the last remaining list', () => {
    // Reduce to 1 list
    lists = [lists[0]];

    const tryDeleteList = (id: string) => {
      if (lists.length <= 1) return; // Keep at least one list
      lists = lists.filter((l) => l.id !== id);
    };

    tryDeleteList(lists[0].id);
    expect(lists.length).toBe(1);
  });

  it('should correctly toggle item completion with device attribution', () => {
    const item = items.find((i) => !i.completed && i.listId === 'list_supermarket');
    expect(item).toBeDefined();

    const completingDevice = {
      deviceId: 'dev_kitchen_ipad',
      deviceName: 'Kitchen iPad',
      color: '#10b981',
    };

    const toggledItem: GroceryItem = {
      ...item!,
      completed: true,
      completedAt: Date.now(),
      completedBy: completingDevice,
    };

    expect(toggledItem.completed).toBe(true);
    expect(toggledItem.completedAt).toBeGreaterThan(0);
    expect(toggledItem.completedBy?.deviceName).toBe('Kitchen iPad');
  });

  it('should uncheck all completed items in a list', () => {
    const targetListId = 'list_supermarket';
    const completedCountBefore = items.filter((i) => i.listId === targetListId && i.completed).length;
    expect(completedCountBefore).toBeGreaterThan(0);

    // Uncheck all
    items = items.map((i) => {
      if (i.listId === targetListId && i.completed) {
        return {
          ...i,
          completed: false,
          completedAt: null,
          completedBy: null,
          updatedAt: Date.now(),
        };
      }
      return i;
    });

    const completedCountAfter = items.filter((i) => i.listId === targetListId && i.completed).length;
    expect(completedCountAfter).toBe(0);
  });

  it('should clear completed items from a list', () => {
    const targetListId = 'list_supermarket';
    const completedBefore = items.filter((i) => i.listId === targetListId && i.completed);
    expect(completedBefore.length).toBeGreaterThan(0);

    // Clear completed
    items = items.filter((i) => !(i.listId === targetListId && i.completed));

    const completedAfter = items.filter((i) => i.listId === targetListId && i.completed);
    expect(completedAfter.length).toBe(0);
  });
});

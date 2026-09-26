import { GroceryItem, GroceryList, AutoListRule, HouseholdState } from '../types';
import { OutboxEntry } from '../storage/idb';

export interface FieldDifference {
  field: string;
  localValue: any;
  serverValue: any;
}

export interface ItemDifference {
  id: string;
  name: string;
  category?: string;
  listId?: string;
  status: 'local_only' | 'server_only' | 'modified' | 'identical';
  differences?: FieldDifference[];
  isInOutbox?: boolean;
}

export interface ListDifference {
  id: string;
  name: string;
  status: 'local_only' | 'server_only' | 'modified' | 'identical';
  differences?: FieldDifference[];
}

export interface RuleDifference {
  id: string;
  keyword: string;
  status: 'local_only' | 'server_only' | 'modified' | 'identical';
}

export interface DatabaseDiffResult {
  timestamp: number;
  isIdentical: boolean;
  summary: {
    totalItemsLocal: number;
    totalItemsServer: number;
    identicalItemsCount: number;
    localOnlyItemsCount: number;
    serverOnlyItemsCount: number;
    modifiedItemsCount: number;
    pendingOutboxCount: number;
    staleLocalCount: number;
  };
  items: {
    identical: ItemDifference[];
    localOnly: ItemDifference[];
    serverOnly: ItemDifference[];
    modified: ItemDifference[];
  };
  lists: {
    identical: ListDifference[];
    localOnly: ListDifference[];
    serverOnly: ListDifference[];
    modified: ListDifference[];
  };
  rules: {
    identical: RuleDifference[];
    localOnly: RuleDifference[];
    serverOnly: RuleDifference[];
  };
}

/**
 * Compare two GroceryItems field by field
 */
function compareGroceryItems(local: GroceryItem, server: GroceryItem): FieldDifference[] {
  const diffs: FieldDifference[] = [];

  if (local.name !== server.name) {
    diffs.push({ field: 'name', localValue: local.name, serverValue: server.name });
  }
  if (local.quantity !== server.quantity) {
    diffs.push({ field: 'quantity', localValue: local.quantity, serverValue: server.quantity });
  }
  if ((local.unit || '') !== (server.unit || '')) {
    diffs.push({ field: 'unit', localValue: local.unit || '', serverValue: server.unit || '' });
  }
  if (local.category !== server.category) {
    diffs.push({ field: 'category', localValue: local.category, serverValue: server.category });
  }
  if (Boolean(local.completed) !== Boolean(server.completed)) {
    diffs.push({ field: 'completed', localValue: local.completed, serverValue: server.completed });
  }
  if (local.listId !== server.listId) {
    diffs.push({ field: 'listId', localValue: local.listId, serverValue: server.listId });
  }
  if ((local.note || '') !== (server.note || '')) {
    diffs.push({ field: 'note', localValue: local.note || '', serverValue: server.note || '' });
  }
  if ((local.status || 'active') !== (server.status || 'active')) {
    diffs.push({ field: 'status', localValue: local.status || 'active', serverValue: server.status || 'active' });
  }

  return diffs;
}

/**
 * Compare two GroceryLists field by field
 */
function compareGroceryLists(local: GroceryList, server: GroceryList): FieldDifference[] {
  const diffs: FieldDifference[] = [];

  if (local.name !== server.name) {
    diffs.push({ field: 'name', localValue: local.name, serverValue: server.name });
  }
  if (local.icon !== server.icon) {
    diffs.push({ field: 'icon', localValue: local.icon, serverValue: server.icon });
  }
  if (local.color !== server.color) {
    diffs.push({ field: 'color', localValue: local.color, serverValue: server.color });
  }
  if ((local.description || '') !== (server.description || '')) {
    diffs.push({ field: 'description', localValue: local.description || '', serverValue: server.description || '' });
  }

  return diffs;
}

/**
 * Deterministically compute exact differences between Local Database and Server Database.
 */
export function computeDatabaseDiff(
  localState: {
    lists: GroceryList[];
    items: GroceryItem[];
    autoListRules: AutoListRule[];
  },
  serverState: HouseholdState,
  outbox: OutboxEntry[] = []
): DatabaseDiffResult {
  // Extract outbox item IDs to differentiate pending offline actions from stale local items
  const outboxItemIds = new Set<string>();
  outbox.forEach((entry) => {
    if (entry.payload && typeof entry.payload === 'object' && 'id' in entry.payload) {
      outboxItemIds.add(String(entry.payload.id));
    }
  });

  const localItemsMap = new Map<string, GroceryItem>(localState.items.map((i) => [i.id, i]));
  const serverItemsMap = new Map<string, GroceryItem>(serverState.items.map((i) => [i.id, i]));

  const itemIdentical: ItemDifference[] = [];
  const itemLocalOnly: ItemDifference[] = [];
  const itemServerOnly: ItemDifference[] = [];
  const itemModified: ItemDifference[] = [];

  // Check all local items against server items
  for (const [id, localItem] of localItemsMap.entries()) {
    const serverItem = serverItemsMap.get(id);
    const isInOutbox = outboxItemIds.has(id);

    if (!serverItem) {
      itemLocalOnly.push({
        id,
        name: localItem.name,
        category: localItem.category,
        listId: localItem.listId,
        status: 'local_only',
        isInOutbox,
      });
    } else {
      const fieldDiffs = compareGroceryItems(localItem, serverItem);
      if (fieldDiffs.length === 0) {
        itemIdentical.push({
          id,
          name: localItem.name,
          category: localItem.category,
          listId: localItem.listId,
          status: 'identical',
          isInOutbox,
        });
      } else {
        itemModified.push({
          id,
          name: localItem.name,
          category: localItem.category,
          listId: localItem.listId,
          status: 'modified',
          differences: fieldDiffs,
          isInOutbox,
        });
      }
    }
  }

  // Check server items that don't exist locally
  for (const [id, serverItem] of serverItemsMap.entries()) {
    if (!localItemsMap.has(id)) {
      itemServerOnly.push({
        id,
        name: serverItem.name,
        category: serverItem.category,
        listId: serverItem.listId,
        status: 'server_only',
      });
    }
  }

  // Check lists
  const localListsMap = new Map<string, GroceryList>(localState.lists.map((l) => [l.id, l]));
  const serverListsMap = new Map<string, GroceryList>(serverState.lists.map((l) => [l.id, l]));

  const listIdentical: ListDifference[] = [];
  const listLocalOnly: ListDifference[] = [];
  const listServerOnly: ListDifference[] = [];
  const listModified: ListDifference[] = [];

  for (const [id, localList] of localListsMap.entries()) {
    const serverList = serverListsMap.get(id);
    if (!serverList) {
      listLocalOnly.push({
        id,
        name: localList.name,
        status: 'local_only',
      });
    } else {
      const fieldDiffs = compareGroceryLists(localList, serverList);
      if (fieldDiffs.length === 0) {
        listIdentical.push({
          id,
          name: localList.name,
          status: 'identical',
        });
      } else {
        listModified.push({
          id,
          name: localList.name,
          status: 'modified',
          differences: fieldDiffs,
        });
      }
    }
  }

  for (const [id, serverList] of serverListsMap.entries()) {
    if (!localListsMap.has(id)) {
      listServerOnly.push({
        id,
        name: serverList.name,
        status: 'server_only',
      });
    }
  }

  // Check autoListRules
  const localRulesMap = new Map<string, AutoListRule>((localState.autoListRules || []).map((r) => [r.id, r]));
  const serverRulesMap = new Map<string, AutoListRule>((serverState.autoListRules || []).map((r) => [r.id, r]));

  const ruleIdentical: RuleDifference[] = [];
  const ruleLocalOnly: RuleDifference[] = [];
  const ruleServerOnly: RuleDifference[] = [];

  for (const [id, localRule] of localRulesMap.entries()) {
    const serverRule = serverRulesMap.get(id);
    if (!serverRule) {
      ruleLocalOnly.push({ id, keyword: localRule.keyword, status: 'local_only' });
    } else if (localRule.keyword === serverRule.keyword && localRule.targetListId === serverRule.targetListId) {
      ruleIdentical.push({ id, keyword: localRule.keyword, status: 'identical' });
    } else {
      ruleLocalOnly.push({ id, keyword: localRule.keyword, status: 'local_only' });
    }
  }

  for (const [id, serverRule] of serverRulesMap.entries()) {
    if (!localRulesMap.has(id)) {
      ruleServerOnly.push({ id, keyword: serverRule.keyword, status: 'server_only' });
    }
  }

  // Calculate items that are truly stale (in local only, but not in outbox)
  const staleLocalItems = itemLocalOnly.filter((i) => !i.isInOutbox);

  const isIdentical =
    itemLocalOnly.length === 0 &&
    itemServerOnly.length === 0 &&
    itemModified.length === 0 &&
    listLocalOnly.length === 0 &&
    listServerOnly.length === 0 &&
    listModified.length === 0 &&
    ruleLocalOnly.length === 0 &&
    ruleServerOnly.length === 0;

  return {
    timestamp: Date.now(),
    isIdentical,
    summary: {
      totalItemsLocal: localState.items.length,
      totalItemsServer: serverState.items.length,
      identicalItemsCount: itemIdentical.length,
      localOnlyItemsCount: itemLocalOnly.length,
      serverOnlyItemsCount: itemServerOnly.length,
      modifiedItemsCount: itemModified.length,
      pendingOutboxCount: outbox.length,
      staleLocalCount: staleLocalItems.length,
    },
    items: {
      identical: itemIdentical,
      localOnly: itemLocalOnly,
      serverOnly: itemServerOnly,
      modified: itemModified,
    },
    lists: {
      identical: listIdentical,
      localOnly: listLocalOnly,
      serverOnly: listServerOnly,
      modified: listModified,
    },
    rules: {
      identical: ruleIdentical,
      localOnly: ruleLocalOnly,
      serverOnly: ruleServerOnly,
    },
  };
}

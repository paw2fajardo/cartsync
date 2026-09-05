import { GroceryItem } from '../types';

/**
 * Reconciles two versions of a GroceryItem using a Completion-Preserving LWW strategy:
 * 1. Content attributes (name, quantity, unit, category, note, listId, addedBy) are resolved
 *    via Last-Write-Wins based on item updatedAt timestamp.
 * 2. Completion state (completed, completedAt, completedBy) is resolved independently based
 *    on the timestamp of the completion/uncompletion action.
 * 3. The merged canonical item takes the max(updatedAt) to ensure monotonic forward progression.
 */
export function resolveItemConflict(existing: GroceryItem, incoming: GroceryItem): GroceryItem {
  if (!existing) return incoming;
  if (!incoming) return existing;

  // 1. Content Resolution: LWW on content
  const existingContentTime = existing.contentUpdatedAt ?? (
    existing.completed ? (existing.createdAt || existing.updatedAt || 0) : (existing.updatedAt || 0)
  );
  const incomingContentTime = incoming.contentUpdatedAt ?? (
    incoming.completed ? (incoming.createdAt || incoming.updatedAt || 0) : (incoming.updatedAt || 0)
  );

  const useIncomingContent = incomingContentTime >= existingContentTime;
  const contentBase = useIncomingContent ? incoming : existing;
  const resolvedContentTime = Math.max(existingContentTime, incomingContentTime);

  // 2. Completion Resolution:
  // - For completed items: completion timestamp is completedAt ?? updatedAt.
  // - For uncompleted items: uncheck/creation timestamp is updatedAt.
  // When merging a completed item with an uncompleted item:
  //   - If the uncompleted item's updatedAt is strictly greater than the completed item's completedAt/updatedAt,
  //     it was unchecked after being completed, so uncheck wins.
  //   - Otherwise, the completion wins.
  let useIncomingCompletion = false;

  if (incoming.completed && !existing.completed) {
    const incomingCompTime = incoming.completedAt ?? incoming.updatedAt ?? 0;
    const existingUncheckTime = existing.updatedAt ?? 0;
    // Incoming completed wins unless existing was explicitly unchecked after incoming was completed
    useIncomingCompletion = incomingCompTime >= existingUncheckTime;
  } else if (!incoming.completed && existing.completed) {
    const existingCompTime = existing.completedAt ?? existing.updatedAt ?? 0;
    const incomingUncheckTime = incoming.updatedAt ?? 0;
    // Determine if the incoming uncompleted item represents an explicit uncheck action
    // vs. a content-only edit that was never aware of the completion.
    // If the incoming item has contentUpdatedAt matching its updatedAt (or has no completedAt history),
    // it was likely a content-only edit from a device that never saw the completion — preserve completion.
    const incomingContentTime = incoming.contentUpdatedAt ?? 0;
    const isContentOnlyEdit = incomingContentTime > 0 && incomingContentTime === (incoming.updatedAt ?? 0);
    // Incoming uncompleted wins only if it's an explicit uncheck (not a content-only edit)
    // that happened after the existing was completed
    useIncomingCompletion = !isContentOnlyEdit && incomingUncheckTime > existingCompTime;
  } else if (incoming.completed && existing.completed) {
    const existingCompTime = existing.completedAt ?? existing.updatedAt ?? 0;
    const incomingCompTime = incoming.completedAt ?? incoming.updatedAt ?? 0;
    useIncomingCompletion = incomingCompTime >= existingCompTime;
  } else {
    // Both active / uncompleted
    useIncomingCompletion = (incoming.updatedAt ?? 0) >= (existing.updatedAt ?? 0);
  }

  const completionBase = useIncomingCompletion ? incoming : existing;

  // 3. Compose merged canonical item
  const merged: GroceryItem = {
    id: existing.id || incoming.id,
    listId: contentBase.listId,
    name: contentBase.name,
    quantity: contentBase.quantity,
    unit: contentBase.unit,
    category: contentBase.category,
    note: contentBase.note,
    addedBy: contentBase.addedBy,
    createdAt: Math.min(existing.createdAt || Date.now(), incoming.createdAt || Date.now()),
    completed: completionBase.completed,
    completedAt: completionBase.completed ? completionBase.completedAt : null,
    completedBy: completionBase.completed ? completionBase.completedBy : null,
    contentUpdatedAt: resolvedContentTime,
    updatedAt: Math.max(existing.updatedAt || 0, incoming.updatedAt || 0, resolvedContentTime),
  };

  return merged;
}

/**
 * Reconciles an array of incoming items with an existing array of items using Completion-Preserving LWW.
 */
export function resolveItemListConflict(
  existingItems: GroceryItem[],
  incomingItems: GroceryItem[]
): GroceryItem[] {
  const existingMap = new Map<string, GroceryItem>();
  for (const item of existingItems) {
    if (item && item.id) {
      existingMap.set(item.id, item);
    }
  }

  const mergedMap = new Map<string, GroceryItem>();

  // Reconcile incoming items with existing records
  for (const incoming of incomingItems) {
    if (!incoming || !incoming.id) continue;
    const existing = existingMap.get(incoming.id);
    if (existing) {
      mergedMap.set(incoming.id, resolveItemConflict(existing, incoming));
    } else {
      mergedMap.set(incoming.id, incoming);
    }
  }

  // Preserve existing items that were not in incoming list
  for (const [id, item] of existingMap.entries()) {
    if (!mergedMap.has(id)) {
      mergedMap.set(id, item);
    }
  }

  return Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

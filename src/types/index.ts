export type DeviceIcon = 'smartphone' | 'tablet' | 'laptop' | 'monitor' | 'home';

export interface DeviceProfile {
  id: string;
  name: string;
  color: string;
  icon: DeviceIcon;
  isCustomName: boolean;
  lastActive: number;
}

export type ItemCategory =
  | 'Produce'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Meat & Seafood'
  | 'Pantry'
  | 'Frozen'
  | 'Snacks & Sweets'
  | 'Beverages'
  | 'Household & Cleaning'
  | 'Pharmacy & Health'
  | 'Personal Care'
  | 'Baby Care'
  | 'Pet Care'
  | 'Other';

export interface DeviceRef {
  deviceId: string;
  deviceName: string;
  color?: string;
}

export interface GroceryItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit?: string;
  category: ItemCategory;
  note?: string;
  completed: boolean;
  completedAt: number | null;
  completedBy: DeviceRef | null;
  addedBy: DeviceRef;
  createdAt: number;
  updatedAt: number;
}

export interface GroceryList {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AutoListRule {
  id: string;
  keyword: string;         // e.g. "gardenia", "kirkland", "advil"
  targetListId: string;    // e.g. "list_supermarket", "list_costco"
  category?: ItemCategory; // optional category override, e.g. "Bakery"
  createdAt: number;
}

export type SyncStatus = 'connected' | 'connecting' | 'disconnected' | 'offline';

export interface SyncMessage {
  type:
    | 'SYNC_INIT'
    | 'SYNC_STATE'
    | 'ITEM_UPSERT'
    | 'ITEM_DELETE'
    | 'LIST_UPSERT'
    | 'LIST_DELETE'
    | 'AUTO_LIST_RULE_UPSERT'
    | 'AUTO_LIST_RULE_DELETE'
    | 'BATCH_UPDATE'
    | 'DEVICE_PING'
    | 'DEVICE_LIST';
  deviceId: string;
  timestamp: number;
  payload?: any;
}

export interface HouseholdState {
  version: number;
  lists: GroceryList[];
  items: GroceryItem[];
  devices: DeviceProfile[];
  autoListRules?: AutoListRule[];
  lastSyncedAt: number;
}

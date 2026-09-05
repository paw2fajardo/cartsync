import {
  DeviceProfile,
  GroceryItem,
  GroceryList,
  HouseholdState,
  SyncMessage,
  SyncStatus,
  AutoListRule,
} from '../types';

type SyncListener = (event: {
  type: string;
  state?: HouseholdState;
  item?: GroceryItem;
  list?: GroceryList;
  autoListRule?: AutoListRule;
  deletedItemId?: string;
  deletedListId?: string;
  deletedRuleId?: string;
  devices?: DeviceProfile[];
  householdName?: string;
  adminPinConfigured?: boolean;
}) => void;

type StatusListener = (status: SyncStatus) => void;

class SyncClient {
  private ws: WebSocket | null = null;
  private status: SyncStatus = 'disconnected';
  private syncListeners: Set<SyncListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private currentDevice: DeviceProfile | null = null;
  private isExplicitlyOffline = false;

  public init(device: DeviceProfile): void {
    this.currentDevice = device;
    this.connect();

    // Listen to browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isExplicitlyOffline = false;
        this.connect();
      });
      window.addEventListener('offline', () => {
        this.setStatus('offline');
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
      });
    }
  }

  public updateDevice(device: DeviceProfile): void {
    this.currentDevice = device;
    if (this.status === 'connected') {
      this.send({
        type: 'DEVICE_PING',
        deviceId: device.id,
        timestamp: Date.now(),
        payload: device,
      });
    }
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public onSync(listener: SyncListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(newStatus: SyncStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((l) => l(newStatus));
    }
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }

    this.setStatus('connecting');

    try {
      // Determine ws url (support wss:// dynamically when behind SSL reverse proxies)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      const wsUrl = window.location.port === '5173'
        ? `ws://${host}:3001`
        : `${protocol}//${window.location.host}/ws`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');

        if (this.currentDevice) {
          this.send({
            type: 'DEVICE_PING',
            deviceId: this.currentDevice.id,
            timestamp: Date.now(),
            payload: this.currentDevice,
          });
        }
      };

      socket.onmessage = (event) => {
        try {
          const msg: SyncMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('[SyncClient] Parse error:', err);
        }
      };

      socket.onclose = () => {
        this.ws = null;
        if (!navigator.onLine) {
          this.setStatus('offline');
        } else {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        // Will trigger onclose
      };
    } catch (err) {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (navigator.onLine && !this.isExplicitlyOffline) {
        this.connect();
      }
    }, delay);
  }

  private handleServerMessage(msg: SyncMessage): void {
    switch (msg.type) {
      case 'SYNC_STATE':
        this.syncListeners.forEach((l) =>
          l({
            type: 'SYNC_STATE',
            state: msg.payload as HouseholdState,
          })
        );
        break;

      case 'ITEM_UPSERT':
        this.syncListeners.forEach((l) =>
          l({
            type: 'ITEM_UPSERT',
            item: msg.payload as GroceryItem,
          })
        );
        break;

      case 'ITEM_DELETE':
        this.syncListeners.forEach((l) =>
          l({
            type: 'ITEM_DELETE',
            deletedItemId: msg.payload?.itemId,
          })
        );
        break;

      case 'LIST_UPSERT':
        this.syncListeners.forEach((l) =>
          l({
            type: 'LIST_UPSERT',
            list: msg.payload as GroceryList,
          })
        );
        break;

      case 'LIST_DELETE':
        this.syncListeners.forEach((l) =>
          l({
            type: 'LIST_DELETE',
            deletedListId: msg.payload?.listId,
          })
        );
        break;

      case 'AUTO_LIST_RULE_UPSERT':
        this.syncListeners.forEach((l) =>
          l({
            type: 'AUTO_LIST_RULE_UPSERT',
            autoListRule: msg.payload as AutoListRule,
          })
        );
        break;

      case 'AUTO_LIST_RULE_DELETE':
        this.syncListeners.forEach((l) =>
          l({
            type: 'AUTO_LIST_RULE_DELETE',
            deletedRuleId: msg.payload?.ruleId,
          })
        );
        break;

      case 'DEVICE_LIST':
        this.syncListeners.forEach((l) =>
          l({
            type: 'DEVICE_LIST',
            devices: msg.payload as DeviceProfile[],
          })
        );
        break;

      case 'HOUSEHOLD_NAME_UPDATE':
        this.syncListeners.forEach((l) =>
          l({
            type: 'HOUSEHOLD_NAME_UPDATE',
            householdName: msg.payload?.householdName,
          })
        );
        break;

      case 'ADMIN_PIN_UPDATE':
        this.syncListeners.forEach((l) =>
          l({
            type: 'ADMIN_PIN_UPDATE',
            adminPinConfigured: msg.payload?.adminPinConfigured,
          })
        );
        break;

      case 'BATCH_UPDATE':
        if (msg.payload) {
          this.syncListeners.forEach((l) =>
            l({
              type: 'SYNC_STATE',
              state: msg.payload as HouseholdState,
            })
          );
        }
        break;
    }
  }

  public broadcastHouseholdName(name: string): void {
    this.send({
      type: 'HOUSEHOLD_NAME_UPDATE',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: { householdName: name },
    });
  }

  public broadcastAdminPin(pinHash: string | null): void {
    this.send({
      type: 'ADMIN_PIN_UPDATE',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: { pinHash },
    });
  }

  public send(msg: SyncMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public broadcastItemUpsert(item: GroceryItem): void {
    this.send({
      type: 'ITEM_UPSERT',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: item,
    });
  }

  public broadcastItemDelete(itemId: string): void {
    this.send({
      type: 'ITEM_DELETE',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: { itemId },
    });
  }

  public broadcastListUpsert(list: GroceryList): void {
    this.send({
      type: 'LIST_UPSERT',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: list,
    });
  }

  public broadcastListDelete(listId: string): void {
    this.send({
      type: 'LIST_DELETE',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: { listId },
    });
  }

  public broadcastAutoListRuleUpsert(rule: AutoListRule): void {
    this.send({
      type: 'AUTO_LIST_RULE_UPSERT',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: rule,
    });
  }

  public broadcastAutoListRuleDelete(ruleId: string): void {
    this.send({
      type: 'AUTO_LIST_RULE_DELETE',
      deviceId: this.currentDevice ? this.currentDevice.id : 'unknown',
      timestamp: Date.now(),
      payload: { ruleId },
    });
  }

  // HTTP Fallback Sync
  public async httpSync(
    lists: GroceryList[],
    items: GroceryItem[],
    autoListRules?: AutoListRule[]
  ): Promise<HouseholdState | null> {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lists,
          items,
          autoListRules,
          device: this.currentDevice,
        }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[SyncClient] HTTP sync failed:', err);
    }
    return null;
  }
}

export const syncClient = new SyncClient();

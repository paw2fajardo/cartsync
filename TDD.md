# CartSync — Technical Design Document (TDD)

**Document Name:** Technical Design Document (TDD) & Architecture Specification  
**Version:** 2.0.0  
**Target System:** CartSync PWA & Node 22 Embedded SQLite Sync Engine  
**Author / Lead:** Engineering & System Architecture  
**Status:** Active / Approved  

---

## 1. System Architecture Overview

CartSync operates on a **Local-First, Dual-Database Synchronization Architecture**. The client acts as the authoritative instantaneous state provider with zero-latency IndexedDB persistence, while the Node.js sync server maintains durable SQLite persistence and coordinates multi-device WebSocket broadcasts.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (PWA)                            │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                        React 18 + Vite UI                      │   │
│   │   [Header] [ListSelector] [ItemList] [QuickAddBar] [Modals]    │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ State Mutate                       │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               React Context Layer (GroceryContext)             │   │
│   │     - Optimistic State Updates (<16ms)                         │   │
│   │     - Device Context & Auth Security Context                   │   │
│   └──────────────┬─────────────────────────────────┬───────────────┘   │
│                  │                                 │                   │
│                  ▼                                 ▼                   │
│   ┌──────────────────────────────┐  ┌──────────────────────────────┐   │
│   │   Browser IndexedDB Store    │  │    WebSocket Sync Client     │   │
│   │   Database: `cartsync_db`    │  │    (Auto-reconnect & queue)  │   │
│   └──────────────────────────────┘  └──────────────┬───────────────┘   │
└────────────────────────────────────────────────────┼───────────────────┘
                                                     │ ws:// (port 3001)
                                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER (Node 22)                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Express HTTP & WS Server (index.js)            │   │
│   │   - REST API: /api/sync, /api/reset, /api/health, /api/backup  │   │
│   │   - WebSocket Handler: Client broadcast & heartbeat            │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │             Embedded SQLite Database (`cartsync.db`)           │   │
│   │   - Node 22 native `node:sqlite` in WAL Mode                   │   │
│   │   - Relational Tables: lists, items, devices, rules, config    │   │
│   │   - Foreign Keys & ON DELETE CASCADE enforcement               │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Models & Database Schemas

### 2.1 SQLite Relational Schema (`server/db.js`)

```sql
-- Lists Table
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'shopping-cart',
  color TEXT NOT NULL DEFAULT 'emerald',
  description TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Grocery Items Table
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  listId TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  quantity REAL,
  unit TEXT,
  note TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  createdBy TEXT,
  completedBy TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  completedAt INTEGER,
  FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
);

-- Device Registry Table
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  lastSeen INTEGER NOT NULL
);

-- Routing Rules Table
CREATE TABLE IF NOT EXISTS routing_rules (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT,
  targetListId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (targetListId) REFERENCES lists(id) ON DELETE CASCADE
);

-- Household Configuration Table
CREATE TABLE IF NOT EXISTS household_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

### 2.2 Client IndexedDB Object Stores (`src/storage/idb.ts`)
- **Database Name**: `cartsync_db` (Version 2)
- **Object Stores**:
  - `lists`: Indexed on `id`, `updatedAt`
  - `items`: Indexed on `id`, `listId`, `completed`, `category`
  - `device`: Key-value store for client profile attribution
  - `rules`: Auto-routing keyword and category rules
  - `config`: Category ordering, PIN hashes, biometric credentials

---

## 3. Synchronization & Conflict Protocol

### 3.1 Real-Time WebSocket Messaging Protocol
Messages transmitted over the WebSocket channel use a standard JSON envelope:

```typescript
export interface SyncMessage<T = unknown> {
  type: 
    | 'ITEM_UPSERT'
    | 'ITEM_DELETE'
    | 'ITEM_TOGGLE'
    | 'LIST_UPSERT'
    | 'LIST_DELETE'
    | 'DEVICE_REGISTER'
    | 'HOUSEHOLD_SYNC'
    | 'RESET_STATE'
    | 'PING'
    | 'PONG';
  payload: T;
  deviceId: string;
  timestamp: number;
}
```

### 3.2 Conflict Resolution: Last-Write-Wins (LWW) with Timestamps
1. Every entity carries a monotonic `updatedAt` timestamp.
2. In the event of conflicting concurrent mutations, the entity with `Math.max(existing.updatedAt, incoming.updatedAt)` takes precedence.
3. Item deletions trigger cascade checks; list deletions enforce `ON DELETE CASCADE` in both SQLite and IndexedDB.

### 3.3 Offline Reconciliation Flow
1. **Network Disconnection**: `syncClient` transitions status to `disconnected`. Mutations write to IndexedDB and queue locally.
2. **Network Reconnection**: `syncClient` sends `POST /api/sync` containing full local snapshot. Server merges SQLite and returns canonical household state, followed by WebSocket reconnection and live broadcast subscription.

---

## 4. Component Structure & State Architecture

### 4.1 Core React Contexts
- **`GroceryContext`**: Manages active list, items query/filtering, optimistic updates, undo buffer, and modal states.
- **`DeviceContext`**: Manages device attribution, friendly name, color, and device detector initialization.
- **`AuthContext`**: Manages household passcode state, master PIN, WebAuthn biometric challenges, and lock-screen status.
- **`ThemeContext`**: Controls dark (`slate-900`), light (`slate-50`), and system auto color themes.

### 4.2 Custom React Hooks
- **`useModalBackNavigation(isOpen, onClose, modalId)`**: Pushes synthetic history state onto the browser window history when a modal opens, intercepting `popstate` events (hardware back button / mobile swipe back) to dismiss modals without exiting the PWA.
- **`useSwipeListNavigation({ lists, activeListId, onSelect, enabled })`**: Touch gesture handler supporting smooth horizontal swipes with distance thresholds (`> 50px`) and velocity checks.
- **`useBodyScrollLock(isLocked)`**: Disables underlying viewport scrolling when high-elevation drawers or modals are rendered.

### 4.3 Key Utilities
- **`src/utils/smartCategorizer.ts`**: Natural language lexer and tokenizer for quantity extraction (`/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.*)$/i`) and keyword dictionary matching across 12+ grocery categories.
- **`src/utils/biometrics.ts`**: WebAuthn credential creation (`navigator.credentials.create`) and assertion (`navigator.credentials.get`) supporting Touch ID, Face ID, and Windows Hello.
- **`src/utils/deviceDetector.ts`**: User-agent parser identifying mobile/tablet/desktop platforms and assigning palette colors.

---

## 5. Security & Authentication Architecture

1. **Client-Side PIN Hashing**: Passcodes are hashed with SHA-256 before persistence in IndexedDB or SQLite config stores.
2. **WebAuthn Biometric Handshake**: Platform authenticator (`attachment: "platform"`) challenges generate ECDSA credential pairs stored securely in device hardware enclaves.
3. **Containerized Process Isolation**: Multi-stage Docker image runs under a dedicated unprivileged non-root user (`nodejs:nodejs`, UID 10001) with persistent data mounted to `/app/data`.

---

## 6. Testing & Quality Assurance Architecture

CartSync enforces a rigorous 3-tier testing strategy via **Vitest**:
1. **Unit Tests**: NLP categorization, unit regex parser, device detector heuristics, biometrics fallbacks.
2. **Integration Tests**: SQLite CRUD, foreign key cascades, REST `/api/sync` merge algorithms, WebSocket peer broadcasts.
3. **Component & Hook Tests**: Modal back navigation, list swipe gestures, undo toasts, and dark mode WCAG contrast ergonomics.
- **Current Test Coverage**: **226 automated tests across 21 test suites (100% passing)**.

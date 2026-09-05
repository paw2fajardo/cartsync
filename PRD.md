# CartSync — Product Requirements Document (PRD)

**Product Name:** CartSync  
**Document Version:** 2.0.0  
**Status:** Approved / Active  
**Target Audience:** Modern Households, Families, Roommates, Offline-First Mobile Shoppers  
**Tech Stack:** React 18, TypeScript, Tailwind CSS, IndexedDB, Node.js (v22), SQLite (`cartsync.db`), WebSockets, Docker  

---

## 1. Executive Summary & Product Vision

### 1.1 Problem Statement
Modern grocery and household shopping list apps face critical friction points:
1. **Network Fragility**: Basement supermarkets and warehouse stores (e.g., Costco) often suffer from dead mobile zones, causing cloud-only apps to hang or fail to load.
2. **Cloud Service Complexity & Privacy**: Many solutions require mandatory 3rd-party user accounts, invasive ads, tracking, or fragile external cloud database services.
3. **Multi-User Chaos**: Family members check off or add items simultaneously without clarity on who made modifications or whether other household members are actively connected.
4. **Ergonomic Deficiency**: Desktop-ported UIs fail one-handed thumb usability when pushing shopping carts through busy aisles.

### 1.2 Product Vision
CartSync is a **local-first, privacy-centric, mobile-first household grocery & shopping list Progressive Web Application (PWA)**. It provides zero-latency offline performance via browser-native IndexedDB combined with real-time multi-device synchronization through a self-hosted embedded Node 22 native SQLite database and WebSockets.

---

## 2. Target Personas & Core Use Cases

### 2.1 Personas
- **The In-Store Shopper (Sarah)**: Walking grocery aisles with one hand on the cart and one hand on her smartphone. Needs fast, one-tap checking, one-handed quick input, and reliable offline access when reception drops.
- **The Home Coordinator (Alex)**: Planning weekly meal prep on a tablet or laptop. Needs quick list creation, category management, and automatic routing of items to appropriate store lists.
- **The Privacy-Minded Household Admin (David)**: Desires a self-hosted, containerized household hub with PIN and biometric protection, zero cloud subscriptions, and full data export/reset ownership.

### 2.2 Core User Stories
- **US-1 (Offline Shopping)**: As a shopper in a basement aisle, I want to add and check off items without network connectivity, so my shopping trip is never interrupted.
- **US-2 (Live Collaboration)**: As a family member at home, I want items I add to appear instantly on my partner's phone in the store.
- **US-3 (Natural Language Input)**: As a busy user, I want to type `"2 Oat Milk 1L"` or `"Honeycrisp Apples 3"` and have the app automatically parse quantity, unit, and assign the item to *Dairy & Eggs* or *Produce*.
- **US-4 (Device Attribution)**: As a household member, I want to see which device added or completed an item with subtle color badges.
- **US-5 (List Management & Routing)**: As a user, I want to organize items across *Supermarket*, *Costco*, *Pharmacy*, etc., with in-place list renaming and automated rule-based routing.
- **US-6 (Household Admin & Security)**: As a household admin, I want to optionally secure configuration with a master PIN and biometric authentication (Touch ID / Face ID / Windows Hello).

---

## 3. Product Features & Functional Requirements

### 3.1 Mobile-First UI & Ergonomics
- **FR-1.1 Bottom Quick-Add Dock**: Fixed floating bottom bar within ergonomic thumb reach (`pb-safe`) featuring natural language input and live category/quantity badges.
- **FR-1.2 List Selector & Swipe Navigation**: Horizontal list pills with active item counters, pinned `+ New` button, and horizontal swipe gestures (`useSwipeListNavigation`) between lists.
- **FR-1.3 Tactile Item Interaction**: 40px+ touch targets for round checkboxes, tactile micro-interactions (`active:scale-95`), collapsible completed accordion, and undo toast feedback (`UndoToast`).
- **FR-1.4 Native Modal Navigation**: Interception of hardware/browser back buttons (`useModalBackNavigation`) so back gestures dismiss open modals rather than exiting the application.
- **FR-1.5 Theme System**: Seamless toggle between Light (`slate-50`), Dark (`slate-900` midnight slate with frosted glassmorphism), and System Auto.
- **FR-1.6 Glassmorphic Event Toasts**: Lightweight frosted glassmorphic notification banner (`backdrop-blur-md`, slate border/background) triggered strictly on new item creation (locally or via WebSocket) and deletion (with 3-second Undo safety action). Strictly suppressed for quantity changes.

### 3.2 Local-First Dual-Database Sync
- **FR-2.1 Client Offline Persistence**: All lists, items, and device settings persist immediately to browser IndexedDB (`cartsync_db`) with fallback to `localStorage`.
- **FR-2.2 Server Embedded SQLite**: Server persists state in durable, ACID-compliant SQLite (`cartsync.db`) using native `node:sqlite` in WAL mode, persisting full contributor attribution stacks.
- **FR-2.3 Real-Time WebSocket Synchronization**: Automatic bi-directional syncing of item inserts, updates, toggles, deletions, and list mutations with heartbeat and reconnect resilience.
- **FR-2.4 Connection Indicator & Sync Modal**: Header live status badge with detailed `SyncStatusModal` showing WebSocket state, connected peers, and manual sync triggers.

### 3.3 Smart Categorization, NLP & Duplicate Detection
- **FR-3.1 Automated Parser**: Regular expression and dictionary-based extraction of quantities, measurement units (`kg`, `g`, `L`, `ml`, `pack`, `dozen`, `cans`, etc.), and category classification across 12+ aisles.
- **FR-3.2 Category Reorganization**: `CategoryManagerModal` allowing households to reorder aisles to match physical supermarket floor layouts.
- **FR-3.3 Auto-List Routing Rules**: `AutoListRulesModal` allowing keyword and category triggers to automatically direct items to target lists (e.g. pharmacy items automatically filed under "Pharmacy").
- **FR-3.4 Smart Duplicate Detection & Suffix Distinction**: Text normalization for casing, whitespace, and minor plurals (`apples` -> `apple`). Explicit qualifiers/modifiers (`Soap - Daddy` vs `Soap - Mommy`, `Milk (Almond)`) are preserved distinctly without merging. Generic matches auto-increment existing item quantity.

### 3.4 Device Attribution, Contributor Badges & Decrement Stack
- **FR-4.1 Automatic Device Detection**: Detects device class (Mobile, Tablet, Desktop, Hub) and OS to generate friendly defaults (e.g., *Kitchen iPad*, *Pixel Phone*).
- **FR-4.2 Device Customization**: `DeviceModal` allows users to select avatar color, icon, and custom name.
- **FR-4.3 Subtle Attribution Tags**: Displays author and completed-by attribution tags on grocery cards.
- **FR-4.4 Multi-Device Contributor Badges & LIFO Decrement Reversal**: Tracks ordered contributor stack (`contributors: Array<{ deviceId, count }>`). Shows primary creator badge + colored increment pill (e.g. `+1`) with tap-to-inspect popover breakdown. Tapping `-` decrements quantity and pops the most recent contributor layer (LIFO), deleting item when quantity reaches 0.

### 3.5 Household Security & Administration
- **FR-5.1 Passcode Lock**: Configurable household lock screen (`LockScreen`) with customizable 4-to-6 digit PIN.
- **FR-5.2 Master Admin PIN**: Protected administrative utilities (`AdminModal`) requiring master authentication.
- **FR-5.3 Biometric Authentication (WebAuthn)**: Hardware-backed biometrics (Touch ID, Face ID, Windows Hello) via [`src/utils/biometrics.ts`](file:///d:/git/cartsync/src/utils/biometrics.ts).
- **FR-5.4 Database Management**: Full JSON database backup export, manual sync reset, and default factory household restore.

---

## 4. Non-Functional Requirements (NFRs)

- **Performance & Latency**: UI interactions (checking items, adding items) must execute in `< 16ms` (optimistic UI update).
- **Reliability & Offline-Readiness**: App must function 100% offline indefinitely and synchronize upon network restoration without data loss.
- **Accessibility (WCAG 2.1 AAA/AA)**: Text contrast exceeds 7:1 for headers, 4.5:1 for body metadata. Touch targets exceed minimum 40×40px.
- **Portability & Containerization**: Deployable via Docker & Docker Compose with multi-stage Alpine build serving client PWA and Node sync server on port `3001`.

---

## 5. Success Metrics & KPIs
- **Sync Reliability**: Zero sync collision errors during concurrent family shopping sessions.
- **Offline Availability**: 100% core shopping functionality retained when disconnected.
- **Test Quality**: > 95% test coverage across backend SQLite, REST/WS sync, and React UI workflows (290+ automated tests across 29 test suites).

# CartSync — Modern Local-First Grocery & Household Lists

A sleek, mobile-first, local-first grocery and household shopping list Progressive Web Application (PWA) with real-time multi-device synchronization and automatic device attribution.

Built with **Vite, React 18, TypeScript, Tailwind CSS, Lucide Icons, IndexedDB, Node.js, SQLite (`cartsync.db`), and WebSockets**.

---

## Key Highlights

- **Modern & Mobile-First Clean UI**:
  - Uncluttered, calm aesthetic inspired by Apple Reminders and Things 3.
  - Sticky bottom thumb-friendly quick-add bar: easily add items with one hand while walking supermarket aisles.
  - Horizontal list switcher pills with live item count badges and in-place list renaming/editing.
  - Smooth horizontal swipe gestures (`useSwipeListNavigation`) to switch between lists effortlessly on mobile devices.
  - Distraction-free: active items remain the star; completed items tuck into a clean collapsible accordion with undo toast feedback.
  - Hardware / browser back button navigation interception (`useModalBackNavigation`) for fluid modal dismissals on Android and mobile browsers.

- **Local-First Dual-Database Architecture**:
  - **Client Storage**: Browser IndexedDB (`cartsync_db`) with localStorage fallback. Operates 100% offline with instant zero-latency updates, even in basement grocery aisles with zero cell reception.
  - **Server Storage**: Embedded **SQLite database (`cartsync.db`)** via Node 22 native `node:sqlite`. Zero external database services to maintain, ACID-compliant, durable, and self-contained in a single file.
  - **Real-Time WebSockets**: Instant bi-directional push when connected. Check off an item on your phone, and it instantly strikes through on family members' screens.
  - **Sync Status & Household Connectivity**: Real-time connection indicator with `SyncStatusModal` showing peer count, WebSocket health, and reconnect utilities.

- **Household Security & Admin Control Center**:
  - Optional household PIN protection and master admin passcode to restrict sensitive configuration.
  - WebAuthn Biometric authentication (TouchID, FaceID, Windows Hello) support for instant, passwordless administrative unlocks.
  - Admin Control Center (`AdminModal`) with database backup/export, household reset utilities, and security configuration.

- **Automatic Device Attribution & Customization**:
  - Automatically identifies device type (Phone, Tablet, Desktop, Laptop, Home Hub) and generates friendly names (e.g., *Kitchen iPad*, *Dad Phone*).
  - One-tap rename modal to customize your device name, avatar color, and icon.
  - Muted, elegant attribution tags show who added or completed items without cluttering the screen.

- **Smart Natural Language Input & Auto-Routing**:
  - Understands quantities, units, and categories automatically (e.g., *"3 Honeycrisp apples"*, *"Oat milk 2L"*, *"Eggs dozen"*).
  - Automatically files items into aisles (*Produce*, *Dairy & Eggs*, *Bakery*, *Meat & Seafood*, *Pantry*, *Beverages*, etc.).
  - Category Reorganization & Manager (`CategoryManagerModal`) to customize aisle ordering and display.
  - Intelligent Auto-List Routing (`AutoListRulesModal`) to route specific items to dedicated lists automatically (e.g., medications to *Pharmacy*, bulk goods to *Costco*).
  - Optional expander to add custom notes or override aisles.

- **Intelligent Duplicate Detection & Suffix Distinction**:
  - Automatically matches incoming items against active, uncompleted items on the target list.
  - Normalizes casing, whitespace, and minor plural variants (e.g., `apple` vs `apples`, `berries` vs `berry`, `tomatoes` vs `tomato`).
  - Strict Modifier Distinction: Explicit qualifiers, suffixes, or owner tags (e.g., `Soap - Daddy` vs `Soap - Mommy`, `Milk (Almond)` vs `Milk (Oat)`) are treated as distinct items and are never merged.
  - Generic matches automatically increment the existing item's quantity rather than creating duplicate rows.

- **Multi-Device Contributor Badges & LIFO Decrement Stack**:
  - Extended item schema tracks the primary author (`createdBy` / `addedBy`) and subsequent incrementing devices (`contributors: Array<{ deviceId, count }>`).
  - Badge Presentation: Primary creator dot and badge with an adjacent increment pill (e.g., `+1`) themed with the contributing device's color. Tapping the badge opens a glassmorphic popover showing the exact contributor breakdown.
  - Decrement ("-") Reversal: Tapping `-` on an item with quantity > 1 decrements total quantity and pops the most recent incrementing contributor from the stack (LIFO). When their count hits 0, their badge pill is cleanly removed. Dropping to 0 triggers standard deletion.

- **Glassmorphic Event Toasts (Creation & Deletion Only)**:
  - Frosted glassmorphic notification banner (`backdrop-blur-md`, slate border/background) anchored above the QuickAdd bar.
  - Emits when a brand-new item is created (locally or incoming from another device via WebSocket) or when an item is deleted (with an "Undo" action).
  - Strict Suppression Rule: Quantity adjustments (`+`/`-` clicks, inline edits, and duplicate auto-increments) are completely silent. Auto-dismisses in 3 seconds without vertical stacking.

- **Multiple List Management & In-Place Editing**:
  - Out of the box: *Supermarket*, *Costco*, *Pharmacy*, and *Farmers Market*.
  - Create and manage custom lists with distinct icons and color accents.
  - In-place list editing (`EditListModal`) to rename, re-theme icons, and update descriptions without losing item associations or history.
  - Safeguarded destructive list deletion with slide-to-confirm interaction (`SlideToConfirm`).

- **Progressive Web App (PWA)**:
  - Installable web app with standalone mode, clean icons, and `manifest.json`.
  - Service worker caching static assets for immediate offline loading.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Production
```bash
npm run build
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Start the SQLite & WebSocket Sync Server
```bash
npm run server
```
Server runs on `http://localhost:3001` (WebSocket: `ws://localhost:3001`). SQLite persists to `server/cartsync.db`.

### 5. Start the Vite Frontend (Dev Mode)
```bash
npm run dev
```

---

## 🐳 Docker & Containerization

CartSync is fully containerized using a lightweight multi-stage Alpine build that serves both the static PWA frontend and the Node 22 SQLite/WebSocket sync server on a single unified port (`3001`).

### Quickstart with Docker Compose (Recommended)
```bash
docker compose up --build -d
```
Access the application at `http://localhost:3001`. Data is automatically persisted to the `cartsync-sqlite-data` Docker volume.

### Standalone Docker Run
```bash
# Build container image
docker build -t cartsync:latest .

# Run container with persistent volume
docker run -d \
  -p 3001:3001 \
  -v cartsync-data:/app/data \
  --name cartsync-app \
  cartsync:latest
```

---

## Test Coverage
- **290+ Automated Tests** across 29 test suites covering:
  - Intelligent duplicate detection, plural normalization, and modifier distinction
  - Multi-device contributor badge stacking and LIFO decrement reversal
  - Glassmorphic event toasts and strict quantity adjustment suppression
  - Docker multi-stage build, compose, and containerization configuration
  - SQLite backend database and REST/WebSocket synchronization
  - Local-first IndexedDB and localStorage dual-write persistence
  - Smart natural language item categorization, unit extraction, and category reorganization
  - Device detector and profile attribution flows
  - List CRUD, in-place edit/rename metadata, cascade operations, and delete slider confirmation
  - Admin Control Center, Master PIN, and WebAuthn Biometrics integration
  - Modal hardware back button navigation interception (`useModalBackNavigation`)
  - Swipe list gestures, undo toast workflows, and auto-list routing rules
  - Production PWA build artifacts and service worker verification

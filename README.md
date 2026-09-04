# Koffan Grocery PWA — Modern Local-First Household Lists

A sleek, modern, Koffan-inspired grocery and household shopping list Progressive Web Application (PWA) built for seamless family and household collaboration.

Built with **Vite, React 18, TypeScript, Tailwind CSS, Lucide Icons, IndexedDB, Express, and WebSockets**.

---

## Key Highlights

- **Local-First Offline Storage (IndexedDB + localStorage fallback)**:
  - Works 100% offline with instant zero-latency UI updates inside grocery stores or pantries.
  - Changes persist immediately to IndexedDB and automatically synchronize across household devices whenever connected.

- **Automatic Unique Device Detection & Quick Attribution**:
  - Automatically identifies device type (Phone, Tablet, Desktop, Laptop, Home Hub) and generates a friendly default device profile (e.g. *Kitchen iPad*, *Dad Phone*, *Home Desktop*).
  - Quick rename modal allows customizing device name, avatar color, and device icon in seconds.
  - Every item clearly tracks and displays who added it (*"Added by Kitchen iPad"*) and who completed it (*"Checked by Dad Phone"*).

- **Multiple List Management**:
  - Pre-seeded with *Supermarket*, *Costco*, *Pharmacy*, and *Farmers Market*.
  - Create, customize, and delete custom shopping lists with dedicated icons and color accents.
  - Real-time active item counters and list completion progress bars.

- **Item Quick-Add & Smart Auto-Categorization**:
  - Natural input parsing: understands quantities and units (e.g., *"3 Honeycrisp apples"*, *"Oat milk x2"*, *"2.5 kg chicken breast"*, *"dozen eggs"*).
  - Automatically categorizes items into aisles (*Produce*, *Dairy & Eggs*, *Bakery*, *Meat & Seafood*, *Pantry*, *Beverages*, *Household*, *Pharmacy*, etc.).
  - One-tap pantry staple chips for instant addition.
  - Optional item notes (e.g., *"organic only"*, *"check expiry date"*).

- **Delightful Shopping Experience**:
  - Strike-through completion with checkbox animation.
  - Confetti celebration when checking off the last item in a list!
  - Toggle between *Aisle/Category Grouped View* and *Flat List*.
  - Collapsible Completed section with *"Uncheck all"* and *"Clear completed"*.

- **Embedded Lightweight Node WebSocket/HTTP Sync Server**:
  - Express + `ws` server running on port `3001`.
  - Instant bi-directional broadcast of item/list updates and device presence across connected devices.
  - Persistent state in `server/household-data.json`.
  - Fallback REST sync endpoint (`/api/sync`) and health check (`/api/health`).

- **Progressive Web App (PWA)**:
  - Installable web app with standalone mode, icons (192x192, 512x512, SVG), and `manifest.json`.
  - Service worker caching static shell and assets for full offline support.

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

### 3. Start the Household Sync Server
```bash
npm run server
# Server will listen on http://localhost:3001 and ws://localhost:3001
```

### 4. Run Development Client
```bash
npm run dev
# Vite dev server starts on http://localhost:5173
```

---

## Project Structure

```
demo/
├── public/
│   ├── favicon.svg          # Modern SVG favicon
│   ├── icon-192.svg         # PWA icon 192x192
│   ├── icon-512.svg         # PWA icon 512x512
│   ├── manifest.json        # Web App Manifest
│   └── sw.js                # Offline Service Worker
├── server/
│   ├── index.js             # Express & WebSocket real-time sync server
│   └── household-data.json  # Household sync database
├── src/
│   ├── components/
│   │   ├── CompletedList.tsx     # Completed items collapsible accordion
│   │   ├── DeviceModal.tsx       # Device rename & attribution modal
│   │   ├── GroceryItemCard.tsx   # Item card with attribution badges
│   │   ├── Header.tsx            # Navigation header & live sync badge
│   │   ├── ItemList.tsx          # Active items list with aisle grouping
│   │   ├── ListSelector.tsx      # Horizontal list pill switcher
│   │   ├── ListSidebar.tsx       # Full list drawer & household roster
│   │   ├── NewListModal.tsx      # Create custom list modal
│   │   ├── QuickAddBar.tsx       # Smart natural language item input
│   │   └── SyncStatusModal.tsx   # Household sync status & device roster
│   ├── context/
│   │   ├── DeviceContext.tsx     # Device profile & attribution context
│   │   └── GroceryContext.tsx    # Grocery state, IndexedDB, and sync
│   ├── storage/
│   │   ├── idb.ts                # Local-first IndexedDB wrapper
│   │   └── seedData.ts           # Pre-seeded lists and attributed items
│   ├── sync/
│   │   └── syncClient.ts         # Real-time WebSocket sync client
│   ├── types/
│   │   └── index.ts              # TypeScript models and interfaces
│   ├── utils/
│   │   ├── deviceDetector.ts     # Device detection & ID generator
│   │   └── smartCategorizer.ts   # Smart NLP parser & auto-categorizer
│   ├── App.tsx                   # Main App component
│   ├── index.css                 # Tailwind CSS styles
│   └── main.tsx                  # React entry point
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

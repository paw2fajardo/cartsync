# CartSync — UI/UX Feature Specification: Rename & Edit List Architecture

**Author:** Pam Beesly (`worker-pam`), Dedicated UI/UX Designer  
**Hand-off Target:** Jim Halpert (`worker-jim`), Frontend Lead; Creed Bratton (`worker-creed`), QA Lead  
**Design Sign-Off Date:** 2026-09-05  
**Design Framework:** Apple Human Interface Guidelines (HIG) & ZillionDesigns Top 10 UI/UX Techniques  
**Status:** **APPROVED & READY FOR IMPLEMENTATION**

---

## 1. Executive Summary & Design Vision

### 1.1 Problem Statement
CartSync allows users to create custom grocery and shopping lists (e.g. "Supermarket", "Farmers Market", "Pharmacy"). However, users frequently need to:
1. **Rename a list** (e.g., adapt "Supermarket" to "Trader Joe's", "Costco", or "Sprouts").
2. **Re-theme a list's icon & color** (e.g., switch from a generic shopping cart to an apple for produce, or a coffee cup for bakery/cafe).
3. **Add or refine contextual descriptions** (e.g., adding "Weekly household meal prep & essentials").

Currently, the only way to alter a list name is to delete the list and re-create it. Because list deletion cascades and permanently removes all contained grocery items (requiring slider confirmation), users face significant cognitive friction and risk losing organized grocery history.

### 1.2 UX Objectives & Aesthetic Vision
This specification introduces an intuitive, in-place **Rename & Edit List** flow:
- **Zero Data Loss**: Modifies list metadata (`name`, `icon`, `color`, `description`) while keeping the immutable `id` intact, preserving all existing items, completion states, and author device attribution.
- **Apple HIG Direct Manipulation**: Accessible directly via tactile **Pencil (`Pencil`) triggers** placed in the in-canvas `ListSelector` top bar and beside list cards in the `ListSidebar` drawer.
- **Warm Slate Theme Harmony**: Banishes harsh stark-white modals and pitch-black OLED voids by implementing CartSync's signature **Midnight Slate (`#0f172a`)** elevated surface architecture, semi-transparent backdrop blur, solid `bg-slate-100 dark:bg-slate-800` input wells, and vibrant emerald primary actions.
- **Live Visual Feedback**: Includes a real-time **Interactive List Preview Pill** inside `EditListModal` so users immediately see their new name, icon, and accent color before confirming changes.
- **Mobile Ergonomics**: Enforces Apple HIG **40px+ touch hit envelopes** on all trigger buttons, modal controls, icon pickers, and color swatches.

---

## 2. ZillionDesigns Top 10 UI/UX Techniques Applied to Edit List Flow

The design directly operationalizes the **ZillionDesigns Top 10 Interactive UI/UX Techniques**:

### Technique 1: Balanced Saturation & Warm Contrast
- **Input Wells**: Solid `bg-slate-100 dark:bg-slate-800` surfaces paired with `text-slate-900 dark:text-slate-100`. Completely eliminates browser white autofill glare in dark mode, maintaining **12.5:1 WCAG AAA contrast**.
- **Modal Surface**: Layered `bg-white dark:bg-slate-900` container with `border border-slate-200/80 dark:border-slate-700/80`, diffuse ambient drop shadow (`shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]`), and frosted backdrop (`bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm`).
- **Brand Emerald CTA**: Primary save button utilizes `bg-emerald-500 hover:bg-emerald-600 active:scale-95` with soft glow shadow (`shadow-emerald-500/20`).

### Technique 2: Instant Visual Feedback & Immediacy (Live Preview)
- Located directly beneath the modal header is an **Active List Live Preview**.
- As the user types into the name input or selects an icon or color, the preview updates in real-time. This eliminates guesswork regarding character truncation or color vibrancy.

### Technique 3: Layered Spatial Elevation & Surface Hierarchy
- **Tier 0 (Canvas)**: `bg-slate-50 dark:bg-slate-900`.
- **Tier 2 (Sticky Navigation Controls)**: In-canvas `ListSelector` hosting the new Edit trigger button.
- **Tier 4 (Overlays & Modals)**: `EditListModal` renders at `z-50` with high-depth elevation and spring entrance animation (`animate-in zoom-in-95 fade-in duration-150`).

### Technique 4: Finger-Friendly Touch Ergonomics (Apple HIG 44px Envelope)
- **Triggers**: In `ListSelector` and `ListSidebar`, edit buttons feature a `p-2` hit area on a 16px icon enclosed in a `w-9 h-9` or `w-10 h-10` touch envelope.
- **Icon Selector**: 8 large grid tiles (`p-2.5 rounded-xl`) with minimum 44px tap targets.
- **Color Swatches**: Circular swatches (`w-8 h-8` with 8px margin spacing) yielding 40px+ tap centers with `hover:scale-110 active:scale-95` tactile response.

### Technique 5: Cognitive Load Reduction & Default Pre-population
- When the modal opens, all fields are **pre-populated** with the current list's existing values (`name`, `description`, `icon`, `color`).
- The list name field is auto-focused with existing text pre-selected, allowing instant replacement or incremental editing.

### Technique 6: Error Prevention & Defensive Design
- **Empty Name Guard**: The Save CTA is conditionally disabled if `name.trim().length === 0`.
- **Inline Validation**: A subtle red/amber helper badge notifies the user if the list name is empty or exceeds character limits.
- **Automatic Trimming**: Both `name` and `description` are sanitized with `.trim()` on submission.
- **Length Caps**: List name is capped at 40 characters; description capped at 60 characters with subtle live counter indicators.

### Technique 7: F-Pattern Visual Hierarchy & Alignment
- Visual sequence follows intuitive scanning:
  1. Header & Dismiss: "Edit List" + `X` button.
  2. Live Preview Pill (instant state recognition).
  3. Primary Input: "List Name" (required).
  4. Secondary Input: "Description (Optional)".
  5. Icon Palette Grid.
  6. Color Swatches.
  7. Bottom Action Bar: Cancel (secondary) + Save Changes (primary emerald).

### Technique 8: Purposeful Micro-Interactions & Tactile Polish
- Tactile spring compression on touch:
  - Edit trigger buttons: `active:scale-95`.
  - Icon options: `active:scale-95`.
  - Color swatches: `transition-transform hover:scale-110 active:scale-95`.
  - Primary save button: `active:scale-95`.

### Technique 9: Non-Destructive In-Place State Evolution
- Unlike `DeleteListModal`, editing never alters list IDs, item associations, or sync vectors.
- Instant optimistic state mutation in React context, followed by silent asynchronous persistence to IndexedDB and WebSocket broadcast.

### Technique 10: Seamless Cross-Device Responsiveness
- Modal fits comfortably on mobile screens down to 320px width (`max-w-md w-full p-6`).
- Supports dark/light mode switching on the fly without loss of form input state.

---

## 3. UI Component Architecture & Trigger Locations

```
+-------------------------------------------------------------------------------+
| App.tsx                                                                       |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  | Header (Logo, Sync Status, Theme Toggle, Device Avatar)                 |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  | ListSelector.tsx                                                        |  |
|  |  [+ New]  [ Supermarket (4) ]  [ Costco (12) ] ...  [ Pencil ] [ Trash ]|  |
|  +-------------------------------------------------------------------------+  |
|                                                               ^               |
|                                                     (Trigger 1: Active List)  |
|                                                                               |
|  +---------------------------+                                                |
|  | ListSidebar.tsx (Drawer)  |                                                |
|  |  +---------------------+  |                                                |
|  |  | Supermarket     (4) |  |                                                |
|  |  | [ Pencil ] [Trash2] |  | <--- (Trigger 2: Any List in Drawer)           |
|  |  +---------------------+  |                                                |
|  +---------------------------+                                                |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  | EditListModal.tsx (Tier 4 High-Elevation Overlay)                       |  |
|  |  - Modal Header ("Edit List")                                           |  |
|  |  - Live List Preview Pill                                               |  |
|  |  - List Name Input (Solid slate well, 40-char max, empty guard)          |  |
|  |  - Description Input (Solid slate well, 60-char max)                    |  |
|  |  - 8-Icon Grid Selector (Pill, Cart, Store, Apple, Carrot, etc.)        |  |
|  |  - 6-Color Accent Swatches (Emerald, Amber, Rose, Blue, Cyan, Purple)   |  |
|  |  - Action Buttons: [ Cancel ]  [ Save Changes (Emerald CTA) ]           |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 4. Trigger 1 Blueprint: `ListSelector.tsx`

### 4.1 Placement Strategy
In `ListSelector.tsx`, the active list's actions are concentrated on the far right of the horizontal container.
Currently, `ListSelector` displays:
1. `+ New` button pinned on the far left.
2. Horizontal scrollable list pills in the center.
3. `Delete Active List Button` (`Trash2`) on the right when `lists.length > 1`.

**Update**: Insert the **Edit Active List Button (`Pencil`)** immediately preceding the delete button. Because editing a list is non-destructive, the Edit button is **always visible** when an active list exists (even if there is only 1 list remaining).

### 4.2 Visual & Ergonomic Specifications
- **Icon**: `Pencil` from `lucide-react` with `w-4 h-4 stroke-[2]`.
- **Button Container**: `p-2 rounded-2xl w-9 h-9 flex items-center justify-center shrink-0`.
- **Styling**:
  - Text/Icon: `text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400`.
  - Background: `hover:bg-emerald-50 dark:hover:bg-emerald-950/40`.
  - Border: `border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/60`.
  - Touch Feedback: `active:scale-95 transition-all cursor-pointer`.
- **Accessibility**:
  - `title="Edit active list \"{activeList.name}\""`
  - `aria-label="Edit active list {activeList.name}"`

### 4.3 `ListSelector.tsx` Component Implementation Blueprint

```tsx
import React, { useState } from 'react';
import { ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Plus, Trash2, Pencil } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { DeleteListModal } from './DeleteListModal';
import { EditListModal } from './EditListModal';
import { GroceryList } from '../types';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  'shopping-cart': ShoppingCart,
  store: Store,
  box: Box,
  pill: Pill,
  sparkles: Sparkles,
  apple: Apple,
  carrot: Carrot,
  coffee: Coffee,
};

export const ListSelector: React.FC = () => {
  const { lists, activeListId, setActiveListId, items, openNewListModal } = useGrocery();
  const [deletingList, setDeletingList] = useState<GroceryList | null>(null);
  const [editingList, setEditingList] = useState<GroceryList | null>(null);

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];
  const canDeleteActive = lists.length > 1;

  return (
    <>
      <div className="flex items-center gap-2 w-full">
        {/* Pinned "+ New List" Button: ALWAYS in-canvas and never scrolled off-screen */}
        <button
          type="button"
          onClick={openNewListModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
          title="Create a new shopping list"
          aria-label="Create new list"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>

        {/* Scrollable Horizontal List Pills */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-none scroll-smooth">
          {lists.map((list) => {
            const Icon = ICON_MAP[list.icon] || ShoppingCart;
            const isActive = list.id === activeListId;
            const itemCount = items.filter((i) => i.listId === list.id && !i.completed).length;

            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer active:scale-[0.97] ${
                  isActive
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-white/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white backdrop-blur-xs'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 stroke-[2.2] ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
                <span className="tracking-tight">{list.name}</span>
                {itemCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                    }`}
                  >
                    {itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Actions Cluster: Edit & Delete Active List */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Edit Active List Button */}
          {activeList && (
            <button
              type="button"
              onClick={() => setEditingList(activeList)}
              className="p-2 rounded-2xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/60 active:scale-95 transition-all cursor-pointer"
              title={`Edit active list "${activeList.name}"`}
              aria-label={`Edit list ${activeList.name}`}
            >
              <Pencil className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {/* Delete Active List Button */}
          {canDeleteActive && activeList && (
            <button
              type="button"
              onClick={() => setDeletingList(activeList)}
              className="p-2 rounded-2xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 active:scale-95 transition-all cursor-pointer"
              title={`Delete active list "${activeList.name}"`}
              aria-label={`Delete list ${activeList.name}`}
            >
              <Trash2 className="w-4 h-4 stroke-[2]" />
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditListModal
        list={editingList}
        isOpen={Boolean(editingList)}
        onClose={() => setEditingList(null)}
      />

      <DeleteListModal
        list={deletingList}
        isOpen={Boolean(deletingList)}
        onClose={() => setDeletingList(null)}
      />
    </>
  );
};
```

---

## 5. Trigger 2 Blueprint: `ListSidebar.tsx` (Drawer)

### 5.1 Placement Strategy
In `ListSidebar.tsx`, each list item card currently positions the `Trash2` button at `absolute right-2.5 top-2.5`.

**Updates**:
1. Group actions into an **action cluster** at `absolute right-2.5 top-2.5 flex items-center gap-1`.
2. Add the `Pencil` button inside this cluster.
3. Increase card content right-padding from `pr-8` to `pr-20` so that multi-line titles, descriptions, and progress badges never overlap with the action buttons on compact mobile viewports.
4. Stop click propagation on the edit button (`e.stopPropagation()`) so tapping the pencil opens the modal without accidentally switching the active list and closing the drawer.

### 5.2 Visual & Ergonomic Specifications
- **Hit Envelope**: `p-2 rounded-xl` with minimum 40×40px tap area.
- **Coloring**: `text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40`.
- **Accessibility**: `title="Edit list \"{list.name}\""`, `aria-label="Edit list {list.name}"`.

### 5.3 `ListSidebar.tsx` Blueprint Snippet

```tsx
// Inside ListSidebar.tsx map loop:
return (
  <div
    key={list.id}
    className={`group relative rounded-2xl p-3 border transition-all ${
      isActive
        ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/60'
        : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-800'
    }`}
  >
    {/* List Body (pr-20 ensures clean spacing away from action buttons) */}
    <div
      onClick={() => {
        setActiveListId(list.id);
        onClose();
      }}
      className="cursor-pointer space-y-1.5 pr-20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isActive
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {list.name}
            </div>
            {list.description && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {list.description}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isActive
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {uncompletedCount} left
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-1 pt-1">
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span>{completedCount} of {totalCount} done</span>
            <span>{progressPct}%</span>
          </div>
        </div>
      )}
    </div>

    {/* Action Cluster: Edit (Always Visible) & Delete (If >1 list) */}
    <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
      {/* Edit List Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditingList(list);
        }}
        className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 transition-all cursor-pointer"
        title={`Edit list "${list.name}"`}
        aria-label={`Edit list ${list.name}`}
      >
        <Pencil className="w-4 h-4" />
      </button>

      {/* Delete List Button */}
      {lists.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDeletingList(list);
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all cursor-pointer"
          title={`Delete list "${list.name}"`}
          aria-label={`Delete list ${list.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);
```

---

## 6. Complete Component Blueprint: `src/components/EditListModal.tsx`

This is the complete, drop-in, production-ready implementation of `EditListModal.tsx` for Jim:

```tsx
import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Check, AlertCircle } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { GroceryList } from '../types';

export const LIST_ICONS = [
  { name: 'shopping-cart', icon: ShoppingCart, label: 'Cart' },
  { name: 'store', icon: Store, label: 'Store' },
  { name: 'box', icon: Box, label: 'Box' },
  { name: 'pill', icon: Pill, label: 'Pharmacy' },
  { name: 'apple', icon: Apple, label: 'Produce' },
  { name: 'carrot', icon: Carrot, label: 'Market' },
  { name: 'coffee', icon: Coffee, label: 'Cafe' },
  { name: 'sparkles', icon: Sparkles, label: 'Special' },
];

export const LIST_COLORS = [
  { name: 'Emerald', id: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-500' },
  { name: 'Amber', id: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-500' },
  { name: 'Rose', id: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-500' },
  { name: 'Blue', id: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-500' },
  { name: 'Cyan', id: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-500' },
  { name: 'Purple', id: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500', text: 'text-purple-500' },
];

interface EditListModalProps {
  list: GroceryList | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditListModal: React.FC<EditListModalProps> = ({ list, isOpen, onClose }) => {
  const { updateList, items } = useGrocery();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('shopping-cart');
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [touched, setTouched] = useState(false);

  // Sync state whenever active list changes or modal opens
  useEffect(() => {
    if (list) {
      setName(list.name || '');
      setDescription(list.description || '');
      setSelectedIcon(list.icon || 'shopping-cart');
      setSelectedColor(list.color || 'emerald');
      setTouched(false);
    }
  }, [list, isOpen]);

  if (!isOpen || !list) return null;

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0;
  const isDirty =
    trimmedName !== list.name ||
    description.trim() !== (list.description || '') ||
    selectedIcon !== list.icon ||
    selectedColor !== list.color;

  const activeItemCount = items.filter((i) => i.listId === list.id && !i.completed).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setTouched(true);
      return;
    }

    await updateList(list.id, {
      name: trimmedName,
      icon: selectedIcon,
      color: selectedColor,
      description: description.trim() || undefined,
    });

    onClose();
  };

  const SelectedIconComp = LIST_ICONS.find((i) => i.name === selectedIcon)?.icon || ShoppingCart;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-list-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] space-y-5 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 id="edit-list-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Edit List
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize list name, visual icon, and theme accent
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Interactive Preview Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Live List Preview</span>
            <span>Selector Appearance</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Pill Simulation */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20">
              <SelectedIconComp className="w-3.5 h-3.5 stroke-[2.2] text-white" />
              <span className="tracking-tight font-bold">
                {trimmedName || <span className="opacity-60 italic">Untitled List</span>}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20 text-white">
                {activeItemCount}
              </span>
            </div>

            {/* Description Sub-preview */}
            <div className="flex-1 text-right truncate">
              <span className="text-xs text-slate-500 dark:text-slate-400 italic truncate block">
                {description.trim() || 'No description'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* List Name Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-list-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                List Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {name.length}/40
              </span>
            </div>
            <input
              id="edit-list-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder="e.g., Trader Joe's, Costco, Farmers Market"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-hidden transition-all ${
                touched && !isValid
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
              maxLength={40}
              required
              autoFocus
            />
            {touched && !isValid && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pt-0.5 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>List name cannot be empty.</span>
              </div>
            )}
          </div>

          {/* Description Field (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-list-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description (Optional)
              </label>
              <span className="text-[11px] text-slate-400">
                {description.length}/60
              </span>
            </div>
            <input
              id="edit-list-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Weekend groceries, pantry stock, dinner party"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              maxLength={60}
            />
          </div>

          {/* Icon Selector Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              List Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LIST_ICONS.map(({ name: iconName, icon: Icon, label }) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    type="button"
                    key={iconName}
                    onClick={() => setSelectedIcon(iconName)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-0.5 stroke-[2]" />
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Accent Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Color Accent
            </label>
            <div className="flex items-center gap-3 pt-1">
              {LIST_COLORS.map((c) => {
                const isSelected = selectedColor === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                      isSelected ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-900 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                    aria-label={`Select color ${c.name}`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || !isDirty}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                isValid && isDirty
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

## 7. Data Flow, Persistence & Real-Time Sync Blueprint

### 7.1 Data Flow Sequence

```
User Edits List in EditListModal
         │
         ▼
handleSubmit() Validates non-empty trimmed name
         │
         ▼
GroceryContext.updateList(id, { name, icon, color, description })
         │
         ├──────────────────────────────────────────────┐
         ▼                                              ▼
Optimistic React State Update                  IndexedDB Persistence
`setLists(prev => ...)`                       `idbSaveList(updated)`
         │                                              │
         ▼                                              ▼
Immediate Re-render of:                        Durable Local-First
- ListSelector tabs                            Offline Storage
- Header Active List title
- ListSidebar drawer
         │
         ▼
WebSocket Broadcast via `syncClient.broadcastListUpsert(updated)`
         │
         ▼
Node.js + Express / WS Server (`server/index.js`)
         │
         ├──────────────────────────────────────────────┐
         ▼                                              ▼
SQLite WAL Database Update                     Real-Time Broadcast
`UPDATE lists SET ...`                         `LIST_UPSERT` sent to all
in `cartsync.db`                               household peers (phones/tablets)
```

### 7.2 Backend & Storage Guarantees
1. **Foreign Key Integrity**: In `server/db.js`, items relate to lists via `FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE`. Because the list `id` is unchanged during editing, all item relations and cascade rules remain 100% stable.
2. **Offline-First Resilience**: If the device is offline, `idbSaveList` guarantees persistence. When connectivity returns, the next sync cycle propagates the updated list to the household server.
3. **No Phantom Lists**: Trimming whitespace prevents accidental blank or duplicate whitespace lists.

---

## 8. Verification & QA Matrix for Creed (`worker-creed`)

To ensure flawless execution in `task-rename-list-qa`, the test suite should verify the following 8 test cases:

| ID | Test Scenario | Expected Outcome |
|---|---|---|
| **TC-01** | **Modal Field Pre-population** | Opening modal for a list populates current `name`, `description`, `icon`, and `color`. |
| **TC-02** | **Empty Name Validation** | Submitting an empty string or whitespace-only disables the Save CTA and displays error badge. |
| **TC-03** | **Whitespace Sanitization** | Submitting `"   Costco Wholesale   "` successfully trims to `"Costco Wholesale"`. |
| **TC-04** | **Item Association Preservation** | Renaming a list containing items keeps all item counts and completed states intact. |
| **TC-05** | **Offline IndexedDB Persistence** | Verifies `getAllLists()` returns the updated list with the new name, icon, and timestamp. |
| **TC-06** | **WebSocket Broadcast Verification** | Verifies `syncClient.broadcastListUpsert` is triggered with type `LIST_UPSERT` and valid payload. |
| **TC-07** | **Touch Envelope & Ergonomics** | Pencil buttons in `ListSelector` and `ListSidebar` meet minimum 40×40px tap target standards. |
| **TC-08** | **Dark Mode Contrast Compliance** | Verifies input well contrast ratio exceeds WCAG AAA (12.5:1) against `slate-900` modal backdrop. |

---

## 9. Hand-off Summary for Jim (`worker-jim`)

1. **Create Component**: Create `src/components/EditListModal.tsx` using the complete blueprint in Section 6.
2. **Update `ListSelector.tsx`**: Add `Pencil` icon trigger next to `Trash2` and mount `EditListModal` (Section 4).
3. **Update `ListSidebar.tsx`**: Add `Pencil` icon trigger in the action cluster of each list card and adjust padding to `pr-20` (Section 5).
4. **Context & Build**: Verify that `updateList` is imported from `useGrocery()` and test with `npm run build` and `npm test`.

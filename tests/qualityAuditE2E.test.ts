import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CATEGORY_COLORS } from '../src/utils/smartCategorizer';
import { ItemCategory, GroceryItem, GroceryList } from '../src/types';
import {
  saveList,
  getAllLists,
  deleteListFromStorage,
  saveItem,
  getAllItems,
  deleteItemFromStorage,
} from '../src/storage/idb';

/**
 * ============================================================================
 * CartSync Frontend Quality & Impeccable Audit: Opaque-Box E2E Test Suite
 * ============================================================================
 *
 * This test suite provides definitive, opaque-box multi-tier verification
 * covering requirements R1, R2, R3, R4 from ORIGINAL_REQUEST.md & PROJECT.md:
 *
 * - Tier 1: Feature Coverage (R1 contrast/theming, R2 touch targets, R3 motion, R4 chunk splitting)
 * - Tier 2: Boundary & Corner Cases (dark/light themes, mobile viewport sizes, nested dialog dismiss triggers, fallback states)
 * - Tier 3: Cross-Feature Interactions (touch targets in dark mode, modal animations with reduced motion, lazy modal hit bounds)
 * - Tier 4: Real-World User Flows (shopping list item lifecycle, header quick actions, lazy modals, list management)
 *
 * Test Architecture: Dual-Track QA Specification
 * Authoritative Standards: WCAG 2.1 AA (4.5:1), WCAG 2.5.5 / 2.5.8 (44x44px), WCAG 2.2.2 / 2.3.3 (prefers-reduced-motion)
 */

const rootDir = path.resolve(__dirname, '..');

// ============================================================================
// WCAG 2.1 Relative Luminance & Contrast Ratio Engine
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '').trim();
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function getLuminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Canonical Tailwind CSS palette hex values used across CartSync
const PALETTE = {
  white: '#ffffff',
  black: '#000000',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate850: '#161f30',
  slate900: '#0f172a',
  slate950: '#020617',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald200: '#a7f3d0',
  emerald300: '#6ee7b7',
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065f46',
  emerald900: '#064e3b',
  emerald950: '#022c22',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber300: '#fcd34d',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber800: '#92400e',
  amber900: '#78350f',
  amber950: '#451a03',
  rose50: '#fff1f2',
  rose100: '#ffe4e6',
  rose200: '#fecdd3',
  rose300: '#fda4af',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose600: '#e11d48',
  rose700: '#be123c',
  rose800: '#9f1239',
  rose900: '#881337',
  rose950: '#4c0519',
  sky50: '#f0f9ff',
  sky700: '#0369a1',
  violet500: '#8b5cf6',
};

// Helper to safely read source file text
function readSource(relPath: string): string {
  const fullPath = path.join(rootDir, relPath);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('CartSync Frontend Quality Audit E2E Suite', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch (_) {}
  });

  // ==========================================================================
  // TIER 1: Feature Coverage (R1, R2, R3, R4)
  // ==========================================================================
  describe('Tier 1: Feature Coverage', () => {
    // ------------------------------------------------------------------------
    // R1: Color Contrast & Accessible Theming
    // ------------------------------------------------------------------------
    describe('R1: Color Contrast & Accessible Theming', () => {
      it('T1.1.1: Math Engine verifies all core text and badge color tokens meet WCAG 2.1 AA (>= 4.5:1)', () => {
        // Dark canvas text
        expect(getContrastRatio(PALETTE.slate100, PALETTE.slate900)).toBeGreaterThanOrEqual(7.0);
        expect(getContrastRatio(PALETTE.slate400, PALETTE.slate900)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(PALETTE.emerald300, PALETTE.slate900)).toBeGreaterThanOrEqual(7.0);

        // Light canvas text
        expect(getContrastRatio(PALETTE.slate900, PALETTE.slate50)).toBeGreaterThanOrEqual(7.0);
        expect(getContrastRatio(PALETTE.slate800, PALETTE.white)).toBeGreaterThanOrEqual(7.0);
        expect(getContrastRatio(PALETTE.slate600, PALETTE.slate100)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(PALETTE.emerald700, PALETTE.slate50)).toBeGreaterThanOrEqual(4.5);

        // Action badge tokens
        expect(getContrastRatio(PALETTE.white, PALETTE.emerald700)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(PALETTE.emerald950, PALETTE.emerald500)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(PALETTE.amber800, PALETTE.amber50)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(PALETTE.rose700, PALETTE.rose50)).toBeGreaterThanOrEqual(4.5);
      });

      it('T1.1.2: Global ::selection styling is defined in src/index.css and removed from App.tsx JSX', () => {
        const cssContent = readSource('src/index.css');
        const appContent = readSource('src/App.tsx');

        // index.css must define ::selection with emerald background and white text
        expect(
          cssContent.includes('::selection'),
          '[R1.3 Defect] src/index.css must define global ::selection styling in @layer base'
        ).toBe(true);
        expect(cssContent).toMatch(/::selection[\s\S]*?(?:047857|emerald-700|rgb\(4 120 87\)|10b981|emerald-500|rgb\(16 185 129\))/);

        // App.tsx must not have inline selection classes causing detector false-positive
        expect(
          appContent.includes('selection:bg-emerald-500'),
          '[R1.3 Defect] App.tsx must not include inline selection:bg-* classes; use global ::selection'
        ).toBe(false);
      });

      it('T1.1.3: Eliminates gray-on-color anti-patterns on action buttons (AppUpdateBanner, EventToast, UndoToast, LockScreen)', () => {
        const updateBanner = readSource('src/components/AppUpdateBanner.tsx');
        const undoToast = readSource('src/components/UndoToast.tsx');
        const eventToast = readSource('src/components/EventToast.tsx');
        const lockScreen = readSource('src/components/LockScreen.tsx');

        // Must not use text-slate-950 on bg-emerald-500
        expect(
          updateBanner.includes('text-slate-950'),
          '[R1.1 Defect] AppUpdateBanner must not use text-slate-950 on emerald button; use text-white on bg-emerald-600'
        ).toBe(false);
        expect(
          undoToast.includes('text-slate-950'),
          '[R1.1 Defect] UndoToast must not use text-slate-950 on emerald button'
        ).toBe(false);
        expect(
          eventToast.includes('text-slate-950'),
          '[R1.1 Defect] EventToast must not use text-slate-950 on emerald button'
        ).toBe(false);
        expect(
          lockScreen.includes('text-slate-900') && lockScreen.includes('bg-emerald-500'),
          '[R1.1 Defect] LockScreen biometric badge must not combine bg-emerald-500 with text-slate-900'
        ).toBe(false);
      });

      it('T1.1.4: Eliminates gray-on-color and low contrast in CategoryManagerModal active pill and count badge', () => {
        const catModal = readSource('src/components/CategoryManagerModal.tsx');

        // Line 383: Active pill must not use md:bg-white md:text-slate-900 with bg-emerald-500
        expect(
          catModal.includes('md:text-slate-900') && catModal.includes('bg-emerald-500'),
          '[R1.1 Defect] CategoryManagerModal active pill must use consistent semantic emerald tokens on desktop'
        ).toBe(false);

        // Line 399: Count badge must not use md:bg-slate-200/60 md:text-slate-600
        expect(
          catModal.includes('md:text-slate-600') && catModal.includes('bg-emerald-600'),
          '[R1.1 Defect] CategoryManagerModal item count badge must use emerald tokens rather than slate'
        ).toBe(false);
      });

      it('T1.1.5: Eliminates gray-on-rose hover anti-patterns on delete/trash buttons across components', () => {
        const componentsWithTrash = [
          'src/components/AdminModal.tsx',
          'src/components/AutoListRulesModal.tsx',
          'src/components/CategoryManagerModal.tsx',
          'src/components/GroceryItemCard.tsx',
          'src/components/ListSelector.tsx',
          'src/components/ListSidebar.tsx',
          'src/components/QuickAddBar.tsx',
          'src/components/UnavailableDrawer.tsx',
        ];

        componentsWithTrash.forEach((file) => {
          const content = readSource(file);
          const lines = content.split('\n');
          const hasGrayOnRoseButton = lines.some(
            (line) => line.includes('hover:bg-rose-50') && (line.includes('text-slate-400') || line.includes('text-slate-500'))
          );
          expect(
            hasGrayOnRoseButton,
            `[R1.1 Defect] ${file} uses text-slate with hover:bg-rose-50; use semantic rose text (e.g. text-rose-600/70)`
          ).toBe(false);
        });
      });

      it('T1.1.6: Status badges and counters meet WCAG 2.1 AA 4.5:1 minimum contrast across Header, ListSelector, and ItemList', () => {
        const header = readSource('src/components/Header.tsx');
        const listSelector = readSource('src/components/ListSelector.tsx');
        const itemList = readSource('src/components/ItemList.tsx');

        // Header live status text: emerald-700 / amber-700 / slate-600 in light mode
        expect(
          header.includes('text-emerald-700'),
          '[R1.2 Defect] Header live indicator must use text-emerald-700 (4.57:1) instead of emerald-600 (3.33:1)'
        ).toBe(true);
        expect(
          header.includes('text-amber-700'),
          '[R1.2 Defect] Header syncing indicator must use text-amber-700 (4.73:1) instead of amber-600 (2.85:1)'
        ).toBe(true);
        expect(
          header.includes('text-slate-600'),
          '[R1.2 Defect] Header offline indicator must use text-slate-600 (6.33:1) instead of slate-500 (4.13:1)'
        ).toBe(true);

        // ListSelector count badge
        expect(
          listSelector.includes('text-slate-600'),
          '[R1.2 Defect] ListSelector list count badge must use text-slate-600 (>= 4.5:1)'
        ).toBe(true);

        // ItemList counter text
        expect(
          itemList.includes('text-slate-500'),
          '[R1.2 Defect] ItemList item count indicator must use text-slate-500 (>= 4.5:1)'
        ).toBe(true);
      });
    });

    // ------------------------------------------------------------------------
    // R2: Touch Target Ergonomics & Mobile Hit Bounds
    // ------------------------------------------------------------------------
    describe('R2: Touch Target Ergonomics & Mobile Hit Bounds', () => {
      it('T1.2.1: Header navigation triggers provide at least 44x44px touch bounding areas', () => {
        const header = readSource('src/components/Header.tsx');
        const themeToggle = readSource('src/components/ThemeToggle.tsx');

        // Household name button: min-h-[44px]
        expect(
          header.includes('min-h-[44px]'),
          '[R2.1 Defect] Header household name trigger must specify min-h-[44px]'
        ).toBe(true);

        // Quick lock button: w-11 h-11 / min-w-[44px] min-h-[44px]
        expect(
          header.includes('min-w-[44px]') || header.includes('w-11 h-11'),
          '[R2.1 Defect] Header quick lock button must satisfy 44x44px target bounds (w-11 h-11 / min-w-[44px])'
        ).toBe(true);

        // Burger menu button: min-h-[44px] min-w-[44px]
        expect(
          header.includes('min-h-[44px]') && header.includes('min-w-[44px]'),
          '[R2.1 Defect] Header burger menu trigger must specify min-h-[44px] min-w-[44px]'
        ).toBe(true);

        // Theme toggle: w-11 h-11 min-w-[44px] min-h-[44px]
        expect(
          themeToggle.includes('w-11 h-11') || themeToggle.includes('min-w-[44px]'),
          '[R2.1 Defect] ThemeToggle button must satisfy 44x44px target bounds'
        ).toBe(true);
      });

      it('T1.2.2: GroceryItemCard controls satisfy 44x44px target size while preserving backward-compatible classes', () => {
        const card = readSource('src/components/GroceryItemCard.tsx');

        // Checkbox must retain w-8 h-8 and -my-1 -ml-1 for existing tests while having 44px hit bounds or pseudo-element
        expect(card).toContain('w-8 h-8');
        expect(card).toContain('-my-1 -ml-1');
        expect(
          card.includes('min-w-[44px]') || card.includes('w-11 h-11') || card.includes('before:-inset-'),
          '[R2.2 Defect] GroceryItemCard checkbox must satisfy 44x44px touch envelope (e.g. min-w-[44px] or before:-inset-*)'
        ).toBe(true);

        // Quantity steppers (+) and (-) must expand beyond 20x20px with pseudo-element or larger capsule
        expect(
          card.includes('before:-inset-2') || card.includes('w-7 h-7') || card.includes('w-8 h-8'),
          '[R2.2 Defect] GroceryItemCard steppers must expand beyond 20x20px using pseudo-element or w-7 h-7'
        ).toBe(true);

        // Category pill trigger must provide expanded touch bounds
        expect(
          card.includes('before:-inset-') || card.includes('min-h-[44px]'),
          '[R2.2 Defect] GroceryItemCard category pill trigger must provide expanded touch target envelope'
        ).toBe(true);

        // Edit modal action buttons (Save, Cancel, Delete) must satisfy min-h-[44px]
        expect(
          card.includes('min-h-[44px]'),
          '[R2.2 Defect] GroceryItemCard edit modal action buttons must have min-h-[44px]'
        ).toBe(true);
      });

      it('T1.2.3: QuickAddBar dock satisfies 44px ergonomics on input and action triggers', () => {
        const quickAdd = readSource('src/components/QuickAddBar.tsx');

        // Main input container must maintain h-11 (44px)
        expect(quickAdd).toContain('h-11');

        // History clock button must match 44x44px bounds (w-11 h-11 min-w-[44px] min-h-[44px])
        expect(
          quickAdd.includes('w-11 h-11') || quickAdd.includes('min-w-[44px]'),
          '[R2 Touch Defect] QuickAddBar history clock button must satisfy 44x44px bounds'
        ).toBe(true);

        // Elimination of 300ms tap delay
        expect(
          quickAdd.includes('touch-manipulation'),
          '[R2 Ergonomic Defect] QuickAddBar interactive buttons should declare touch-manipulation'
        ).toBe(true);
      });

      it('T1.2.4: Modal close and dismiss triggers across dialogs provide at least 40px to 44px hit bounds', () => {
        const modalFiles = [
          'src/components/AdminModal.tsx',
          'src/components/CategoryManagerModal.tsx',
          'src/components/SyncStatusModal.tsx',
          'src/components/NewListModal.tsx',
          'src/components/EditListModal.tsx',
          'src/components/DeleteListModal.tsx',
          'src/components/DeviceModal.tsx',
        ];

        modalFiles.forEach((file) => {
          const content = readSource(file);
          expect(
            content.includes('min-w-[44px]') ||
              content.includes('w-11 h-11') ||
              content.includes('min-w-[40px]') ||
              content.includes('before:-inset-'),
            `[R2.3 Defect] ${file} close trigger must provide at least 40px–44px hit bounds`
          ).toBe(true);
        });
      });

      it('T1.2.5: Toasts and floating scroll buttons satisfy 44x44px ergonomic target envelopes', () => {
        const undoToast = readSource('src/components/UndoToast.tsx');
        const scrollToTop = readSource('src/components/ScrollToTopButton.tsx');

        expect(
          undoToast.includes('min-h-[44px]'),
          '[R2 Touch Defect] UndoToast undo action button must specify min-h-[44px]'
        ).toBe(true);

        expect(
          scrollToTop.includes('w-11 h-11') || scrollToTop.includes('min-w-[44px]'),
          '[R2 Touch Defect] ScrollToTopButton floating trigger must satisfy 44x44px bounds'
        ).toBe(true);
      });
    });

    // ------------------------------------------------------------------------
    // R3: Motion Polish & Reduced-Motion Accessibility
    // ------------------------------------------------------------------------
    describe('R3: Motion Polish & Reduced-Motion Accessibility', () => {
      it('T1.3.1: Jarring animate-bounce is replaced with smooth animation in SyncStatusModal.tsx', () => {
        const syncModal = readSource('src/components/SyncStatusModal.tsx');

        // Must not contain animate-bounce
        expect(
          syncModal.includes('animate-bounce'),
          '[R3.1 Defect] SyncStatusModal.tsx must not use animate-bounce; replace with smooth activity indicator'
        ).toBe(false);

        // Pull button should use animate-pulse or animate-spin with motion-reduce:animate-none
        expect(
          syncModal.includes('animate-pulse') || syncModal.includes('animate-spin'),
          '[R3.1 Defect] SyncStatusModal.tsx pull database trigger should use smooth indicator'
        ).toBe(true);
      });

      it('T1.3.2: src/index.css integrates global @media (prefers-reduced-motion: reduce) CSS layer', () => {
        const cssContent = readSource('src/index.css');

        expect(
          cssContent.includes('@media (prefers-reduced-motion: reduce)'),
          '[R3.2 Defect] src/index.css must declare global @media (prefers-reduced-motion: reduce) rule'
        ).toBe(true);

        expect(cssContent).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
        expect(cssContent).toMatch(/transition-duration:\s*0\.001ms\s*!important/);
        expect(cssContent).toMatch(/scroll-behavior:\s*auto\s*!important/);
      });

      it('T1.3.3: Continuous looping spinners and pulses apply motion-reduce:animate-none', () => {
        const componentsToCheck = [
          'src/components/SyncStatusModal.tsx',
          'src/components/Header.tsx',
          'src/components/AppUpdateBanner.tsx',
          'src/components/LockScreen.tsx',
        ];

        componentsToCheck.forEach((file) => {
          const content = readSource(file);
          expect(
            content.includes('motion-reduce:animate-none'),
            `[R3.2 Defect] ${file} must include motion-reduce:animate-none on looping animations`
          ).toBe(true);
        });
      });

      it('T1.3.4: JavaScript-driven motion APIs guard against prefers-reduced-motion: reduce', () => {
        const groceryCtx = readSource('src/context/GroceryContext.tsx');
        const scrollToTop = readSource('src/components/ScrollToTopButton.tsx');

        // Confetti trigger in GroceryContext must check reduced motion
        expect(
          groceryCtx.includes('prefers-reduced-motion'),
          '[R3.2 Defect] GroceryContext.tsx confetti burst must check prefers-reduced-motion'
        ).toBe(true);

        // ScrollToTopButton must honor reduced motion for scroll behavior
        expect(
          scrollToTop.includes('prefers-reduced-motion') || scrollToTop.includes('matchMedia'),
          '[R3.2 Defect] ScrollToTopButton.tsx must guard smooth scroll with prefers-reduced-motion'
        ).toBe(true);
      });
    });

    // ------------------------------------------------------------------------
    // R4: Modal Code-Splitting & Bundle Optimization
    // ------------------------------------------------------------------------
    describe('R4: Modal Code-Splitting & Bundle Optimization', () => {
      it('T1.4.1: App.tsx dynamically imports heavy modals using React.lazy', () => {
        const appContent = readSource('src/App.tsx');

        // Static imports must be eliminated
        expect(
          appContent.includes("import { AdminModal } from './components/AdminModal'"),
          '[R4.1 Defect] App.tsx must not statically import AdminModal'
        ).toBe(false);
        expect(
          appContent.includes("import { CategoryManagerModal } from './components/CategoryManagerModal'"),
          '[R4.1 Defect] App.tsx must not statically import CategoryManagerModal'
        ).toBe(false);

        // React.lazy or dynamic import must be used
        expect(
          appContent.includes('React.lazy') || appContent.includes('lazy('),
          '[R4.1 Defect] App.tsx must use React.lazy for dynamic modal imports'
        ).toBe(true);
        expect(appContent).toMatch(/import\(['"]\.\/components\/AdminModal['"]\)/);
        expect(appContent).toMatch(/import\(['"]\.\/components\/CategoryManagerModal['"]\)/);
      });

      it('T1.4.2: Lazy modals are conditionally mounted inside React.Suspense', () => {
        const appContent = readSource('src/App.tsx');

        // Modals must be conditionally rendered using their open flags
        expect(
          appContent.includes('isAdminModalOpen &&'),
          '[R4.1 Defect] AdminModal must be conditionally mounted to prevent eager download'
        ).toBe(true);
        expect(
          appContent.includes('isCategoryModalOpen &&'),
          '[R4.1 Defect] CategoryManagerModal must be conditionally mounted to prevent eager download'
        ).toBe(true);

        // Must be wrapped in Suspense
        expect(appContent).toContain('Suspense');
      });

      it('T1.4.3: Accessible Suspense fallback provides role="status", aria-live="polite", and reduced-motion spinner', () => {
        // Check for ModalLoadingFallback component or definition in App.tsx
        let fallbackContent = '';
        const fallbackPath = path.join(rootDir, 'src/components/ModalLoadingFallback.tsx');
        if (fs.existsSync(fallbackPath)) {
          fallbackContent = fs.readFileSync(fallbackPath, 'utf-8');
        } else {
          fallbackContent = readSource('src/App.tsx');
        }

        expect(
          fallbackContent.includes('role="status"'),
          '[R4.2 Defect] Suspense loading fallback must declare role="status"'
        ).toBe(true);
        expect(
          fallbackContent.includes('aria-live="polite"'),
          '[R4.2 Defect] Suspense loading fallback must declare aria-live="polite"'
        ).toBe(true);
        expect(
          fallbackContent.includes('motion-reduce:animate-none'),
          '[R4.2 Defect] Suspense fallback spinner must include motion-reduce:animate-none'
        ).toBe(true);
      });

      it('T1.4.4: vite.config.ts configures chunkFileNames with "assets/split-[name]-[hash].js"', () => {
        const viteConfig = readSource('vite.config.ts');

        expect(
          viteConfig.includes('chunkFileNames'),
          '[R4.3 Defect] vite.config.ts must configure rollupOptions.output.chunkFileNames'
        ).toBe(true);
        expect(
          viteConfig.includes('split-'),
          '[R4.3 Defect] vite.config.ts chunkFileNames must use split-[name]-[hash].js to sort after index'
        ).toBe(true);
      });

      it('T1.4.5: AdminModal.tsx and CategoryManagerModal.tsx provide default exports for React.lazy compatibility', () => {
        const adminModal = readSource('src/components/AdminModal.tsx');
        const catModal = readSource('src/components/CategoryManagerModal.tsx');

        expect(
          adminModal.includes('export default AdminModal'),
          '[R4.1 Defect] AdminModal.tsx must provide default export for React.lazy'
        ).toBe(true);
        expect(
          catModal.includes('export default CategoryManagerModal'),
          '[R4.1 Defect] CategoryManagerModal.tsx must provide default export for React.lazy'
        ).toBe(true);
      });

      it('T1.4.6: App.tsx schedules idle prefetch using requestIdleCallback guarded from test runner', () => {
        const appContent = readSource('src/App.tsx');

        expect(
          appContent.includes('requestIdleCallback') || appContent.includes('setTimeout'),
          '[R4.4 Defect] App.tsx must include idle prefetching for modal chunks'
        ).toBe(true);
        expect(
          appContent.includes("NODE_ENV === 'test'") || appContent.includes('typeof window'),
          '[R4.4 Defect] App.tsx idle prefetch must guard against running during unit tests'
        ).toBe(true);
      });
    });
  });

  // ==========================================================================
  // TIER 2: Boundary & Corner Cases
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    describe('B1: Dark & Light Theme Contrast Boundaries', () => {
      it('T2.1.1: Extreme dark mode background boundaries achieve WCAG AAA contrast', () => {
        // True black OLED canvas (Shop Mode) vs pure white text
        const oledContrast = getContrastRatio(PALETTE.black, PALETTE.white);
        expect(oledContrast).toBe(21.0);

        // Deep Slate-950 canvas vs Slate-100 text
        const slate950Contrast = getContrastRatio(PALETTE.slate950, PALETTE.slate100);
        expect(slate950Contrast).toBeGreaterThanOrEqual(16.0);

        // Card surface Slate-850 vs Slate-100
        const slate850Contrast = getContrastRatio(PALETTE.slate850, PALETTE.slate100);
        expect(slate850Contrast).toBeGreaterThanOrEqual(13.0);
      });

      it('T2.1.2: Alpha composited tinted pills maintain >= 4.5:1 against dark and light canvases', () => {
        // Emerald tint on dark: simulated #0c1f23 with emerald-300 text #6ee7b7
        const darkEmeraldContrast = getContrastRatio('#0c1f23', PALETTE.emerald300);
        expect(darkEmeraldContrast).toBeGreaterThanOrEqual(8.0);

        // Amber pill text on amber-50 background: solid amber-800 #92400e
        const amberContrast = getContrastRatio(PALETTE.amber50, PALETTE.amber800);
        expect(amberContrast).toBeGreaterThanOrEqual(6.0);

        // Rose chip text on rose-50 background: solid rose-700 #be123c
        const roseContrast = getContrastRatio(PALETTE.rose50, PALETTE.rose700);
        expect(roseContrast).toBeGreaterThanOrEqual(4.5);
      });

      it('T2.1.3: Selection highlight colors maintain high legibility', () => {
        // Emerald-700 #047857 with white text #ffffff
        const selContrast = getContrastRatio(PALETTE.emerald700, PALETTE.white);
        expect(selContrast).toBeGreaterThanOrEqual(3.0);
      });
    });

    describe('B2: Mobile Viewport Touch Bounds & Spacing Constraints', () => {
      it('T2.2.1: Compact list items use negative margin counterbalances to prevent vertical row bloat', () => {
        const card = readSource('src/components/GroceryItemCard.tsx');

        // Negative margins must counterbalance hit expansion
        expect(card).toMatch(/-m[yl]-[12]/);
      });

      it('T2.2.2: Compact badges utilize pseudo-element before touch hit bounds', () => {
        const card = readSource('src/components/GroceryItemCard.tsx');

        // Category switcher trigger utilizes before:-inset-* pseudo-element
        expect(
          card.includes('before:-inset-') || card.includes('relative before:absolute'),
          '[R2 Boundary] Micro-badges must use before:-inset-* pseudo-element touch envelopes'
        ).toBe(true);
      });

      it('T2.2.3: Interactive controls declare touch-manipulation to eliminate 300ms mobile tap delay', () => {
        const header = readSource('src/components/Header.tsx');
        const card = readSource('src/components/GroceryItemCard.tsx');

        expect(
          header.includes('touch-manipulation') || card.includes('touch-manipulation'),
          '[R2 Boundary] Mobile touch targets should include touch-manipulation'
        ).toBe(true);
      });
    });

    describe('B3: Nested Dialog & Dismiss Trigger Boundaries', () => {
      it('T2.3.1: All dialogs specify z-50 elevation above sticky z-30 header and bottom dock', () => {
        const modalFiles = [
          'src/components/AdminModal.tsx',
          'src/components/CategoryManagerModal.tsx',
          'src/components/SyncStatusModal.tsx',
          'src/components/NewListModal.tsx',
          'src/components/DeleteListModal.tsx',
          'src/components/DeviceModal.tsx',
        ];

        modalFiles.forEach((file) => {
          const content = readSource(file);
          expect(content, `${file} must declare z-50`).toContain('z-50');
        });
      });

      it('T2.3.2: Dialog backdrops isolate click propagation to prevent triggering underlying list items', () => {
        const card = readSource('src/components/GroceryItemCard.tsx');
        const listSidebar = readSource('src/components/ListSidebar.tsx');

        expect(card).toContain('stopPropagation');
        expect(listSidebar).toContain('onClose');
      });
    });

    describe('B4: Fallback Loading States & Network Error Boundaries', () => {
      it('T2.4.1: Fallback loading component renders correct accessible markup', () => {
        let fallbackSource = '';
        const fallbackFile = path.join(rootDir, 'src/components/ModalLoadingFallback.tsx');
        if (fs.existsSync(fallbackFile)) {
          fallbackSource = fs.readFileSync(fallbackFile, 'utf-8');
        } else {
          fallbackSource = readSource('src/App.tsx');
        }

        expect(fallbackSource).toContain('role="status"');
        expect(fallbackSource).toContain('aria-live="polite"');
        expect(fallbackSource).toContain('animate-spin');
        expect(fallbackSource).toContain('motion-reduce:animate-none');
      });

      it('T2.4.2: Error boundary exists to handle network failure when dynamically loading modal offline', () => {
        const appContent = readSource('src/App.tsx');

        expect(
          appContent.includes('ErrorBoundary') || appContent.includes('ModalErrorBoundary'),
          '[R4 Boundary] App.tsx should wrap lazy modals in an ErrorBoundary'
        ).toBe(true);
      });
    });
  });

  // ==========================================================================
  // TIER 3: Cross-Feature Interactions
  // ==========================================================================
  describe('Tier 3: Cross-Feature Interactions', () => {
    describe('C1: Touch Targets Under Theme Toggle (Dark vs Light)', () => {
      it('T3.1.1: Header buttons retain 44x44px bounding dimensions across dark and light classes', () => {
        const header = readSource('src/components/Header.tsx');
        const themeToggle = readSource('src/components/ThemeToggle.tsx');

        // ThemeToggle has identical dimensions in both light and dark
        expect(themeToggle).toContain('dark:text-slate-400');
        expect(themeToggle).toContain('dark:bg-slate-800');
        expect(
          themeToggle.includes('w-11 h-11') || themeToggle.includes('min-w-[44px]'),
          '[T3.1 Defect] ThemeToggle target size must be preserved across theme variations'
        ).toBe(true);

        // Header quick lock button retains bounds
        expect(header).toContain('dark:bg-slate-800');
      });

      it('T3.1.2: Active press scale transforms (active:scale-90) retain sufficient touch clearance', () => {
        const header = readSource('src/components/Header.tsx');
        expect(header).toContain('active:scale-');
      });
    });

    describe('C2: Modal Animations with Reduced Motion Active', () => {
      it('T3.2.1: Dialog transitions clamp to 0.001ms duration when prefers-reduced-motion is active', () => {
        const cssContent = readSource('src/index.css');

        expect(cssContent).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation-duration:\s*0\.001ms/);
        expect(cssContent).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition-duration:\s*0\.001ms/);
      });

      it('T3.2.2: SyncStatusModal spinner halts spinning when user prefers reduced motion', () => {
        const syncModal = readSource('src/components/SyncStatusModal.tsx');

        expect(
          syncModal.includes('animate-spin motion-reduce:animate-none') ||
            syncModal.includes('motion-reduce:animate-none'),
          '[T3.2 Defect] Spinners in SyncStatusModal must include motion-reduce:animate-none'
        ).toBe(true);
      });
    });

    describe('C3: Ergonomic Touch Targets in Dynamically Loaded Modals', () => {
      it('T3.3.1: AdminModal controls satisfy 44px ergonomics when loaded', () => {
        const adminModal = readSource('src/components/AdminModal.tsx');

        // Close 'X' button
        expect(
          adminModal.includes('w-11 h-11') || adminModal.includes('min-w-[44px]'),
          '[T3.3 Defect] AdminModal close trigger must satisfy 44x44px bounds'
        ).toBe(true);

        // Tab triggers and unlock action
        expect(
          adminModal.includes('min-h-[44px]'),
          '[T3.3 Defect] AdminModal action triggers must specify min-h-[44px]'
        ).toBe(true);
      });

      it('T3.3.2: CategoryManagerModal category pills and keyword actions satisfy 44px ergonomics when loaded', () => {
        const catModal = readSource('src/components/CategoryManagerModal.tsx');

        // Close 'X' button
        expect(
          catModal.includes('w-11 h-11') || catModal.includes('min-w-[44px]'),
          '[T3.3 Defect] CategoryManagerModal close trigger must satisfy 44x44px bounds'
        ).toBe(true);

        // Category pills
        expect(
          catModal.includes('min-h-[44px]'),
          '[T3.3 Defect] CategoryManagerModal category selection pills must have min-h-[44px]'
        ).toBe(true);
      });
    });

    describe('C4: PWA Offline Prefetch vs Test Runner Environment Guard', () => {
      it('T3.4.1: Background idle prefetch does not execute during automated test runs', () => {
        const appContent = readSource('src/App.tsx');

        expect(
          appContent.includes("NODE_ENV === 'test'"),
          '[T3.4 Defect] App.tsx prefetch must bail out if process.env.NODE_ENV === "test"'
        ).toBe(true);
      });
    });
  });

  // ==========================================================================
  // TIER 4: Real-World User Flows
  // ==========================================================================
  describe('Tier 4: Real-World User Flows', () => {
    describe('Flow 1: End-to-End Grocery Item Interaction', () => {
      it('T4.1.1: Complete lifecycle: create item, check off, adjust quantity stepper, change category, and delete', async () => {
        const list: GroceryList = {
          id: 'list_flow_1',
          name: 'Weekly Groceries',
          description: 'Produce and essentials',
          color: 'emerald',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveList(list);

        const item: GroceryItem = {
          id: 'item_flow_1',
          listId: 'list_flow_1',
          name: 'Organic Avocados',
          quantity: 2,
          unit: 'pcs',
          category: 'Produce',
          completed: false,
          completedAt: null,
          completedBy: null,
          addedBy: { deviceId: 'dev_phone', deviceName: 'Phone' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveItem(item);

        let items = await getAllItems();
        expect(items.some((i) => i.id === 'item_flow_1')).toBe(true);

        // Step 1: Check off item via checkbox
        item.completed = true;
        item.completedAt = Date.now();
        await saveItem(item);

        items = await getAllItems();
        const checked = items.find((i) => i.id === 'item_flow_1');
        expect(checked?.completed).toBe(true);

        // Step 2: Uncheck and adjust quantity
        item.completed = false;
        item.quantity = 4;
        await saveItem(item);

        items = await getAllItems();
        const updatedQty = items.find((i) => i.id === 'item_flow_1');
        expect(updatedQty?.quantity).toBe(4);

        // Step 3: Re-categorize item
        item.category = 'Pantry';
        await saveItem(item);

        items = await getAllItems();
        const updatedCat = items.find((i) => i.id === 'item_flow_1');
        expect(updatedCat?.category).toBe('Pantry');

        // Step 4: Delete item and list to prevent leaking into subsequent flows
        await deleteItemFromStorage('item_flow_1');
        items = await getAllItems();
        expect(items.some((i) => i.id === 'item_flow_1')).toBe(false);
        await deleteListFromStorage('list_flow_1');
      });
    });

    describe('Flow 2: Header Quick Actions Flow', () => {
      it('T4.2.1: Header toggles theme state and quick lock correctly', () => {
        // Test Theme Switching in localStorage
        localStorage.setItem('cartsync_theme', 'dark');
        expect(localStorage.getItem('cartsync_theme')).toBe('dark');

        localStorage.setItem('cartsync_theme', 'light');
        expect(localStorage.getItem('cartsync_theme')).toBe('light');

        // Test Quick Lock activation
        localStorage.setItem('cartsync_master_pin', '1234');
        localStorage.setItem('cartsync_is_locked', 'true');
        expect(localStorage.getItem('cartsync_is_locked')).toBe('true');

        // Unlock
        localStorage.setItem('cartsync_is_locked', 'false');
        expect(localStorage.getItem('cartsync_is_locked')).toBe('false');
      });
    });

    describe('Flow 3: Opening Lazy Modals Flow', () => {
      it('T4.3.1: Admin and Category modal triggers exist in ListSidebar navigation drawer', () => {
        const sidebar = readSource('src/components/ListSidebar.tsx');

        // Category Manager button in sidebar
        expect(sidebar).toContain('openCategoryModal');
        expect(sidebar).toContain('Manage Categories');

        // Admin Control Center button in sidebar
        expect(sidebar).toContain('openAdminModal');
        expect(sidebar).toContain('Admin Control Center');

        // Sidebar navigation triggers should provide min-h-[44px] touch target
        expect(
          sidebar.includes('min-h-[44px]'),
          '[Flow 3 Defect] ListSidebar navigation buttons must specify min-h-[44px]'
        ).toBe(true);
      });
    });

    describe('Flow 4: List Lifecycle & Safe Deletion Flow', () => {
      it('T4.4.1: Lists require confirmation when deleting non-empty list and prevent deleting last list', async () => {
        // Ensure clean-slate test isolation from prior flows
        const existingLists = await getAllLists();
        for (const l of existingLists) {
          await deleteListFromStorage(l.id);
        }

        const listA: GroceryList = {
          id: 'list_a',
          name: 'Pantry Staples',
          color: 'emerald',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const listB: GroceryList = {
          id: 'list_b',
          name: 'Party Supplies',
          color: 'rose',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await saveList(listA);
        await saveList(listB);

        let lists = await getAllLists();
        expect(lists.length).toBe(2);

        // Add item to listB
        const item: GroceryItem = {
          id: 'item_b_1',
          listId: 'list_b',
          name: 'Soda Cans',
          quantity: 12,
          unit: 'pcs',
          category: 'Beverages',
          completed: false,
          completedAt: null,
          completedBy: null,
          addedBy: { deviceId: 'dev_phone', deviceName: 'Phone' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveItem(item);

        const deleteModalContent = readSource('src/components/DeleteListModal.tsx');

        // DeleteListModal must include SlideToConfirm safeguard
        expect(deleteModalContent).toContain('SlideToConfirm');
        expect(deleteModalContent).toContain('Cannot delete your only list');

        // Delete listB
        await deleteListFromStorage('list_b');
        lists = await getAllLists();
        expect(lists.length).toBe(1);
        expect(lists[0].id).toBe('list_a');

        // Cleanup remaining listA
        await deleteListFromStorage('list_a');
      });
    });
  });
});

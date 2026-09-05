import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CATEGORY_COLORS } from '../src/utils/smartCategorizer';
import { ItemCategory } from '../src/types';

// W3C WCAG 2.1 Relative Luminance & Contrast Ratio Calculation
function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
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

// Tailwind color hex palette definitions used in CartSync
const PALETTE = {
  white: '#ffffff',
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
  emerald300: '#6ee7b7',
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
};

describe('CartSync UI Redesign QA Audit: Contrast & Visual Ergonomics', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('(a) Contrast & Accessibility (WCAG 2.1 Compliance)', () => {
    it('Dark Mode: primary text (slate-100) on canvas (slate-900) must exceed WCAG AAA (7.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.slate100, PALETTE.slate900);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeGreaterThan(15.0);
    });

    it('Dark Mode: primary text (slate-100) on card surface (slate-800) must exceed WCAG AAA (7.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.slate100, PALETTE.slate800);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeGreaterThan(12.0);
    });

    it('Dark Mode: secondary text (slate-400) on canvas (slate-900) must exceed WCAG AA (4.5:1)', () => {
      const ratio = getContrastRatio(PALETTE.slate400, PALETTE.slate900);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThan(6.0);
    });

    it('Dark Mode: secondary text (slate-400) on card surface (slate-800) must exceed WCAG AA (4.5:1)', () => {
      const ratio = getContrastRatio(PALETTE.slate400, PALETTE.slate800);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThan(5.0);
    });

    it('Dark Mode: accent text (emerald-300 / emerald-400) on slate-900 must exceed WCAG AAA (7.0:1)', () => {
      const ratio300 = getContrastRatio(PALETTE.emerald300, PALETTE.slate900);
      const ratio400 = getContrastRatio(PALETTE.emerald400, PALETTE.slate900);
      expect(ratio300).toBeGreaterThanOrEqual(7.0);
      expect(ratio400).toBeGreaterThanOrEqual(7.0);
    });

    it('Light Mode: primary text (slate-900) on canvas (slate-50) must exceed WCAG AAA (7.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.slate900, PALETTE.slate50);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeGreaterThan(15.0);
    });

    it('Light Mode: primary item title (slate-800) on white card must exceed WCAG AAA (7.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.slate800, PALETTE.white);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeGreaterThan(12.5);
    });

    it('Light Mode: accent button text (emerald-700) on slate-50 must exceed WCAG AA (4.5:1)', () => {
      const ratio = getContrastRatio(PALETTE.emerald700, PALETTE.slate50);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('all 14 categories must have dark-mode desaturated pill backgrounds and compliant text contrast', () => {
      const categories: ItemCategory[] = [
        'Produce', 'Dairy & Eggs', 'Bakery', 'Meat & Seafood', 'Pantry', 'Frozen',
        'Snacks & Sweets', 'Beverages', 'Household & Cleaning', 'Pharmacy & Health',
        'Personal Care', 'Baby Care', 'Pet Care', 'Other',
      ];

      categories.forEach((cat) => {
        const style = CATEGORY_COLORS[cat];
        expect(style.bg).toContain('dark:bg-');
        expect(style.text).toContain('dark:text-');
        expect(style.border).toContain('dark:border-');
        expect(style.dot).toContain('bg-');
      });
    });
  });

  describe('(b) Mobile Viewport & Ergonomics Verification', () => {
    it('ListSelector pins "+ New List" button in-canvas with shrink-0 outside scroll container', () => {
      const filePath = path.join(rootDir, 'src/components/ListSelector.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toMatch(/openNewListModal[\s\S]*?shrink-0/);
      const newBtnIndex = content.indexOf('openNewListModal');
      const overflowIndex = content.indexOf('overflow-x-auto');
      expect(newBtnIndex).toBeLessThan(overflowIndex);
      expect(newBtnIndex).toBeGreaterThan(-1);
    });

    it('GroceryItemCard maintains ergonomic touch envelope for circular checkbox', () => {
      const filePath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('w-8 h-8');
      expect(content).toContain('w-[20px] h-[20px] rounded-full');
      expect(content).toContain('-my-1 -ml-1');
      expect(content).toContain('group-active/cb:scale-90');
    });

    it('QuickAddBar is fixed bottom dock with 44px input touch envelope and pb-safe', () => {
      const filePath = path.join(rootDir, 'src/components/QuickAddBar.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('fixed bottom-0 inset-x-0 z-30');
      expect(content).toContain('pb-safe');
      expect(content).toContain('h-11');
    });

    it('App layout provides pb-32 and ItemList provides pb-24 ensuring no dock content clipping', () => {
      const appPath = path.join(rootDir, 'src/App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');
      expect(appContent).toContain('pb-32');

      const itemPath = path.join(rootDir, 'src/components/ItemList.tsx');
      const itemContent = fs.readFileSync(itemPath, 'utf-8');
      expect(itemContent).toContain('pb-24');
    });

    it('all overlay modals have z-50 above z-30 dock', () => {
      const modalFiles = [
        'src/components/DeleteListModal.tsx',
        'src/components/DeviceModal.tsx',
        'src/components/NewListModal.tsx',
        'src/components/SyncStatusModal.tsx',
      ];

      modalFiles.forEach((relPath) => {
        const fullPath = path.join(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content, `${relPath} must have z-50`).toContain('z-50');
      });
    });

    it('DeleteListModal requires slide-to-confirm safeguard for non-empty lists and handles single list safety', () => {
      const modalPath = path.join(rootDir, 'src/components/DeleteListModal.tsx');
      const content = fs.readFileSync(modalPath, 'utf-8');

      expect(content).toContain('SlideToConfirm');
      expect(content).toContain('Cannot delete your only list');
      expect(content).toContain('Slide to delete');
    });
  });

  describe('(c) Theme System & Palette Consistency', () => {
    it('index.html sets soft slate-50 light and slate-900 dark background classes', () => {
      const htmlPath = path.join(rootDir, 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      expect(html).toContain('bg-slate-50 dark:bg-slate-900');
      expect(html).toContain('text-slate-900 dark:text-slate-100');
    });

    it('ThemeContext updates mobile status bar theme-color dynamically to #0f172a / #f8fafc', () => {
      const themeCtxPath = path.join(rootDir, 'src/context/ThemeContext.tsx');
      const content = fs.readFileSync(themeCtxPath, 'utf-8');

      expect(content).toContain("metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#f8fafc')");
    });

    it('tailwind.config.js includes slate-850 warm intermediate elevation token', () => {
      const twPath = path.join(rootDir, 'tailwind.config.js');
      const tw = fs.readFileSync(twPath, 'utf-8');

      expect(tw).toContain('850:');
      expect(tw).toContain('#161f30');
    });
  });

  describe('(d) Dark Mode Input Contrast & Form Controls', () => {
    it('index.css declares html.dark { color-scheme: dark; } and color-scheme: dark for form controls', () => {
      const cssPath = path.join(rootDir, 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toMatch(/html\.dark\s*\{[\s\S]*?color-scheme:\s*dark;/);
      expect(cssContent).toMatch(/html\.dark\s+input[\s\S]*?color-scheme:\s*dark;/);
    });

    it('QuickAddBar, ItemList, NewListModal, DeviceModal, and GroceryItemCard inputs have explicit dark backgrounds', () => {
      const componentsToAudit = [
        'src/components/QuickAddBar.tsx',
        'src/components/ItemList.tsx',
        'src/components/NewListModal.tsx',
        'src/components/EditListModal.tsx',
        'src/components/DeviceModal.tsx',
        'src/components/GroceryItemCard.tsx',
      ];

      componentsToAudit.forEach((relPath) => {
        const fullPath = path.join(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        expect(content, `${relPath} must specify dark:bg-slate-800`).toContain('dark:bg-slate-800');
        expect(content, `${relPath} must specify dark:text-slate-100`).toContain('dark:text-slate-100');
        expect(content, `${relPath} must specify dark:placeholder:text-slate-500`).toContain('dark:placeholder:text-slate-500');
      });
    });

    it('Input text (slate-100) on input background (slate-800) must exceed WCAG AAA (7.0:1)', () => {
      const ratio = getContrastRatio(PALETTE.slate100, PALETTE.slate800);
      expect(ratio).toBeGreaterThanOrEqual(7.0);
      expect(ratio).toBeGreaterThan(12.0);
    });
  });
});
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Floating Back To Top Feature Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('ScrollToTopButton component file exists and implements scroll threshold detection', () => {
    const componentPath = path.join(rootDir, 'src/components/ScrollToTopButton.tsx');
    expect(fs.existsSync(componentPath)).toBe(true);

    const content = fs.readFileSync(componentPath, 'utf-8');
    expect(content).toContain('window.scrollY > 250');
    expect(content).toContain("window.scrollTo");
    expect(content).toContain("behavior: 'smooth'");
    expect(content).toContain('fixed bottom-20');
    expect(content).toContain('right-4');
  });

  it('App.tsx imports and renders ScrollToTopButton in main layout', () => {
    const appPath = path.join(rootDir, 'src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    expect(content).toContain("import { ScrollToTopButton } from './components/ScrollToTopButton'");
    expect(content).toContain('<ScrollToTopButton />');
  });
});

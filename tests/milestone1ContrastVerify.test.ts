import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const srcDir = path.resolve(__dirname, '../src');

function getAllFiles(dir: string, ext = '.tsx'): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

// Regex matching gray-on-color within className strings:
// e.g., bg-(color)-(number) combined with text-(gray)-(number)
const COLOR_NAMES = 'rose|emerald|amber|blue|violet|sky|indigo|purple|teal|red|pink|lime|orange|yellow|cyan';
const GRAY_NAMES = 'slate|gray|zinc|neutral|stone';

// Impeccable detector pattern for gray-on-color
const GRAY_ON_COLOR_REGEX_1 = new RegExp(
  `\\b(?:(?:[a-z0-9\\-:]+)?bg-(?:${COLOR_NAMES})-[0-9]+)\\b[^"'\`}>]*\\b(?:(?:[a-z0-9\\-:]+)?text-(?:${GRAY_NAMES})-[0-9]+)\\b`
);
const GRAY_ON_COLOR_REGEX_2 = new RegExp(
  `\\b(?:(?:[a-z0-9\\-:]+)?text-(?:${GRAY_NAMES})-[0-9]+)\\b[^"'\`}>]*\\b(?:(?:[a-z0-9\\-:]+)?bg-(?:${COLOR_NAMES})-[0-9]+)\\b`
);

describe('Milestone 1 Impeccable Detector Gray-on-Color Zero-Warning Verification', () => {
  const allSrcFiles = getAllFiles(srcDir);

  it('scans all src TSX/TS files and reports 0 gray-on-color anti-patterns', () => {
    const violations: { file: string; line: number; match: string }[] = [];

    allSrcFiles.forEach((filePath) => {
      // Don't scan test files or non-component files if any
      const relativePath = path.relative(srcDir, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Only inspect className or class definitions or element attribute lines
        if (
          GRAY_ON_COLOR_REGEX_1.test(line) ||
          GRAY_ON_COLOR_REGEX_2.test(line)
        ) {
          violations.push({
            file: relativePath,
            line: index + 1,
            match: line.trim(),
          });
        }
      });
    });

    expect(
      violations,
      `Expected 0 gray-on-color violations across src/, found ${violations.length}:\n` +
        violations.map((v) => `  ${v.file}:${v.line} -> ${v.match}`).join('\n')
    ).toEqual([]);
  });

  it('verifies src/index.css contains global ::selection', () => {
    const cssPath = path.join(srcDir, 'index.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain('::selection');
    expect(css).toContain('rgb(4 120 87)');
  });

  it('verifies App.tsx has no inline selection:bg-* classes', () => {
    const appPath = path.join(srcDir, 'App.tsx');
    const app = fs.readFileSync(appPath, 'utf-8');
    expect(app.includes('selection:bg-')).toBe(false);
  });
});

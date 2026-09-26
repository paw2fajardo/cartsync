import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

const bumpType = process.argv[2] || 'patch'; // 'patch' | 'minor' | 'major'

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';
const parts = currentVersion.split('.').map(Number);

if (bumpType === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (bumpType === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  // default patch
  parts[2] += 1;
}

const newVersion = parts.join('.');
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

console.log(`[Version Bump] ${currentVersion} -> ${newVersion}`);

// Try to create git tag
try {
  execSync(`git add package.json`, { cwd: rootDir });
  execSync(`git commit -m "chore(release): bump version to v${newVersion}"`, { cwd: rootDir });
  execSync(`git tag v${newVersion}`, { cwd: rootDir });
  console.log(`[Git Tag] Created tag v${newVersion}`);
} catch (err) {
  console.warn('[Git Tag] Could not automatically create tag:', err.message);
}

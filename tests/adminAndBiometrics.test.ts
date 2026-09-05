import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Admin Window & Biometric Security Infrastructure', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('AdminModal component exists and provides all 4 admin control center tabs', () => {
    const adminPath = path.join(rootDir, 'src/components/AdminModal.tsx');
    expect(fs.existsSync(adminPath)).toBe(true);

    const content = fs.readFileSync(adminPath, 'utf-8');
    expect(content).toContain('Admin Control Center');
    expect(content).toContain('Access & Lock');
    expect(content).toContain('Devices');
    expect(content).toContain('Auto-Rules');
    expect(content).toContain('Maintenance');
    expect(content).toContain('Fingerprint');
    expect(content).toContain('Export JSON Backup');
    expect(content).toContain('Database Reset (Danger Zone)');
  });

  it('biometrics utility implements WebAuthn platform authenticator verification', () => {
    const bioPath = path.join(rootDir, 'src/utils/biometrics.ts');
    expect(fs.existsSync(bioPath)).toBe(true);

    const content = fs.readFileSync(bioPath, 'utf-8');
    expect(content).toContain('isBiometricsAvailable');
    expect(content).toContain('registerBiometrics');
    expect(content).toContain('verifyBiometrics');
    expect(content).toContain('isBiometricsEnrolled');
    expect(content).toContain('PublicKeyCredential');
    expect(content).toContain('authenticatorAttachment: \'platform\'');
  });

  it('LockScreen integrates biometric scan button alongside 4-digit keypad', () => {
    const lockPath = path.join(rootDir, 'src/components/LockScreen.tsx');
    const content = fs.readFileSync(lockPath, 'utf-8');

    expect(content).toContain('Fingerprint');
    expect(content).toContain('handleBiometricScan');
    expect(content).toContain('unlockWithBiometrics');
    expect(content).toContain('Enter Household PIN');
  });

  it('AuthContext exposes biometric and admin modal management methods', () => {
    const authPath = path.join(rootDir, 'src/context/AuthContext.tsx');
    const content = fs.readFileSync(authPath, 'utf-8');

    expect(content).toContain('isAdminModalOpen');
    expect(content).toContain('openAdminModal');
    expect(content).toContain('closeAdminModal');
    expect(content).toContain('isBiometricsSupported');
    expect(content).toContain('isBiometricsActive');
    expect(content).toContain('enableBiometrics');
    expect(content).toContain('disableBiometrics');
    expect(content).toContain('unlockWithBiometrics');
    expect(content).toContain('purgeDevice');
  });

  it('Header provides streamlined navigation and Sidebar includes quick access to Admin Control Center', () => {
    const headerPath = path.join(rootDir, 'src/components/Header.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');
    expect(headerContent).toContain('onToggleSidebar');
    expect(headerContent).toContain('Open Menu & Household Lists');

    const sidebarPath = path.join(rootDir, 'src/components/ListSidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
    expect(sidebarContent).toContain('openAdminModal');
    expect(sidebarContent).toContain('Admin Control Center');
  });

  it('Server supports DEVICE_DELETE command to purge obsolete devices from SQLite', () => {
    const serverPath = path.join(rootDir, 'server/index.js');
    const serverContent = fs.readFileSync(serverPath, 'utf-8');
    expect(serverContent).toContain('DEVICE_DELETE');
    expect(serverContent).toContain('cartSyncDb.deleteDevice');

    const dbPath = path.join(rootDir, 'server/db.js');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    expect(dbContent).toContain('deleteDevice(deviceId)');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectDevice, saveDeviceProfile } from '../src/utils/deviceDetector';
import { DeviceProfile } from '../src/types';

describe('Device Detector & Attribution Verification', () => {
  const STORAGE_KEY = 'cartsync_device_profile_v1';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should generate a unique device ID with expected format', () => {
    const profile = detectDevice();
    expect(profile.id).toMatch(/^dev_\d+_[a-z0-9]+$/);
    expect(profile.name).toBeDefined();
    expect(profile.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(profile.isCustomName).toBe(false);
    expect(profile.lastActive).toBeGreaterThan(0);
  });

  it('should persist generated device profile to localStorage', () => {
    const profile = detectDevice();
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.id).toBe(profile.id);
    expect(parsed.name).toBe(profile.name);
  });

  it('should retrieve existing device profile from localStorage on subsequent calls', () => {
    const initial = detectDevice();
    const secondCall = detectDevice();

    expect(secondCall.id).toBe(initial.id);
    expect(secondCall.name).toBe(initial.name);
    expect(secondCall.color).toBe(initial.color);
    expect(secondCall.icon).toBe(initial.icon);
  });

  it('should detect iPad and assign "Kitchen iPad" and "tablet" icon', () => {
    localStorage.clear();
    const originalNavigator = window.navigator;

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        maxTouchPoints: 5,
      },
      configurable: true,
      writable: true,
    });

    const profile = detectDevice();
    expect(profile.icon).toBe('tablet');
    expect(profile.name).toBe('Kitchen iPad');

    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('should detect iPhone and assign "iPhone" and "smartphone" icon', () => {
    localStorage.clear();
    const originalNavigator = window.navigator;

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
      configurable: true,
      writable: true,
    });

    const profile = detectDevice();
    expect(profile.icon).toBe('smartphone');
    expect(profile.name).toBe('iPhone');

    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('should detect Windows desktop and assign "Home Desktop" and "monitor" icon', () => {
    localStorage.clear();
    const originalNavigator = window.navigator;

    Object.defineProperty(window, 'navigator', {
      value: {
        ...originalNavigator,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      configurable: true,
      writable: true,
    });

    const profile = detectDevice();
    expect(profile.icon).toBe('monitor');
    expect(profile.name).toBe('Home Desktop');

    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('should support device renaming and customization flow', () => {
    const profile = detectDevice();
    const customProfile: DeviceProfile = {
      ...profile,
      name: 'Pantry Terminal',
      color: '#ec4899',
      icon: 'home',
      isCustomName: true,
    };

    saveDeviceProfile(customProfile);

    const reloaded = detectDevice();
    expect(reloaded.id).toBe(profile.id);
    expect(reloaded.name).toBe('Pantry Terminal');
    expect(reloaded.color).toBe('#ec4899');
    expect(reloaded.icon).toBe('home');
    expect(reloaded.isCustomName).toBe(true);
  });
});

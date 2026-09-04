import { DeviceIcon, DeviceProfile } from '../types';

const DEVICE_STORAGE_KEY = 'koffan_device_profile_v1';

const AVATAR_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#f97316', // orange
];

export function detectDevice(): DeviceProfile {
  // Check if profile exists in localStorage
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed && parsed.id && parsed.name) {
        parsed.lastActive = Date.now();
        localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read existing device profile:', err);
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let detectedType: DeviceIcon = 'laptop';
  let suggestedName = 'Kitchen Counter';

  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
  const isMac = /Macintosh|Mac OS X/i.test(userAgent);
  const isWindows = /Windows NT/i.test(userAgent);
  const isIPhone = /iPhone/i.test(userAgent);
  const isIPad = /iPad/i.test(userAgent) || (isMac && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

  if (isIPad) {
    detectedType = 'tablet';
    suggestedName = 'Kitchen iPad';
  } else if (isTablet) {
    detectedType = 'tablet';
    suggestedName = 'Family Tablet';
  } else if (isIPhone) {
    detectedType = 'smartphone';
    suggestedName = 'iPhone';
  } else if (isMobile) {
    detectedType = 'smartphone';
    suggestedName = 'Mobile Phone';
  } else if (isMac) {
    detectedType = 'laptop';
    suggestedName = 'MacBook';
  } else if (isWindows) {
    detectedType = 'monitor';
    suggestedName = 'Home Desktop';
  } else {
    detectedType = 'laptop';
    suggestedName = 'Household Device';
  }

  const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const id = `dev_${Date.now()}_${randomSuffix}`;

  const profile: DeviceProfile = {
    id,
    name: suggestedName,
    color: randomColor,
    icon: detectedType,
    isCustomName: false,
    lastActive: Date.now(),
  };

  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Could not save device profile:', err);
  }

  return profile;
}

export function saveDeviceProfile(profile: DeviceProfile): void {
  try {
    profile.lastActive = Date.now();
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to save device profile:', err);
  }
}

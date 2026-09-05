/**
 * Biometrics & WebAuthn Utility for CartSync
 * Provides native Fingerprint, Touch ID, Face ID, and Windows Hello
 * authentication across PWAs and modern mobile browsers.
 */

const BIOMETRIC_CRED_KEY = 'cartsync_biometric_credential_id';
const BIOMETRIC_ENABLED_KEY = 'cartsync_biometric_enabled_v1';

/**
 * Checks if the device and browser support platform biometrics (Fingerprint / Touch ID / Face ID)
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(available);
    }
    return false;
  } catch (err) {
    console.warn('[Biometrics] Availability check error:', err);
    return false;
  }
}

/**
 * Checks if biometric unlock is actively enrolled on this device
 */
export function isBiometricsEnrolled(): boolean {
  if (typeof window === 'undefined') return false;
  const credentialId = localStorage.getItem(BIOMETRIC_CRED_KEY);
  const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === 'true';
  return Boolean(credentialId && enabled);
}

/**
 * Enrolls a new biometric credential on this device (Fingerprint / Touch ID / Face ID)
 */
export async function registerBiometrics(userName = 'CartSync User'): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn biometrics not supported on this browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'CartSync Household',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userId,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Enforce on-device biometric sensor (Fingerprint / Face ID)
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Biometric enrollment was canceled.' };
    }

    // Save credential ID locally
    const rawIdBuffer = credential.rawId;
    const base64Id = btoa(String.fromCharCode(...new Uint8Array(rawIdBuffer)));
    localStorage.setItem(BIOMETRIC_CRED_KEY, base64Id);
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

    return { success: true };
  } catch (err: any) {
    console.error('[Biometrics] Registration error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric registration was canceled or timed out.' };
    }
    return { success: false, error: err.message || 'Failed to register biometric credential.' };
  }
}

/**
 * Prompts the user to scan their fingerprint / Face ID to verify identity
 */
export async function verifyBiometrics(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'Biometrics unavailable.' };
  }

  const storedCredId = localStorage.getItem(BIOMETRIC_CRED_KEY);
  if (!storedCredId) {
    return { success: false, error: 'No fingerprint/biometric credential enrolled.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Convert stored base64 credential ID back to Uint8Array
    const binaryString = atob(storedCredId);
    const credIdBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      credIdBytes[i] = binaryString.charCodeAt(i);
    }

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: credIdBytes,
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    };

    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null;

    if (assertion && assertion.id) {
      return { success: true };
    }

    return { success: false, error: 'Biometric verification failed.' };
  } catch (err: any) {
    console.warn('[Biometrics] Verification prompt result:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric scan canceled.' };
    }
    return { success: false, error: err.message || 'Biometric scan failed.' };
  }
}

/**
 * Disables and removes biometric credential
 */
export function removeBiometrics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BIOMETRIC_CRED_KEY);
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
}

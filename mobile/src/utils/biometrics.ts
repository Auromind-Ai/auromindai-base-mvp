import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometryName: string; // e.g. "Face ID", "Touch ID", "Fingerprint", "Face Unlock", or "Biometrics"
  actionLabel: string;   // e.g. "Unlock with Face ID"
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  isCancelled?: boolean;
  isLockout?: boolean;
}

/**
 * Returns formatted biometry display name based on platform and hardware sensors.
 */
export function getBiometryLabel(
  types: LocalAuthentication.AuthenticationType[],
  platform = Platform.OS
): string {
  const hasFacial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS);

  if (platform === 'ios') {
    if (hasFacial && !hasFingerprint) return 'Face ID';
    if (hasFingerprint && !hasFacial) return 'Touch ID';
    if (hasFacial && hasFingerprint) return 'Face ID / Touch ID';
    return 'Biometrics';
  }

  // Android or other
  if (hasFacial && !hasFingerprint && !hasIris) return 'Face Unlock';
  if (hasFingerprint && !hasFacial && !hasIris) return 'Fingerprint';
  if (hasFingerprint && hasFacial) return 'Fingerprint / Face Unlock';
  return 'Biometrics';
}

/**
 * Check if the device hardware supports biometrics and has enrolled credentials.
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    const isAvailable = Boolean(hasHardware && isEnrolled);
    const biometryName = getBiometryLabel(supportedTypes);

    return {
      hasHardware,
      isEnrolled,
      isAvailable,
      supportedTypes,
      biometryName,
      actionLabel: `Unlock with ${biometryName}`,
    };
  } catch (err) {
    return {
      hasHardware: false,
      isEnrolled: false,
      isAvailable: false,
      supportedTypes: [],
      biometryName: 'Biometrics',
      actionLabel: 'Unlock with Biometrics',
    };
  }
}

/**
 * Trigger the system biometric authentication dialog.
 * Device passcode fallback is enabled by default so users are never permanently locked out.
 */
export async function authenticateWithBiometrics(options?: {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage ?? 'Unlock Orbion',
      cancelLabel: options?.cancelLabel ?? 'Cancel',
      fallbackLabel: options?.fallbackLabel ?? 'Use Device Passcode',
      disableDeviceFallback: options?.disableDeviceFallback ?? false,
    });

    if (result.success) {
      return { success: true };
    }

    const err = result.error || 'unknown';
    const errStr = String(err);
    const isCancelled = errStr === 'user_cancel' || errStr === 'app_cancel' || errStr === 'system_cancel';
    const isLockout = errStr === 'lockout' || errStr === 'lockout_permanent';

    return {
      success: false,
      error: errStr,
      isCancelled,
      isLockout,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Biometric authentication failed',
    };
  }
}

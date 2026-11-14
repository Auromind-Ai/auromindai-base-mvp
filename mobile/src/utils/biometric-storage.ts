import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_KEY_PREFIX = 'orbion_bio_lock_';
const GRACE_PERIOD_KEY = 'orbion_bio_grace_ms';
export const DEFAULT_GRACE_PERIOD_MS = 15000; // 15 seconds grace period

function getStorageKey(userId?: string | null): string {
  const sanitizedUser = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
  return `${SECURE_KEY_PREFIX}${sanitizedUser}`;
}

const isSecureStoreAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export async function getBiometricLockPreference(userId?: string | null): Promise<boolean> {
  const key = getStorageKey(userId);
  try {
    if (isSecureStoreAvailable) {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) {
        return val === 'true';
      }
    } else {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) {
        return val === 'true';
      }
    }
  } catch (error) {
    // If SecureStore fails (e.g. device locked or storage error), check AsyncStorage fallback
    try {
      const fallback = await AsyncStorage.getItem(key);
      if (fallback !== null) return fallback === 'true';
    } catch {}
  }
  return false;
}

export async function setBiometricLockPreference(enabled: boolean, userId?: string | null): Promise<void> {
  const key = getStorageKey(userId);
  const strVal = enabled ? 'true' : 'false';

  try {
    if (isSecureStoreAvailable) {
      await SecureStore.setItemAsync(key, strVal, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }
  } catch (error) {
    // Continue to async storage fallback
  }

  // Also maintain local fallback for redundancy
  try {
    await AsyncStorage.setItem(key, strVal);
  } catch {}
}

export async function getGracePeriodPreference(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(GRACE_PERIOD_KEY);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch {}
  return DEFAULT_GRACE_PERIOD_MS;
}

export async function setGracePeriodPreference(ms: number): Promise<void> {
  try {
    await AsyncStorage.setItem(GRACE_PERIOD_KEY, String(ms));
  } catch {}
}

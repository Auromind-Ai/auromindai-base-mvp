import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import {
  checkBiometricCapabilities,
  authenticateWithBiometrics,
  BiometricCapabilities,
  BiometricAuthResult,
} from '../utils/biometrics';
import {
  getBiometricLockPreference,
  setBiometricLockPreference,
  getGracePeriodPreference,
  DEFAULT_GRACE_PERIOD_MS,
} from '../utils/biometric-storage';
import { authStore, useAuth } from '../store/auth';

interface BiometricLockContextType {
  isLocked: boolean;
  isReady: boolean;
  isBiometricEnabled: boolean;
  isAuthenticating: boolean;
  privacyShieldActive: boolean;
  capabilities: BiometricCapabilities | null;
  authError: string | null;
  promptUnlock: () => Promise<boolean>;
  toggleBiometricLock: (enable: boolean) => Promise<{ success: boolean; error?: string }>;
  signOutAndUnlock: () => Promise<void>;
  refreshCapabilities: () => Promise<BiometricCapabilities>;
}

const BiometricLockContext = createContext<BiometricLockContextType | null>(null);

export const BiometricLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, isInitialized: authInitialized } = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [privacyShieldActive, setPrivacyShieldActive] = useState(false);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Defensive Guards
  const isAuthenticatingRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const gracePeriodMsRef = useRef<number>(DEFAULT_GRACE_PERIOD_MS);
  const currentUserIdRef = useRef<string | null>(user?.id || null);

  currentUserIdRef.current = user?.id || null;

  // Load capabilities & user preferences
  const refreshCapabilities = useCallback(async () => {
    const caps = await checkBiometricCapabilities();
    setCapabilities(caps);
    return caps;
  }, []);

  const loadPreferences = useCallback(async (userId?: string | null) => {
    try {
      const [caps, enabled, grace] = await Promise.all([
        checkBiometricCapabilities(),
        getBiometricLockPreference(userId),
        getGracePeriodPreference(),
      ]);

      setCapabilities(caps);
      gracePeriodMsRef.current = grace;

      // If user enabled biometric lock on device, but biometrics were removed in OS settings
      if (enabled && !caps.isAvailable) {
        setIsBiometricEnabled(false);
        await setBiometricLockPreference(false, userId);
        return false;
      }

      setIsBiometricEnabled(enabled);
      return enabled;
    } catch {
      return false;
    }
  }, []);

  // Cold Start Initialization
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!authInitialized) return;

      const enabled = await loadPreferences(user?.id);

      if (mounted) {
        // If user is authenticated and biometric lock is enabled, lock on cold start
        if (token && enabled) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
        setIsReady(true);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [authInitialized, token, user?.id, loadPreferences]);

  // Manage Android Screen Protection (FLAG_SECURE)
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (isBiometricEnabled) {
        ScreenCapture.preventScreenCaptureAsync().catch(() => {});
      } else {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      }
    }
  }, [isBiometricEnabled]);

  // Prompt Unlock Handler
  const promptUnlock = useCallback(async (): Promise<boolean> => {
    if (isAuthenticatingRef.current) return false;

    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result: BiometricAuthResult = await authenticateWithBiometrics({
        promptMessage: 'Unlock Orbion',
        fallbackLabel: 'Use Device Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        setAuthError(null);
        return true;
      }

      if (result.isLockout) {
        setAuthError('Too many failed attempts. Please use your device passcode.');
      } else if (!result.isCancelled && result.error) {
        setAuthError('Authentication failed. Please tap to try again.');
      }

      return false;
    } finally {
      setIsAuthenticating(false);
      // Defensive guard delay (300-500ms) to ensure transient OS modal dismissal 'active' event is absorbed
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 400);
    }
  }, []);

  // Automatically trigger unlock prompt when app becomes locked
  useEffect(() => {
    if (isLocked && isReady && token) {
      promptUnlock().catch(() => {});
    }
  }, [isLocked, isReady, token, promptUnlock]);

  // AppState change listener (Lifecycle lock & immediate privacy shield)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // 1. Immediate Privacy Shield: Show shield immediately whenever leaving active state
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        if (isBiometricEnabled && token) {
          setPrivacyShieldActive(true);
        }
      }

      // Record timestamp strictly on background
      if (nextAppState === 'background') {
        backgroundedAtRef.current = Date.now();
      }

      // 2. Return to active state
      if (nextAppState === 'active') {
        setPrivacyShieldActive(false);

        // Defensive guard: ignore active event triggered by system biometric prompt closing
        if (isAuthenticatingRef.current) {
          return;
        }

        // Check if biometric lock is required after background transition
        if (isBiometricEnabled && token) {
          const bgTime = backgroundedAtRef.current;
          if (bgTime !== null) {
            const elapsed = Date.now() - bgTime;
            if (elapsed >= gracePeriodMsRef.current) {
              setIsLocked(true);
            }
          }
        }

        backgroundedAtRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isBiometricEnabled, token]);

  // Toggle Biometric Lock (Invoked from Settings)
  const toggleBiometricLock = useCallback(
    async (enable: boolean): Promise<{ success: boolean; error?: string }> => {
      if (isAuthenticatingRef.current) {
        return { success: false, error: 'Authentication already in progress' };
      }

      // 1. If enabling: verify hardware support and enrollment first
      if (enable) {
        const caps = await checkBiometricCapabilities();
        setCapabilities(caps);

        if (!caps.hasHardware) {
          return {
            success: false,
            error: 'Biometric authentication is not supported on this device.',
          };
        }

        if (!caps.isEnrolled) {
          return {
            success: false,
            error: `No ${caps.biometryName} registered. Please set it up in your phone Settings first.`,
          };
        }
      }

      // 2. Require authentication challenge for BOTH enable and disable
      isAuthenticatingRef.current = true;
      setIsAuthenticating(true);

      try {
        const result = await authenticateWithBiometrics({
          promptMessage: enable
            ? 'Confirm your identity to enable App Lock'
            : 'Confirm your identity to disable App Lock',
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use Device Passcode',
        });

        if (!result.success) {
          return {
            success: false,
            error: result.isCancelled
              ? 'Cancelled by user'
              : result.error || 'Authentication failed',
          };
        }

        // 3. Save to device-local SecureStore with user scope
        await setBiometricLockPreference(enable, currentUserIdRef.current);
        setIsBiometricEnabled(enable);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update App Lock preference' };
      } finally {
        setIsAuthenticating(false);
        setTimeout(() => {
          isAuthenticatingRef.current = false;
        }, 400);
      }
    },
    []
  );

  // Sign out fallback (Emergency escape hatch if biometric sensors fail or lockout)
  const signOutAndUnlock = useCallback(async () => {
    setIsLocked(false);
    setPrivacyShieldActive(false);
    await authStore.clearAuth();
  }, []);

  return (
    <BiometricLockContext.Provider
      value={{
        isLocked,
        isReady,
        isBiometricEnabled,
        isAuthenticating,
        capabilities,
        privacyShieldActive,
        authError,
        promptUnlock,
        toggleBiometricLock,
        signOutAndUnlock,
        refreshCapabilities,
      }}
    >
      {children}
    </BiometricLockContext.Provider>
  );
};

export function useBiometricLock(): BiometricLockContextType {
  const context = useContext(BiometricLockContext);
  if (!context) {
    throw new Error('useBiometricLock must be used within a BiometricLockProvider');
  }
  return context;
}

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Lock, Fingerprint, LogOut, ShieldCheck } from 'lucide-react-native';
import { useBiometricLock } from '../context/biometric-lock-context';
import { useAppTheme } from '../context/theme-context';

export const BiometricLockOverlay: React.FC = () => {
  const {
    isLocked,
    privacyShieldActive,
    capabilities,
    authError,
    promptUnlock,
    signOutAndUnlock,
    isAuthenticating,
  } = useBiometricLock();

  const { colors, isDark } = useAppTheme();

  // Android Back Button Guard: Exit app when locked instead of dismissing or navigating back
  useEffect(() => {
    if (!isLocked) return;

    const onBackPress = () => {
      BackHandler.exitApp();
      return true; // Consume event
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isLocked]);

  // If neither privacy shield nor lock is active, do not render
  if (!isLocked && !privacyShieldActive) {
    return null;
  }

  // 1. Privacy Shield Mode (App Switcher / Background preview protection)
  if (privacyShieldActive && !isLocked) {
    return (
      <View
        style={[
          styles.overlayContainer,
          { backgroundColor: isDark ? '#05010B' : '#F8FAFC' },
        ]}
      >
        <ShieldCheck size={48} color="#6F5BFF" strokeWidth={2} />
      </View>
    );
  }

  // 2. Active Biometric Lock Mode
  const biometryLabel = capabilities?.actionLabel || 'Unlock Orbion';

  const handleConfirmSignOut = () => {
    Alert.alert(
      'Sign Out of Orbion',
      'Are you sure you want to sign out? You will need to log in again with your email/password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOutAndUnlock(),
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.overlayContainer,
        { backgroundColor: isDark ? '#090514' : '#FFFFFF' },
      ]}
    >
      <View style={styles.content}>
        {/* Lock Icon Emblem */}
        <View style={styles.iconCircle}>
          <Fingerprint size={46} color="#6F5BFF" strokeWidth={1.8} />
        </View>

        <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
          Orbion is Locked
        </Text>

        <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          Please authenticate with {capabilities?.biometryName || 'biometrics'} or your device passcode to continue.
        </Text>

        {/* Auth Error Display */}
        {authError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        {/* Primary Unlock Action */}
        <TouchableOpacity
          style={[styles.unlockButton, isAuthenticating && styles.buttonDisabled]}
          onPress={() => promptUnlock()}
          activeOpacity={0.8}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Lock size={18} color="#FFFFFF" strokeWidth={2.2} style={styles.buttonIcon} />
              <Text style={styles.unlockButtonText}>{biometryLabel}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sign Out Fallback (Emergency escape hatch if biometric sensors fail) */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleConfirmSignOut}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={isDark ? '#94A3B8' : '#64748B'} style={styles.buttonIcon} />
          <Text style={[styles.signOutButtonText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(111, 91, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: '#6F5BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 14,
    shadowColor: '#6F5BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  signOutButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
});

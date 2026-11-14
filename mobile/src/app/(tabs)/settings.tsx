import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import {
  User,
  GitBranch,
  Smartphone,
  ChevronRight,
  Briefcase,
  Palette,
  LogOut,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { authStore, useAuth } from '@/store/auth';
import { cancelAccountDeletion } from '@/api/auth';
import { fetchUserPreferences, updateUserPreferences } from '@/api/notifications';
import { Fonts } from '@/theme/tokens';
import { scaleFont, scaleContainer, scaleHeight } from '@/theme/responsive';
import { useAppTheme } from '@/context/theme-context';
import { usePushNotifications } from '@/hooks';
import { AppearanceMode } from '@/types/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authState = useAuth();
  const { themeMode, setThemeMode, isDark } = useAppTheme();
  const {
    isEnabled: pushNotifications,
    showPreview,
    mutePushes,
    togglePushNotifications,
    setShowPreview,
    setMuteDuration,
    unregisterDeviceToken,
    isLoading: isPushLoading,
  } = usePushNotifications();

  // Settings State
  const [biometricLock, setBiometricLock] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'sign_out';
    title: string;
    message: string;
    confirmText: string;
    isDestructive?: boolean;
  } | null>(null);

  const workspaceName = authState.selectedWorkspace?.name || authState.workspaces[0]?.name || 'Workspace';
  const userRole = authState.selectedWorkspace?.role || authState.user?.platform_role || 'Member';
  const userName = authState.user?.full_name || (authState.user?.email ? authState.user.email.split('@')[0] : 'User');
  const userEmail = authState.user?.email || '';
  const userInitial = ((userName || userEmail || 'U').trim()[0] || 'U').toUpperCase();

  React.useEffect(() => {
    let cancelled = false;
    authStore.refreshUser();
    authStore.refreshWorkspaces();

    const loadBiometricPref = async () => {
      try {
        const localVal = await AsyncStorage.getItem('@orbion_biometric_lock');
        if (!cancelled && localVal !== null) {
          setBiometricLock(localVal === 'true');
        }
        const prefs = await fetchUserPreferences();
        if (!cancelled && typeof prefs.biometric_lock === 'boolean') {
          setBiometricLock(prefs.biometric_lock);
          await AsyncStorage.setItem('@orbion_biometric_lock', String(prefs.biometric_lock));
        }
      } catch {
        // Offline fallback
      }
    };

    loadBiometricPref();
    return () => {
      cancelled = true;
    };
  }, []);

  // Unified theme palette matching inbox and connected channels
  const theme = {
    screenBg: isDark ? '#0A1023' : '#EEEEF5',
    cardBg: isDark ? '#202941' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(164, 170, 255, 0.07)' : 'rgba(255, 255, 255, 0.95)',
    cardShadow: isDark ? '#000000' : '#2F2B5A',
    textPrimary: isDark ? '#FFFFFF' : '#1A2138',
    textSecondary: isDark ? '#A2ADD8' : '#7583A5',
    textMuted: isDark ? '#A2ADD8' : '#7583A5',
    divider: isDark ? 'rgba(162, 173, 216, 0.10)' : 'rgba(117, 131, 165, 0.12)',
    icon: isDark ? '#FFFFFF' : '#1A2138',
    iconMuted: isDark ? 'rgba(255, 255, 255, 0.40)' : 'rgba(26, 33, 56, 0.40)',
    iconCircleBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    iconCircleBorder: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    primary: isDark ? '#7655F0' : '#8060E8',
    primaryGradient: (isDark
      ? ['#A69BFF', '#7655F0', '#6241DD']
      : ['#8060E8', '#6749DE']) as [string, string, ...string[]],
    segmentedBg: isDark ? 'rgba(128, 140, 190, 0.12)' : 'rgba(255, 255, 255, 0.70)',
    segmentedBorder: isDark ? 'rgba(168, 176, 225, 0.08)' : 'rgba(215, 222, 238, 0.85)',
    btnSecondaryBg: isDark ? 'rgba(128, 140, 190, 0.12)' : '#FFFFFF',
    btnSecondaryBorder: isDark ? 'rgba(168, 176, 225, 0.14)' : 'rgba(215, 222, 238, 0.95)',
    btnSecondaryText: isDark ? '#FFFFFF' : '#1A2138',
    roleBg: isDark ? 'rgba(118, 85, 240, 0.22)' : 'rgba(128, 96, 232, 0.15)',
    roleText: isDark ? '#C4B5FD' : '#6F51D1',
    modalBg: isDark ? '#1A223D' : '#FFFFFF',
    modalBorder: isDark ? 'rgba(164, 170, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
    modalOverlay: 'rgba(0, 0, 0, 0.65)',
    modalCloseCircleBg: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F2F4F7',
    modalCancelBtnBg: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F2F4F7',
    modalIconBg: isDark ? 'rgba(240, 68, 56, 0.15)' : '#FEE4E2',
  };

  const performSignOut = async () => {
    try {
      setIsSigningOut(true);
      await unregisterDeviceToken();
      await authStore.signOut();
      setConfirmModal(null);
      router.replace('/(auth)/login');
    } catch {
      await authStore.clearAuth();
      setConfirmModal(null);
      router.replace('/(auth)/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOut = () => {
    if (isSigningOut) return;
    setConfirmModal({
      type: 'sign_out',
      title: 'Sign out',
      message:
        'You will need to log in again to access your workspace conversations.',
      confirmText: 'Sign out',
      isDestructive: false,
    });
  };

  const handleToggleBiometricLock = async (enable: boolean) => {
    setBiometricLock(enable);
    await AsyncStorage.setItem('@orbion_biometric_lock', String(enable)).catch(() => {});
    await updateUserPreferences({ biometric_lock: enable }).catch(() => {});
  };

  const handleDeleteAccount = () => {
    if (isSigningOut) return;
    router.push('/delete-account');
  };

  const handleCancelDeletion = async () => {
    if (isCancellingDeletion) return;
    try {
      setIsCancellingDeletion(true);
      await cancelAccountDeletion();
      await authStore.refreshUser();
      setRestoreSuccessMsg('Account deletion cancelled. Your account has been fully restored!');
      setTimeout(() => setRestoreSuccessMsg(null), 4000);
    } catch {
      // Offline or error
    } finally {
      setIsCancellingDeletion(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal || isSigningOut) return;
    performSignOut();
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.screenBg }]}>
      <StatusBar style="light" />

      {/* TOP HEADER SECTION WITH INBOX GRADIENT & GLOW */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={
            isDark
              ? ['#111A3A', '#292D66', '#514BC0', '#342D75', '#171D40']
              : ['#30385F', '#6669B6', '#9388D7', '#68658F']
          }
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Center Radial Glow effect */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient
                id={isDark ? 'settingsDarkGlow' : 'settingsLightGlow'}
                cx="52%"
                cy="46%"
                rx="56%"
                ry="52%"
                fx="52%"
                fy="46%"
              >
                <Stop
                  offset="0%"
                  stopColor={isDark ? '#6F5BFF' : '#AB99FF'}
                  stopOpacity={isDark ? 0.38 : 0.48}
                />
                <Stop
                  offset="65%"
                  stopColor={isDark ? '#6F5BFF' : '#AB99FF'}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={`url(#${isDark ? 'settingsDarkGlow' : 'settingsLightGlow'})`}
            />
          </Svg>
        </View>

        <SafeAreaView edges={['top', 'left', 'right']}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitleText, { color: isDark ? '#F8F8FF' : '#FFFFFF' }]}>
              Settings
            </Text>
          </View>
        </SafeAreaView>
      </View>

      {/* MAIN CONTENT SHEET */}
      <View style={[styles.mainContentSheet, { backgroundColor: theme.screenBg }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Restore Success Banner */}
          {restoreSuccessMsg && (
            <View
              style={[
                styles.restoreSuccessBanner,
                {
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
                  borderColor: isDark ? 'rgba(34, 197, 94, 0.35)' : '#86EFAC',
                },
              ]}
            >
              <CheckCircle2 size={18} color="#22C55E" style={{ marginTop: 1, marginRight: 8 }} />
              <Text style={[styles.restoreSuccessText, { color: isDark ? '#86EFAC' : '#15803D' }]}>
                {restoreSuccessMsg}
              </Text>
            </View>
          )}

          {/* Account Scheduled for Deletion Banner (30-day recovery grace period) */}
          {authState.user?.deletion_scheduled_at && (
            <View
              style={[
                styles.deletionBanner,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.32)' : '#FCA5A5',
                },
              ]}
            >
              <View style={styles.deletionBannerTop}>
                <AlertTriangle size={18} color="#EF4444" style={{ marginTop: 2, marginRight: 10, flexShrink: 0 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deletionBannerTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                    Account scheduled for deletion
                  </Text>
                  <Text style={[styles.deletionBannerDesc, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
                    Your account will be permanently deleted on{' '}
                    <Text style={{ fontWeight: '600', color: isDark ? '#FFFFFF' : '#111827' }}>
                      {(() => {
                        try {
                          const d = new Date(authState.user.deletion_scheduled_at);
                          return isNaN(d.getTime())
                            ? 'the scheduled date'
                            : d.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              });
                        } catch {
                          return 'the scheduled date';
                        }
                      })()}
                    </Text>
                    . You can cancel before this date to restore your account.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cancelDeletionBtn}
                activeOpacity={0.8}
                disabled={isCancellingDeletion}
                onPress={handleCancelDeletion}
              >
                {isCancellingDeletion ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.cancelDeletionBtnText}>Cancel Deletion & Restore</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================== */}
          {/* 1. ACCOUNT SECTION (All inside our app card)                   */}
          {/* ============================================================== */}
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>ACCOUNT</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            {/* User Profile Info */}
            <View style={styles.userProfileRow}>
              <View style={styles.avatarCircle}>
                {authState.user?.avatar_url ? (
                  <Image
                    source={{ uri: authState.user.avatar_url }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={theme.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarFallback}
                  >
                    <Text style={styles.avatarInitialText}>{userInitial}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.userInfoCol}>
                <Text style={[styles.userNameText, { color: theme.textPrimary }]}>{userName}</Text>
                <Text style={[styles.userEmailText, { color: theme.textSecondary }]}>{userEmail}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.divider }]} />

            {/* Edit Profile Menu Row */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => router.push('/edit-profile')}
            >
              <User size={20} color={theme.icon} />
              <Text style={[styles.menuRowText, { color: theme.textPrimary }]}>Edit profile</Text>
              <ChevronRight size={18} color={theme.iconMuted} />
            </TouchableOpacity>
          </View>

          {/* ============================================================== */}
          {/* 2. WORKSPACE SECTION (App Card)                                */}
          {/* ============================================================== */}
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>WORKSPACE</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            <View style={styles.workspaceCardRow}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: theme.iconCircleBg,
                    borderColor: theme.iconCircleBorder,
                  },
                ]}
              >
                <Briefcase size={20} color={theme.icon} />
              </View>
              <View style={styles.workspaceTextCol}>
                <Text style={[styles.workspaceNameTitle, { color: theme.textPrimary }]}>
                  {workspaceName}
                </Text>
                <Text style={[styles.workspaceSubtext, { color: theme.textSecondary }]}>
                  Current active workspace
                </Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: theme.roleBg },
                ]}
              >
                <Text style={[styles.roleBadgeText, { color: theme.roleText }]}>
                  {userRole}
                </Text>
              </View>
            </View>
          </View>

          {/* ============================================================== */}
          {/* 3. APPEARANCE SECTION (App Card)                               */}
          {/* ============================================================== */}
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>APPEARANCE</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            <View style={styles.appearanceCardHeader}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: theme.iconCircleBg,
                    borderColor: theme.iconCircleBorder,
                  },
                ]}
              >
                <Palette size={20} color={theme.icon} />
              </View>
              <View style={styles.appearanceTextCol}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Theme mode</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                  Choose your interface appearance
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.segmentedContainer,
                {
                  backgroundColor: theme.segmentedBg,
                  borderColor: theme.segmentedBorder,
                },
              ]}
            >
              {(['System', 'Light', 'Dark'] as const).map((mode: AppearanceMode) => {
                const isActive = themeMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.segmentedTab,
                      isActive && styles.segmentedTabActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setThemeMode(mode)}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={theme.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.segmentedTabGradient}
                      >
                        <Text style={[styles.segmentedTabText, styles.segmentedTabTextActive]}>
                          {mode}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <Text
                        style={[
                          styles.segmentedTabText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {mode}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ============================================================== */}
          {/* 4. NOTIFICATIONS SECTION (App Card)                            */}
          {/* ============================================================== */}
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>NOTIFICATIONS</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            {/* Push Notifications */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                  Push notifications
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                  This device receives pushes from all your workspaces
                </Text>
              </View>
              <Switch
                value={pushNotifications}
                disabled={isPushLoading}
                onValueChange={(val) => {
                  togglePushNotifications(val);
                }}
                trackColor={{
                  false: isDark ? 'rgba(128, 140, 190, 0.25)' : '#D7DEEE',
                  true: theme.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.divider }]} />

            {/* Show Message Preview */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                  Show message preview
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                  Include the message text in push notifications
                </Text>
              </View>
              <Switch
                value={showPreview}
                onValueChange={setShowPreview}
                trackColor={{
                  false: isDark ? 'rgba(128, 140, 190, 0.25)' : '#D7DEEE',
                  true: theme.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.divider }]} />

            {/* Mute Pushes */}
            <View style={styles.muteSection}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Mute pushes</Text>
              <View style={styles.muteButtonsRow}>
                {(['Off', '1h', '8h', '24h'] as const).map((duration) => {
                  const isActive = mutePushes === duration;
                  return (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.muteBtn,
                        {
                          backgroundColor: isActive ? 'transparent' : theme.btnSecondaryBg,
                          borderColor: isActive ? 'transparent' : theme.btnSecondaryBorder,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setMuteDuration(duration)}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={theme.primaryGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.muteBtnGradient}
                        >
                          <Text style={[styles.muteBtnText, styles.muteBtnTextActive]}>
                            {duration}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <Text
                          style={[
                            styles.muteBtnText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {duration}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ============================================================== */}
          {/* 5. SECURITY & DEVICES (App Card)                               */}
          {/* ============================================================== */}
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>SECURITY & DEVICES</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            {/* Biometric app lock */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                  Biometric app lock
                </Text>
                <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                  Require Face ID or fingerprint when opening the app.
                </Text>
              </View>
              <Switch
                value={biometricLock}
                onValueChange={handleToggleBiometricLock}
                trackColor={{
                  false: isDark ? 'rgba(128, 140, 190, 0.25)' : '#D7DEEE',
                  true: theme.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.divider }]} />

            {/* Logged-in devices */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => router.push('/logged-in-devices')}
            >
              <Smartphone size={20} color={theme.icon} />
              <Text style={[styles.menuRowText, { color: theme.textPrimary }]}>Logged-in devices</Text>
              <ChevronRight size={18} color={theme.iconMuted} />
            </TouchableOpacity>
          </View>

          {/* ============================================================== */}
          {/* 6. INTEGRATIONS (App Card)                                     */}
          {/* ============================================================== */}
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>INTEGRATIONS</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => router.push('/connected-channels')}
            >
              <GitBranch size={20} color={theme.icon} />
              <Text style={[styles.menuRowText, { color: theme.textPrimary }]}>Connected channels</Text>
              <ChevronRight size={18} color={theme.iconMuted} />
            </TouchableOpacity>
          </View>

          {/* ============================================================== */}
          {/* 7. ACCOUNT ACTIONS (Sign out & Delete account)                 */}
          {/* ============================================================== */}
          <TouchableOpacity
            style={[
              styles.signOutBtn,
              {
                backgroundColor: theme.btnSecondaryBg,
                borderColor: theme.btnSecondaryBorder,
                opacity: isSigningOut ? 0.6 : 1,
              },
            ]}
            activeOpacity={0.8}
            disabled={isSigningOut}
            onPress={handleSignOut}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.signOutBtnText, { color: theme.btnSecondaryText }]}>
                Sign out
              </Text>
            )}
          </TouchableOpacity>

          {/* Delete account Button */}
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            activeOpacity={0.8}
            disabled={isSigningOut}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteAccountBtnText}>Delete account</Text>
          </TouchableOpacity>

          {/* App Version & Environment Footer */}
          <Text style={[styles.versionFooterText, { color: theme.textMuted }]}>
            {`OrbionAgent TeamBox ${Constants.expoConfig?.version || (Constants as any)?.manifest?.version || '1.0.0'} · ${typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production'}`}
          </Text>
        </ScrollView>
      </View>
      {/* Sign Out Confirmation Modal (Matching Delete Account bottom-sheet card UI) */}
      <Modal
        visible={!!confirmModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => {
          if (!isSigningOut) setConfirmModal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isSigningOut) setConfirmModal(null);
            }}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.modalBg,
                borderColor: theme.modalBorder,
                paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 32),
              },
            ]}
          >
            {/* Modal Header Row: Title & Close Button */}
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>
                {confirmModal?.title || 'Sign out'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.modalCloseCircle,
                  { backgroundColor: theme.modalCloseCircleBg },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (!isSigningOut) setConfirmModal(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color={isDark ? '#FFFFFF' : '#1D2939'} />
              </TouchableOpacity>
            </View>

            {/* Illustration Badge: Soft Coral Circle with Red LogOut Icon */}
            <View style={styles.illustrationWrapper}>
              <View
                style={[
                  styles.iconCircleBadge,
                  { backgroundColor: theme.modalIconBg },
                ]}
              >
                <LogOut size={36} color="#F04438" strokeWidth={2.2} />
              </View>
            </View>

            {/* Confirmation Headline */}
            <Text style={[styles.confirmationTitle, { color: theme.textPrimary }]}>
              Are you sure you want to sign out?
            </Text>

            {/* Confirmation Subtitle */}
            <Text style={[styles.confirmationSubtitle, { color: theme.textSecondary }]}>
              {confirmModal?.message ||
                'You will need to log in again to access your workspace conversations.'}
            </Text>

            {/* Actions Row: Cancel & Sign Out Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: theme.modalCancelBtnBg },
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (!isSigningOut) setConfirmModal(null);
                }}
                disabled={isSigningOut}
              >
                <Text style={[styles.modalCancelText, { color: isDark ? '#FFFFFF' : '#344054' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: '#F04438' },
                ]}
                activeOpacity={0.8}
                onPress={handleConfirmAction}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {confirmModal?.confirmText || 'Sign out'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: scaleContainer(22),
    position: 'relative',
    overflow: 'hidden',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 2,
  },
  headerTitleText: {
    fontSize: scaleFont(28),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  mainContentSheet: {
    flex: 1,
    borderTopLeftRadius: scaleContainer(32),
    borderTopRightRadius: scaleContainer(32),
    marginTop: -10,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  sectionHeader: {
    fontSize: scaleFont(12),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    paddingLeft: 4,
  },

  // Consistent App Card used for ALL sections
  card: {
    borderRadius: scaleContainer(20),
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },

  // 1. Account Section Styles
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  avatarCircle: {
    width: 48,
    height: scaleHeight(48),
    borderRadius: scaleContainer(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  userInfoCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: scaleFont(16),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  userEmailText: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    marginTop: 2,
  },

  // 2. Workspace Card Styles
  workspaceCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: scaleContainer(20),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  workspaceTextCol: {
    flex: 1,
  },
  workspaceNameTitle: {
    fontSize: scaleFont(15.5),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  workspaceSubtext: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: 12,
    paddingVertical: 4.5,
    paddingHorizontal: 10,
  },
  roleBadgeText: {
    fontSize: scaleFont(11.5),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },

  // 3. Appearance Card Styles
  appearanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  appearanceTextCol: {
    flex: 1,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    gap: 6,
  },
  segmentedTab: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  segmentedTabActive: {
    borderRadius: 8,
  },
  segmentedTabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentedTabText: {
    fontSize: scaleFont(13.5),
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },

  // 4. Notifications & Switches
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  rowTitle: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    marginTop: 3,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  muteSection: {
    paddingTop: 2,
  },
  muteButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  muteBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  muteBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  muteBtnText: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  muteBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },

  // Menu Rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  menuRowText: {
    flex: 1,
    fontSize: scaleFont(14.5),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    marginLeft: 14,
  },

  // Action Buttons
  signOutBtn: {
    height: scaleHeight(48),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 1,
  },
  signOutBtnText: {
    fontSize: scaleFont(15),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  deleteAccountBtn: {
    height: scaleHeight(48),
    borderRadius: 999,
    backgroundColor: '#FF6452',
    borderWidth: 1,
    borderColor: '#FF6452',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#FF6452',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteAccountBtnText: {
    color: '#FFFFFF',
    fontSize: scaleFont(14.5),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  versionFooterText: {
    fontSize: scaleFont(12),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
  },

  // Confirmation Bottom Sheet Modal Styles (Matching Delete Account confirmation)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    margin: 0,
    padding: 0,
  },
  modalSheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 18,
    margin: 0,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: scaleFont(16),
    fontFamily: Fonts.medium,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconCircleBadge: {
    width: scaleHeight(82),
    height: scaleHeight(82),
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationTitle: {
    fontSize: scaleFont(17.5),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  confirmationSubtitle: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18.5,
    paddingHorizontal: 12,
    marginBottom: 22,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: scaleHeight(48),
    borderRadius: scaleContainer(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.medium,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    height: scaleHeight(48),
    borderRadius: scaleContainer(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deletionBanner: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  deletionBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deletionBannerTitle: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginBottom: 2,
  },
  deletionBannerDesc: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  cancelDeletionBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  cancelDeletionBtnText: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  restoreSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  restoreSuccessText: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    flex: 1,
  },
});

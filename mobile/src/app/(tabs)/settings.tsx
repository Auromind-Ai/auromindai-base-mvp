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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
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
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react-native';
import { authStore, useAuth } from '@/store/auth';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';
import { AppearanceMode } from '@/types/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const authState = useAuth();
  const { themeMode, setThemeMode, isDark } = useAppTheme();

  // Settings State
  const [biometricLock, setBiometricLock] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [mutePushes, setMutePushes] = useState<'Off' | '1h' | '8h' | '24h'>('Off');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'sign_out' | 'delete_account';
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
    authStore.refreshUser();
    authStore.refreshWorkspaces();
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
    icon: isDark ? '#A2ADD8' : '#6F51D1',
    iconMuted: isDark ? 'rgba(162, 173, 216, 0.50)' : 'rgba(117, 131, 165, 0.50)',
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
  };

  const performSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authStore.signOut();
      router.replace('/(auth)/login');
    } catch {
      await authStore.clearAuth();
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
        'Are you sure you want to sign out? You will need to log in again to access your workspace conversations.',
      confirmText: 'Sign out',
      isDestructive: false,
    });
  };

  const handleDeleteAccount = () => {
    if (isSigningOut) return;
    setConfirmModal({
      type: 'delete_account',
      title: 'Delete account',
      message:
        'Are you sure you want to delete your account? All your workspace conversations, settings, and personal data will be permanently removed. This action cannot be undone.',
      confirmText: 'Delete account',
      isDestructive: true,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const actionType = confirmModal.type;
    setConfirmModal(null);
    if (actionType === 'sign_out') {
      performSignOut();
    } else if (actionType === 'delete_account') {
      setIsSigningOut(true);
      try {
        await authStore.signOut();
        router.replace('/(auth)/login');
      } catch {
        await authStore.clearAuth();
        router.replace('/(auth)/login');
      } finally {
        setIsSigningOut(false);
      }
    }
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
                    contentFit="cover"
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
                  { backgroundColor: isDark ? 'rgba(118, 85, 240, 0.16)' : 'rgba(128, 96, 232, 0.12)' },
                ]}
              >
                <Briefcase size={20} color={theme.primary} />
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
                  { backgroundColor: isDark ? 'rgba(118, 85, 240, 0.16)' : 'rgba(128, 96, 232, 0.12)' },
                ]}
              >
                <Palette size={20} color={theme.primary} />
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
                onValueChange={setPushNotifications}
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
                      onPress={() => setMutePushes(duration)}
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
                onValueChange={setBiometricLock}
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

          {/* Production Footer Note */}
          <Text style={[styles.versionFooterText, { color: theme.textMuted }]}>
            OrbionAgent TeamBox 0.5.0 · production
          </Text>
        </ScrollView>
      </View>
      {/* Custom Confirmation Modal (No native Alert) */}
      <Modal
        visible={!!confirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setConfirmModal(null)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconBox,
                    {
                      backgroundColor:
                        confirmModal?.type === 'delete_account'
                          ? isDark
                            ? 'rgba(244, 63, 94, 0.16)'
                            : 'rgba(244, 63, 94, 0.12)'
                          : isDark
                          ? 'rgba(255, 23, 68, 0.14)'
                          : 'rgba(255, 23, 68, 0.1)',
                    },
                  ]}
                >
                  {confirmModal?.type === 'delete_account' ? (
                    <Trash2 size={22} color="#F43F5E" />
                  ) : (
                    <LogOut size={22} color="#FF1744" />
                  )}
                </View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {confirmModal?.title}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalCloseBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setConfirmModal(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                {confirmModal?.message}
              </Text>

              {confirmModal?.isDestructive && (
                <View
                  style={[
                    styles.warningBox,
                    {
                      backgroundColor: isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.06)',
                      borderColor: isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.2)',
                    },
                  ]}
                >
                  <AlertTriangle size={15} color="#F43F5E" style={{ marginTop: 2, flexShrink: 0 }} />
                  <Text style={[styles.warningText, { color: isDark ? '#FDA4AF' : '#E11D48' }]}>
                    Permanent Action: This cannot be reversed.
                  </Text>
                </View>
              )}
            </View>

            {/* Modal Actions */}
            <View
              style={[
                styles.modalActions,
                { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setConfirmModal(null)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor:
                      confirmModal?.type === 'delete_account' ? '#E11D48' : '#FF1744',
                  },
                ]}
                activeOpacity={0.8}
                onPress={handleConfirmAction}
              >
                <Text style={styles.modalConfirmText}>{confirmModal?.confirmText}</Text>
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
    paddingBottom: 22,
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
    fontSize: 28,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  mainContentSheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -10,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    paddingLeft: 4,
  },

  // Consistent App Card used for ALL sections
  card: {
    borderRadius: 20,
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
    height: 48,
    borderRadius: 24,
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
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  userInfoCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  userEmailText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  workspaceTextCol: {
    flex: 1,
  },
  workspaceNameTitle: {
    fontSize: 15.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  workspaceSubtext: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: 12,
    paddingVertical: 4.5,
    paddingHorizontal: 10,
  },
  roleBadgeText: {
    fontSize: 11.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
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
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
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
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
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
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  muteBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },

  // Menu Rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  menuRowText: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginLeft: 14,
  },

  // Action Buttons
  signOutBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 1,
  },
  signOutBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  deleteAccountBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  versionFooterText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
  },

  // Custom Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 12,
  },
  modalDesc: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

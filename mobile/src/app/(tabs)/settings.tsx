import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  User,
  GitBranch,
  Smartphone,
  ChevronRight,
} from 'lucide-react-native';
import { authStore, useAuth } from '@/store/auth';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';
import { AppearanceMode } from '@/types/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const authState = useAuth();
  const { themeMode, setThemeMode, colors, isDark, statusBarStyle } = useAppTheme();

  // Settings State
  const [biometricLock, setBiometricLock] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [mutePushes, setMutePushes] = useState<'Off' | '1h' | '8h' | '24h'>('Off');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const workspaceName = authState.selectedWorkspace?.name || 'groww digitale';
  const userName = authState.user?.full_name || 'Groww Digital';
  const userEmail = authState.user?.email || 'growwdigital@gmail.com';
  const userInitial = (userName.trim()[0] || 'G').toUpperCase();

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

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to sign out?')
          : true;
      if (confirmed) {
        performSignOut();
      }
    } else {
      Alert.alert(
        'Sign out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign out',
            style: 'destructive',
            onPress: performSignOut,
          },
        ]
      );
    }
  };

  const handleDeleteAccount = () => {
    const executeDelete = async () => {
      try {
        await authStore.signOut();
        router.replace('/(auth)/login');
      } catch {
        await authStore.clearAuth();
        router.replace('/(auth)/login');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm(
              'Are you sure you want to delete your account? This action cannot be undone.'
            )
          : true;
      if (confirmed) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete account',
        'Are you sure you want to delete your account? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: executeDelete,
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} />

      {/* Screen Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* APPEARANCE SECTION */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View
          style={[
            styles.segmentedContainer,
            {
              backgroundColor: colors.segmentedBg,
              borderColor: colors.segmentedBorder,
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
                  isActive && [
                    styles.segmentedTabActive,
                    { backgroundColor: colors.segmentedActiveTab },
                  ],
                ]}
                activeOpacity={0.8}
                onPress={() => setThemeMode(mode)}
              >
                <Text
                  style={[
                    styles.segmentedTabText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                    isActive && styles.segmentedTabTextActive,
                  ]}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SECURITY SECTION */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>SECURITY</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Biometric app lock
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                Require Face ID or fingerprint when opening the app.
              </Text>
            </View>
            <Switch
              value={biometricLock}
              onValueChange={setBiometricLock}
              trackColor={{
                false: isDark ? '#2D2B3D' : '#E5E7EB',
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* NOTIFICATIONS SECTION */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>NOTIFICATIONS</Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {/* Push Notifications */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Push notifications
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                This device receives pushes from all your workspaces
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{
                false: isDark ? '#2D2B3D' : '#E5E7EB',
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Show Message Preview */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Show message preview
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                Include the message text in push notifications
              </Text>
            </View>
            <Switch
              value={showPreview}
              onValueChange={setShowPreview}
              trackColor={{
                false: isDark ? '#2D2B3D' : '#E5E7EB',
                true: colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Mute Pushes */}
          <View style={styles.muteSection}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Mute pushes</Text>
            <View style={styles.muteButtonsRow}>
              {(['Off', '1h', '8h', '24h'] as const).map((duration) => {
                const isActive = mutePushes === duration;
                return (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.muteBtn,
                      {
                        backgroundColor: colors.btnSecondaryBg,
                        borderColor: colors.btnSecondaryBorder,
                      },
                      isActive && [
                        styles.muteBtnActive,
                        {
                          borderColor: colors.primary,
                          backgroundColor: isDark
                            ? 'rgba(139, 92, 246, 0.15)'
                            : 'rgba(139, 92, 246, 0.12)',
                        },
                      ],
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setMutePushes(duration)}
                  >
                    <Text
                      style={[
                        styles.muteBtnText,
                        { color: colors.textSecondary },
                        isActive && [
                          styles.muteBtnTextActive,
                          { color: colors.primary },
                        ],
                      ]}
                    >
                      {duration}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* WORKSPACE SECTION */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>WORKSPACE</Text>
        <Text style={[styles.workspaceValue, { color: colors.textPrimary }]}>{workspaceName}</Text>

        {/* ACCOUNT SECTION */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ACCOUNT</Text>
        
        {/* User Profile Card */}
        <View style={styles.userProfileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitialText}>{userInitial}</Text>
          </View>
          <View style={styles.userInfoCol}>
            <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{userName}</Text>
            <Text style={[styles.userEmailText, { color: colors.textMuted }]}>{userEmail}</Text>
          </View>
        </View>

        {/* Account Menu Card */}
        <View
          style={[
            styles.accountCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <User size={20} color={colors.icon} />
            <Text style={[styles.menuRowText, { color: colors.textPrimary }]}>Edit profile</Text>
            <ChevronRight size={18} color={colors.iconMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Connected channels */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <GitBranch size={20} color={colors.icon} />
            <Text style={[styles.menuRowText, { color: colors.textPrimary }]}>Connected channels</Text>
            <ChevronRight size={18} color={colors.iconMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* Logged-in devices */}
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <Smartphone size={20} color={colors.icon} />
            <Text style={[styles.menuRowText, { color: colors.textPrimary }]}>Logged-in devices</Text>
            <ChevronRight size={18} color={colors.iconMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign out Button */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: colors.btnSecondaryBg,
              borderColor: colors.btnSecondaryBorder,
              opacity: isSigningOut ? 0.6 : 1,
            },
          ]}
          activeOpacity={0.8}
          disabled={isSigningOut}
          onPress={handleSignOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.signOutBtnText, { color: colors.btnSecondaryText }]}>
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
        <Text style={[styles.versionFooterText, { color: colors.textMuted }]}>
          OrbionAgent TeamBox 0.5.0 · production
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  sectionHeader: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 8,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    gap: 6,
  },
  segmentedTab: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentedTabActive: {
    backgroundColor: '#8B5CF6',
  },
  segmentedTabText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
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
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 4,
    lineHeight: 18,
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
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  muteBtnActive: {
    borderWidth: 1.5,
  },
  muteBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  muteBtnTextActive: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  workspaceValue: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginTop: 2,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F766E', // Green badge
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  userInfoCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 16.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  userEmailText: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  accountCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuRowText: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginLeft: 14,
  },
  signOutBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    borderWidth: 1,
  },
  signOutBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#DC2626',
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
    marginTop: 22,
    marginBottom: 20,
  },
});

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  LogOut,
  ShieldCheck,
  Globe,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth, authStore } from '@/store/auth';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';
import {
  fetchUserSessions,
  revokeDeviceSessions,
  revokeOtherSessions,
  UserSessionItem,
} from '@/api/devices';

export function parseDeviceDetails(deviceInfo: string = '') {
  const raw = (deviceInfo || '').toLowerCase();

  let browser = 'Web Browser';
  let os = 'Unknown OS';
  let deviceType: 'Mobile' | 'Tablet' | 'Laptop' | 'Desktop' = 'Desktop';
  let deviceLabel = 'Connected Device';

  if (deviceInfo.includes(' on ')) {
    const parts = deviceInfo.split(' on ');
    browser = parts[0]?.trim() || 'Web Browser';
    os = parts[1]?.trim() || 'Unknown OS';
  } else {
    // OS detection
    if (raw.includes('windows')) os = 'Windows';
    else if (raw.includes('macintosh') || raw.includes('mac os') || raw.includes('macos')) os = 'macOS';
    else if (raw.includes('iphone')) os = 'iOS';
    else if (raw.includes('ipad')) os = 'iPadOS';
    else if (raw.includes('android')) os = 'Android';
    else if (raw.includes('linux')) os = 'Linux';
    else if (raw.includes('cros')) os = 'Chrome OS';

    // Browser detection
    if (raw.includes('edg/') || raw.includes('edg')) browser = 'Microsoft Edge';
    else if (raw.includes('opr/') || raw.includes('opera')) browser = 'Opera';
    else if (raw.includes('chrome') && !raw.includes('edg') && !raw.includes('opr')) browser = 'Chrome';
    else if (raw.includes('safari') && !raw.includes('chrome')) browser = 'Safari';
    else if (raw.includes('firefox')) browser = 'Firefox';
  }

  // Device Type & Clean Label
  const osLower = os.toLowerCase();
  const rawLower = raw.toLowerCase();
  if (
    osLower.includes('ios') ||
    osLower.includes('android') ||
    rawLower.includes('iphone') ||
    rawLower.includes('mobile') ||
    rawLower.includes('phone')
  ) {
    deviceType = 'Mobile';
    deviceLabel =
      osLower.includes('ios') || rawLower.includes('iphone')
        ? 'iPhone'
        : osLower.includes('android')
        ? 'Android Phone'
        : 'Mobile Phone';
  } else if (osLower.includes('ipad') || rawLower.includes('ipad') || rawLower.includes('tablet')) {
    deviceType = 'Tablet';
    deviceLabel = 'iPad / Tablet';
  } else if (osLower.includes('macos') || rawLower.includes('macintosh') || rawLower.includes('mac os')) {
    deviceType = 'Laptop';
    deviceLabel = 'Mac Device';
  } else if (osLower.includes('windows')) {
    deviceType = 'Desktop';
    deviceLabel = 'Windows PC';
  } else if (osLower.includes('linux')) {
    deviceType = 'Desktop';
    deviceLabel = 'Linux PC';
  } else {
    deviceType = 'Desktop';
    deviceLabel = 'Personal Computer';
  }

  return {
    deviceType,
    browser,
    os,
    deviceLabel,
  };
}

function formatLastActive(dateStr?: string, isCurrent?: boolean) {
  if (isCurrent) return 'Active now';
  if (!dateStr) return 'Recently active';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Active just now';
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffDays === 1) return `Active yesterday`;
    if (diffDays < 7) return `Active ${diffDays}d ago`;
    return `Last active ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  } catch {
    return 'Recently active';
  }
}

function DeviceIconView({
  type,
  size = 22,
  color,
}: {
  type: 'Mobile' | 'Tablet' | 'Laptop' | 'Desktop';
  size?: number;
  color: string;
}) {
  switch (type) {
    case 'Mobile':
      return <Smartphone size={size} color={color} />;
    case 'Tablet':
      return <Tablet size={size} color={color} />;
    case 'Laptop':
      return <Laptop size={size} color={color} />;
    case 'Desktop':
    default:
      return <Monitor size={size} color={color} />;
  }
}

export default function LoggedInDevicesScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const theme = {
    screenBg: isDark ? '#0A1023' : '#EEEEF5',
    cardBg: isDark ? '#202941' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(164, 170, 255, 0.07)' : 'rgba(255, 255, 255, 0.95)',
    cardShadow: isDark ? '#000000' : '#2F2B5A',
    textPrimary: isDark ? '#FFFFFF' : '#1A2138',
    textSecondary: isDark ? '#A2ADD8' : '#7583A5',
    textMuted: isDark ? '#A2ADD8' : '#7583A5',
    primary: isDark ? '#7655F0' : '#8060E8',
    iconCircleBg: isDark ? 'rgba(118, 85, 240, 0.16)' : 'rgba(128, 96, 232, 0.12)',
    iconColor: isDark ? '#A69BFF' : '#7655F0',
    currentBadgeBg: isDark ? '#1E3A2F' : '#DCFCE7',
    currentBadgeBorder: isDark ? '#1E3A2F' : '#A7F3D0',
    currentBadgeText: isDark ? '#34D399' : '#059669',
    currentActiveDot: isDark ? '#34D399' : '#10B981',
    revokeBtnBg: isDark ? '#11131C' : '#FFF0F2',
    revokeBtnBorder: '#FF1744',
    revokeBtnText: '#FF1744',
    tipBannerBg: isDark ? '#151D36' : 'rgba(255, 255, 255, 0.75)',
    tipBannerBorder: isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(215, 222, 238, 0.85)',
  };

  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Custom App Modal State (No native alerts)
  const [confirmModal, setConfirmModal] = useState<{
    type: 'revoke_one' | 'revoke_others' | 'revoke_current';
    title: string;
    message: string;
    confirmText: string;
    deviceKey?: string;
    deviceName?: string;
  } | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchUserSessions();
      setSessions(data || []);
    } catch {
      // Graceful fallback if backend session list fails
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  // Group active sessions by device_info
  const activeSessions = useMemo(() => sessions.filter((s) => !s.is_blocked), [sessions]);

  const connectedDevices = useMemo(() => {
    const groups: Record<
      string,
      {
        deviceKey: string;
        deviceName: string;
        browser: string;
        os: string;
        deviceType: 'Mobile' | 'Tablet' | 'Laptop' | 'Desktop';
        sessions: UserSessionItem[];
        hasCurrent: boolean;
        lastActive: string;
        primaryIp: string;
        location: string | null;
      }
    > = {};

    for (const session of activeSessions) {
      const devKey = session.device_info || 'Unknown Device';
      if (!groups[devKey]) {
        const parsed = parseDeviceDetails(devKey);
        groups[devKey] = {
          deviceKey: devKey,
          deviceName: parsed.deviceLabel,
          browser: parsed.browser,
          os: parsed.os,
          deviceType: parsed.deviceType,
          sessions: [],
          hasCurrent: false,
          lastActive: session.last_activity_at || session.created_at,
          primaryIp: session.ip_address || 'Unknown IP',
          location: session.location || null,
        };
      }
      groups[devKey].sessions.push(session);
      if (session.is_current) {
        groups[devKey].hasCurrent = true;
      }
      if (
        new Date(session.last_activity_at || session.created_at).getTime() >
        new Date(groups[devKey].lastActive).getTime()
      ) {
        groups[devKey].lastActive = session.last_activity_at || session.created_at;
        if (session.ip_address) groups[devKey].primaryIp = session.ip_address;
        if (session.location) groups[devKey].location = session.location;
      }
    }

    return Object.values(groups).sort((a, b) => {
      if (a.hasCurrent && !b.hasCurrent) return -1;
      if (!a.hasCurrent && b.hasCurrent) return 1;
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
    });
  }, [activeSessions]);

  const currentDevice = useMemo(() => {
    return connectedDevices.find((d) => d.hasCurrent) || connectedDevices[0] || null;
  }, [connectedDevices]);

  const otherDevices = useMemo(() => {
    return connectedDevices.filter((d) => d !== currentDevice);
  }, [connectedDevices, currentDevice]);

  // Revoke a specific device
  const handleRevokeDevice = (deviceKey: string, displayName: string, isCurrent: boolean) => {
    if (isCurrent) {
      setConfirmModal({
        type: 'revoke_current',
        title: 'Sign out of this device',
        message: 'Are you sure you want to sign out? Your current session on this device will end immediately.',
        confirmText: 'Sign Out',
      });
      return;
    }

    setConfirmModal({
      type: 'revoke_one',
      title: 'Remove Device',
      message: `Are you sure you want to sign out and disconnect "${displayName}"?`,
      confirmText: 'Sign Out Device',
      deviceKey,
      deviceName: displayName,
    });
  };

  // Revoke all other sessions
  const handleRevokeOthers = () => {
    if (otherDevices.length === 0) return;
    setConfirmModal({
      type: 'revoke_others',
      title: 'Sign out all other devices',
      message: `Are you sure you want to log out of all ${otherDevices.length} other device(s)? This device will remain logged in.`,
      confirmText: 'Sign Out Others',
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { type, deviceKey } = confirmModal;
    setConfirmModal(null);

    if (type === 'revoke_current') {
      try {
        setActionLoading('current');
        if (deviceKey) await revokeDeviceSessions(deviceKey);
      } catch {
        // Ignore error
      } finally {
        await authStore.signOut();
        router.replace('/(auth)/login');
      }
    } else if (type === 'revoke_one' && deviceKey) {
      try {
        setActionLoading(deviceKey);
        await revokeDeviceSessions(deviceKey);
        await loadSessions();
      } catch {
        // Failed
      } finally {
        setActionLoading(null);
      }
    } else if (type === 'revoke_others') {
      try {
        setActionLoading('all_others');
        await revokeOtherSessions();
        await loadSessions();
      } catch {
        // Failed
      } finally {
        setActionLoading(null);
      }
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.screenBg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Clean Top Header (No Violet Gradient) */}
      <View style={[styles.header, { backgroundColor: theme.screenBg }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark
                ? 'rgba(128, 140, 190, 0.12)'
                : 'rgba(255, 255, 255, 0.85)',
            },
          ]}
          activeOpacity={0.7}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Logged-in devices
        </Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
          Review devices and browsers that currently have access to your account.
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading connected devices...
            </Text>
          </View>
        ) : (
          <>
            {/* CURRENT DEVICE CARD */}
            {currentDevice && (
              <>
                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
                  THIS DEVICE
                </Text>
                <View
                  style={[
                    styles.deviceCard,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                      shadowColor: theme.cardShadow,
                    },
                  ]}
                >
                  <View style={styles.deviceCardTop}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: theme.iconCircleBg },
                      ]}
                    >
                      <DeviceIconView
                        type={currentDevice.deviceType}
                        size={22}
                        color={theme.iconColor}
                      />
                    </View>

                    <View style={styles.deviceMetaCol}>
                      <View style={styles.deviceTitleRow}>
                        <Text
                          style={[styles.deviceName, { color: theme.textPrimary }]}
                          numberOfLines={1}
                        >
                          {currentDevice.deviceName}
                        </Text>
                        <View
                          style={[
                            styles.currentBadge,
                            {
                              backgroundColor: theme.currentBadgeBg,
                              borderColor: theme.currentBadgeBorder,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.activeDot,
                              { backgroundColor: theme.currentActiveDot },
                            ]}
                          />
                          <Text
                            style={[
                              styles.currentBadgeText,
                              { color: theme.currentBadgeText },
                            ]}
                          >
                            Active now
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[styles.deviceBrowserText, { color: theme.textSecondary }]}
                      >
                        {currentDevice.browser} • {currentDevice.os}
                      </Text>

                      <View style={styles.infoPillsRow}>
                        <View style={styles.infoPillItem}>
                          <Globe size={13} color={theme.textMuted} />
                          <Text style={[styles.infoPillText, { color: theme.textMuted }]}>
                            {currentDevice.primaryIp}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* OTHER CONNECTED DEVICES */}
            <View style={styles.otherDevicesSectionHeader}>
              <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>
                OTHER DEVICES ({otherDevices.length})
              </Text>

              {otherDevices.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRevokeOthers}
                  disabled={actionLoading === 'all_others'}
                >
                  <Text style={[styles.signOutAllText, { color: theme.primary }]}>
                    {actionLoading === 'all_others'
                      ? 'Signing out...'
                      : 'Sign out all others'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {otherDevices.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                    shadowColor: theme.cardShadow,
                  },
                ]}
              >
                <ShieldCheck size={36} color={theme.iconColor} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  No other active devices
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  You are only signed in on this current device.
                </Text>
              </View>
            ) : (
              <View style={styles.devicesList}>
                {otherDevices.map((dev) => {
                  const isActionLoading = actionLoading === dev.deviceKey;
                  return (
                    <View
                      key={dev.deviceKey}
                      style={[
                        styles.deviceCard,
                        {
                          backgroundColor: theme.cardBg,
                          borderColor: theme.cardBorder,
                          shadowColor: theme.cardShadow,
                        },
                      ]}
                    >
                      <View style={styles.deviceCardTop}>
                        <View
                          style={[
                            styles.iconCircle,
                            { backgroundColor: theme.iconCircleBg },
                          ]}
                        >
                          <DeviceIconView
                            type={dev.deviceType}
                            size={22}
                            color={theme.iconColor}
                          />
                        </View>

                        <View style={styles.deviceMetaCol}>
                          <Text
                            style={[styles.deviceName, { color: theme.textPrimary }]}
                            numberOfLines={1}
                          >
                            {dev.deviceName}
                          </Text>

                          <Text
                            style={[
                              styles.deviceBrowserText,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {dev.browser} • {dev.os}
                          </Text>

                          <View style={styles.infoPillsRow}>
                            <View style={styles.infoPillItem}>
                              <Globe size={13} color={theme.textMuted} />
                              <Text
                                style={[styles.infoPillText, { color: theme.textMuted }]}
                              >
                                {dev.primaryIp}
                              </Text>
                            </View>
                            <View style={styles.infoPillItem}>
                              <Clock size={13} color={theme.textMuted} />
                              <Text
                                style={[styles.infoPillText, { color: theme.textMuted }]}
                              >
                                {formatLastActive(dev.lastActive, false)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Remove / Sign out button */}
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={[
                            styles.revokeBtn,
                            {
                              backgroundColor: theme.revokeBtnBg,
                              borderColor: theme.revokeBtnBorder,
                            },
                          ]}
                          activeOpacity={0.75}
                          disabled={isActionLoading}
                          onPress={() =>
                            handleRevokeDevice(dev.deviceKey, dev.deviceName, false)
                          }
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color={theme.revokeBtnText} />
                          ) : (
                            <>
                              <LogOut size={14} color={theme.revokeBtnText} />
                              <Text
                                style={[
                                  styles.revokeBtnText,
                                  { color: theme.revokeBtnText },
                                ]}
                              >
                                Sign out device
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* SECURITY TIP BANNER */}
            <View
              style={[
                styles.tipBanner,
                {
                  backgroundColor: theme.tipBannerBg,
                  borderColor: theme.tipBannerBorder,
                },
              ]}
            >
              <ShieldCheck
                size={18}
                color={theme.iconColor}
                style={styles.tipIcon}
              />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                If you notice an unrecognized browser or device, disconnect it immediately
                and change your account password or verify your phone security.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

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
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 23, 68, 0.14)'
                        : 'rgba(255, 23, 68, 0.1)',
                    },
                  ]}
                >
                  <LogOut size={22} color="#FF1744" />
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

            {/* Body */}
            <View style={styles.modalBody}>
              <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                {confirmModal?.message}
              </Text>
            </View>

            {/* Actions */}
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
                    backgroundColor: '#FF1744',
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  sectionHeader: {
    fontSize: 11.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  otherDevicesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 6,
  },
  signOutAllText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  devicesList: {
    gap: 12,
  },
  deviceCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  deviceCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceMetaCol: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  deviceName: {
    fontSize: 15.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    gap: 5.5,
  },
  activeDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  currentBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  deviceBrowserText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginBottom: 8,
  },
  infoPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoPillText: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
  },
  cardActionRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(162, 173, 216, 0.08)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  revokeBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  tipIcon: {
    flexShrink: 0,
  },
  tipText: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    flex: 1,
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
    fontSize: 16.5,
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

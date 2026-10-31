import React, { useState, useEffect, useCallback } from 'react';
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
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Info,
  Copy,
  Check,
  X,
  Globe,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/store/auth';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';
import { fetchChannelsStatus, WorkspaceChannelsStatus } from '@/api/channels';

// Channel SVGs
function WhatsAppIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="11" fill="#25D366" />
      <Path
        d="M17.2 13.8c-.28-.14-1.63-.8-1.88-.9-.25-.1-.43-.14-.62.14-.19.28-.72.9-.88 1.09-.16.19-.31.21-.59.07-.28-.14-1.18-.43-2.25-1.39-.83-.75-1.4-1.67-1.56-1.95-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.1-.19 0-.38-.05-.52-.05-.14-.62-1.5-.85-2.05-.22-.55-.45-.48-.62-.48h-.53c-.19 0-.5.07-.76.35-.26.29-1 1-1 2.45s1.02 2.85 1.16 3.05c.14.19 2.01 3.2 4.95 4.38.7.28 1.25.45 1.68.58.7.21 1.34.18 1.85.1.57-.09 1.75-.72 2-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.19-.55-.32z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function InstagramIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="igCardGrad" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FA7E1E" />
          <Stop offset="35%" stopColor="#D62976" />
          <Stop offset="65%" stopColor="#962FBF" />
          <Stop offset="100%" stopColor="#4F5BD5" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igCardGrad)" />
      <Rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <Circle cx="12" cy="12" r="3.2" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <Circle cx="15.8" cy="8.2" r="0.9" fill="#FFFFFF" />
    </Svg>
  );
}

function TwilioIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="11" fill="#F22F46" />
      <Circle cx="8.5" cy="8.5" r="1.9" fill="#FFFFFF" />
      <Circle cx="15.5" cy="8.5" r="1.9" fill="#FFFFFF" />
      <Circle cx="8.5" cy="15.5" r="1.9" fill="#FFFFFF" />
      <Circle cx="15.5" cy="15.5" r="1.9" fill="#FFFFFF" />
    </Svg>
  );
}

// User specified gradient connected button badge
// .connected-btn {
//   background: linear-gradient(135deg, #22C55E 0%, #059669 100%);
//   color: #FFFFFF;
//   border: 1px solid #34D399;
//   border-radius: 999px;
//   padding: 10px 18px;
//   font-weight: 600;
// }
function ConnectedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <LinearGradient
      colors={['#22C55E', '#059669']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.connectedBadgeGradient,
        compact ? styles.connectedBadgeCompact : styles.connectedBadgeStandard,
      ]}
    >
      <View style={styles.onlineDotWhite} />
      <Text
        style={[
          styles.connectedBadgeText,
          compact ? styles.connectedBadgeTextCompact : styles.connectedBadgeTextStandard,
        ]}
      >
        Connected
      </Text>
    </LinearGradient>
  );
}

export default function ConnectedChannelsScreen() {
  const router = useRouter();
  const authState = useAuth();
  const { isDark } = useAppTheme();

  // Consistent theme colors matching Settings/Inbox card theme without header violet gradient
  const theme = {
    screenBg: isDark ? '#0A1023' : '#EEEEF5',
    cardBg: isDark ? '#202941' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(164, 170, 255, 0.07)' : 'rgba(255, 255, 255, 0.95)',
    cardShadow: isDark ? '#000000' : '#2F2B5A',
    textPrimary: isDark ? '#FFFFFF' : '#1A2138',
    textSecondary: isDark ? '#A2ADD8' : '#7583A5',
    textMuted: isDark ? '#A2ADD8' : '#7583A5',
    roleBg: isDark ? 'rgba(118, 85, 240, 0.22)' : 'rgba(128, 96, 232, 0.15)',
    roleText: isDark ? '#C4B5FD' : '#6F51D1',
    primary: isDark ? '#7655F0' : '#8060E8',
    connectBtnBg: isDark ? 'rgba(128, 140, 190, 0.12)' : 'rgba(229, 223, 255, 0.35)',
    connectBtnBorder: isDark ? 'rgba(168, 176, 225, 0.14)' : 'rgba(215, 222, 238, 0.85)',
    infoBannerBg: isDark ? '#151D36' : 'rgba(255, 255, 255, 0.75)',
    infoBannerBorder: isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(215, 222, 238, 0.85)',
    infoIcon: isDark ? '#A69BFF' : '#7655F0',
  };

  const workspace = authState.selectedWorkspace || authState.workspaces[0];
  const workspaceId = workspace?.id || '';
  const workspaceName = workspace?.name || 'Workspace';
  const userRole = workspace?.role || authState.user?.platform_role || 'Owner';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [channelsData, setChannelsData] = useState<WorkspaceChannelsStatus | null>(null);

  // Connection Details Modal State
  const [selectedModalChannel, setSelectedModalChannel] = useState<'whatsapp' | 'instagram' | 'twilio' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Web Dashboard Required Modal State (when "Connect" is clicked)
  const [webConnectModalChannel, setWebConnectModalChannel] = useState<{
    id: 'whatsapp' | 'instagram' | 'twilio';
    name: string;
    description: string;
  } | null>(null);

  const loadChannels = useCallback(async () => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchChannelsStatus(workspaceId);
      setChannelsData(data);
    } catch {
      setChannelsData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadChannels();
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Copied fallback
      setCopiedKey(key);
    }
  };

  const openWebPrompt = (id: 'whatsapp' | 'instagram' | 'twilio', name: string, description: string) => {
    setWebConnectModalChannel({ id, name, description });
  };

  // Channel details derived directly from backend/DB
  const whatsappConnected = Boolean(channelsData?.whatsapp?.connected);
  const whatsappPhone = channelsData?.whatsapp?.phone || '';
  const whatsappPhoneId = channelsData?.whatsapp?.phone_number_id || '';
  const whatsappWabaId = channelsData?.whatsapp?.waba_id || '';

  const instagramConnected = Boolean(channelsData?.instagram?.connected);
  const instagramUser = channelsData?.instagram?.username || '';

  const twilioConnected = Boolean(channelsData?.twilio?.connected);
  const twilioPhone = channelsData?.twilio?.phone || '';
  const twilioSid = channelsData?.twilio?.account_sid || (twilioConnected ? 'Configured in Workspace' : '');

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
            { backgroundColor: isDark ? 'rgba(128, 140, 190, 0.12)' : 'rgba(255, 255, 255, 0.85)' },
          ]}
          activeOpacity={0.7}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Connected channels
        </Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Workspace Pill */}
        <View style={styles.workspacePillContainer}>
          <View
            style={[
              styles.workspacePill,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: theme.roleBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  { color: theme.roleText },
                ]}
              >
                {userRole}
              </Text>
            </View>
            <Text
              style={[styles.workspaceNameText, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {workspaceName}
            </Text>
          </View>
        </View>

        {/* Section Subtitle */}
        <Text style={[styles.subtitleNote, { color: theme.textMuted }]}>
          Manage your business communication channels connected to this workspace.
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading channels...
            </Text>
          </View>
        ) : (
          <View style={styles.channelsList}>
            {/* 1. WHATSAPP BUSINESS */}
            <TouchableOpacity
              style={[
                styles.channelCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.cardShadow,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => {
                if (whatsappConnected) {
                  setSelectedModalChannel('whatsapp');
                } else {
                  openWebPrompt(
                    'whatsapp',
                    'WhatsApp Business',
                    'Meta Cloud API & WhatsApp Business phone verification must be completed in the Web Dashboard.'
                  );
                }
              }}
            >
              <View style={styles.channelIconBox}>
                <WhatsAppIcon size={36} />
              </View>

              <View style={styles.channelInfoCol}>
                <Text style={[styles.channelTitle, { color: theme.textPrimary }]}>
                  WhatsApp Business
                </Text>
                <Text
                  style={[styles.channelSubtitle, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {whatsappConnected ? whatsappPhone : 'Meta Cloud API • Not connected'}
                </Text>
              </View>

              <View style={styles.channelStatusCol}>
                {whatsappConnected ? (
                  <ConnectedBadge />
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.connectBtnBadge,
                      {
                        backgroundColor: theme.connectBtnBg,
                        borderColor: theme.connectBtnBorder,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      openWebPrompt(
                        'whatsapp',
                        'WhatsApp Business',
                        'Meta Cloud API & WhatsApp Business phone verification must be completed in the Web Dashboard.'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.connectBtnText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Connect
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>

            {/* 2. INSTAGRAM DIRECT */}
            <TouchableOpacity
              style={[
                styles.channelCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.cardShadow,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => {
                if (instagramConnected) {
                  setSelectedModalChannel('instagram');
                } else {
                  openWebPrompt(
                    'instagram',
                    'Instagram Direct',
                    'Meta Business Account login and Instagram Graph API permission authorization must be done in the Web Dashboard.'
                  );
                }
              }}
            >
              <View style={styles.channelIconBox}>
                <InstagramIcon size={36} />
              </View>

              <View style={styles.channelInfoCol}>
                <Text style={[styles.channelTitle, { color: theme.textPrimary }]}>
                  Instagram Direct
                </Text>
                <Text
                  style={[styles.channelSubtitle, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {instagramConnected ? instagramUser : 'Direct Messages • Not connected'}
                </Text>
              </View>

              <View style={styles.channelStatusCol}>
                {instagramConnected ? (
                  <ConnectedBadge />
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.connectBtnBadge,
                      {
                        backgroundColor: theme.connectBtnBg,
                        borderColor: theme.connectBtnBorder,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      openWebPrompt(
                        'instagram',
                        'Instagram Direct',
                        'Meta Business Account login and Instagram Graph API permission authorization must be done in the Web Dashboard.'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.connectBtnText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Connect
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>

            {/* 3. TWILIO SMS & VOICE */}
            <TouchableOpacity
              style={[
                styles.channelCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.cardShadow,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => {
                if (twilioConnected) {
                  setSelectedModalChannel('twilio');
                } else {
                  openWebPrompt(
                    'twilio',
                    'Twilio SMS & Voice',
                    'Twilio Account SID, Auth Token, and WhatsApp sender phone number configuration must be linked via the Web Dashboard.'
                  );
                }
              }}
            >
              <View style={styles.channelIconBox}>
                <TwilioIcon size={36} />
              </View>

              <View style={styles.channelInfoCol}>
                <Text style={[styles.channelTitle, { color: theme.textPrimary }]}>
                  Twilio
                </Text>
                <Text
                  style={[styles.channelSubtitle, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {twilioConnected ? twilioPhone : 'SMS & Voice Gateway • Not connected'}
                </Text>
              </View>

              <View style={styles.channelStatusCol}>
                {twilioConnected ? (
                  <ConnectedBadge />
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.connectBtnBadge,
                      {
                        backgroundColor: theme.connectBtnBg,
                        borderColor: theme.connectBtnBorder,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() =>
                      openWebPrompt(
                        'twilio',
                        'Twilio SMS & Voice',
                        'Twilio Account SID, Auth Token, and WhatsApp sender phone number configuration must be linked via the Web Dashboard.'
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.connectBtnText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Connect
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Sync Info Banner */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: theme.infoBannerBg,
              borderColor: theme.infoBannerBorder,
            },
          ]}
        >
          <Info size={18} color={theme.infoIcon} style={styles.infoBannerIcon} />
          <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
            New incoming messages from all connected channels will automatically sync
            to your TeamBox Inbox in real-time.
          </Text>
        </View>
      </ScrollView>

      {/* ============================================================== */}
      {/* 1. Connection Details Modal (No Disconnect Button on Mobile)  */}
      {/* ============================================================== */}
      <Modal
        visible={!!selectedModalChannel}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedModalChannel(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedModalChannel(null)}
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
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  {selectedModalChannel === 'twilio' && <TwilioIcon size={34} />}
                  {selectedModalChannel === 'whatsapp' && <WhatsAppIcon size={34} />}
                  {selectedModalChannel === 'instagram' && <InstagramIcon size={34} />}
                </View>
                <View style={styles.modalTitleBox}>
                  <Text style={[styles.modalChannelName, { color: theme.textPrimary }]}>
                    {selectedModalChannel === 'twilio'
                      ? 'Twilio'
                      : selectedModalChannel === 'whatsapp'
                      ? 'WhatsApp'
                      : 'Instagram'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                    Connection Details
                  </Text>
                </View>
              </View>

              <View style={styles.modalHeaderRight}>
                <ConnectedBadge compact />
                <TouchableOpacity
                  style={[
                    styles.modalCloseBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedModalChannel(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={15} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Body: Channel Specific Details */}
            <View style={styles.modalBody}>
              {selectedModalChannel === 'twilio' && (
                <>
                  {/* Account SID */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      ACCOUNT SID
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {twilioSid || 'Configured in Workspace'}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        activeOpacity={0.6}
                        onPress={() => handleCopyText(twilioSid || 'Configured in Workspace', 'twilio_sid')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {copiedKey === 'twilio_sid' ? (
                          <Check size={15} color="#4ADE80" />
                        ) : (
                          <Copy size={15} color={isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5'} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Auth Token */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      AUTH TOKEN
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValueMasked, { color: isDark ? 'rgba(255, 255, 255, 0.8)' : '#334155' }]}
                        numberOfLines={1}
                      >
                        ••••••••••••••••••••••••••••••••
                      </Text>
                    </View>
                  </View>

                  {/* WhatsApp Phone Number */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      WHATSAPP PHONE NUMBER
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {twilioPhone}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        activeOpacity={0.6}
                        onPress={() => handleCopyText(twilioPhone, 'twilio_phone')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {copiedKey === 'twilio_phone' ? (
                          <Check size={15} color="#4ADE80" />
                        ) : (
                          <Copy size={15} color={isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5'} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {selectedModalChannel === 'whatsapp' && (
                <>
                  {/* WhatsApp Business Number */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      WHATSAPP BUSINESS NUMBER
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {whatsappPhone}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        activeOpacity={0.6}
                        onPress={() => handleCopyText(whatsappPhone, 'wa_phone')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {copiedKey === 'wa_phone' ? (
                          <Check size={15} color="#4ADE80" />
                        ) : (
                          <Copy size={15} color={isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5'} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Phone Number ID */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      PHONE NUMBER ID
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {whatsappPhoneId || 'Configured in Meta'}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        activeOpacity={0.6}
                        onPress={() => handleCopyText(whatsappPhoneId, 'wa_phone_id')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {copiedKey === 'wa_phone_id' ? (
                          <Check size={15} color="#4ADE80" />
                        ) : (
                          <Copy size={15} color={isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5'} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* WABA ID */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      WHATSAPP BUSINESS ACCOUNT ID (WABA ID)
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {whatsappWabaId || 'Configured in Meta'}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        activeOpacity={0.6}
                        onPress={() => handleCopyText(whatsappWabaId, 'wa_waba_id')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {copiedKey === 'wa_waba_id' ? (
                          <Check size={15} color="#4ADE80" />
                        ) : (
                          <Copy size={15} color={isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5'} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Integration Platform */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      INTEGRATION PLATFORM
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#475569' }]}
                        numberOfLines={1}
                      >
                        Meta Cloud API
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {selectedModalChannel === 'instagram' && (
                <>
                  {/* Connected Account */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      CONNECTED ACCOUNT
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: isDark ? '#C4B5FD' : '#7655F0' }]}
                        numberOfLines={1}
                      >
                        {instagramUser}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        activeOpacity={0.6}
                        onPress={() => handleCopyText(instagramUser, 'ig_user')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {copiedKey === 'ig_user' ? (
                          <Check size={15} color="#4ADE80" />
                        ) : (
                          <Copy size={15} color={isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5'} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Integration Type */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' }]}>
                      INTEGRATION TYPE
                    </Text>
                    <View
                      style={[
                        styles.fieldBox,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.fieldValue, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#475569' }]}
                        numberOfLines={2}
                      >
                        Meta Business Graph API (Direct Messages & Comments)
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Secure Encryption Note */}
              <View
                style={[
                  styles.encryptionNoteBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.encryptionNoteText,
                    { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#7583A5' },
                  ]}
                >
                  Credentials and tokens are encrypted and managed securely for your workspace.
                </Text>
              </View>
            </View>

            {/* Modal Footer: Clean Done Button (No Disconnect button on mobile) */}
            <View
              style={[
                styles.modalFooterSingle,
                { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.doneBtnFull,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#1A2138',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedModalChannel(null)}
              >
                <Text style={styles.doneBtnFullText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 2. Web Dashboard Required Modal Card (When "Connect" Clicked) */}
      {/* ============================================================== */}
      <Modal
        visible={!!webConnectModalChannel}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setWebConnectModalChannel(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setWebConnectModalChannel(null)}
          />
          <View
            style={[
              styles.webPromptCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.webPromptHeader}>
              <View
                style={[
                  styles.webPromptIconCircle,
                  { backgroundColor: isDark ? 'rgba(118, 85, 240, 0.2)' : 'rgba(128, 96, 232, 0.15)' },
                ]}
              >
                <Globe size={22} color={theme.primary} />
              </View>
              <View style={styles.webPromptHeaderTextCol}>
                <Text style={[styles.webPromptTitle, { color: theme.textPrimary }]}>
                  Connect via Web Dashboard
                </Text>
                <Text style={[styles.webPromptSubtitle, { color: theme.textMuted }]}>
                  Web portal setup required
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
                onPress={() => setWebConnectModalChannel(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Target Channel Pill */}
            {webConnectModalChannel && (
              <View
                style={[
                  styles.targetChannelBadge,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                {webConnectModalChannel.id === 'twilio' && <TwilioIcon size={20} />}
                {webConnectModalChannel.id === 'whatsapp' && <WhatsAppIcon size={20} />}
                {webConnectModalChannel.id === 'instagram' && <InstagramIcon size={20} />}
                <Text style={[styles.targetChannelBadgeText, { color: theme.textPrimary }]}>
                  {webConnectModalChannel.name}
                </Text>
                <View style={styles.notConnectedDot} />
                <Text style={[styles.notConnectedText, { color: theme.textMuted }]}>
                  Not Connected
                </Text>
              </View>
            )}

            {/* Main Message Card */}
            <View
              style={[
                styles.webPromptMessageContainer,
                {
                  backgroundColor: isDark ? 'rgba(118, 85, 240, 0.08)' : 'rgba(128, 96, 232, 0.06)',
                  borderColor: isDark ? 'rgba(118, 85, 240, 0.25)' : 'rgba(128, 96, 232, 0.2)',
                },
              ]}
            >
              <Text style={[styles.webPromptNoticeTitle, { color: isDark ? '#C4B5FD' : '#6F51D1' }]}>
                Web Dashboard Required
              </Text>
              <Text style={[styles.webPromptNoticeDesc, { color: theme.textSecondary }]}>
                To link and configure {webConnectModalChannel?.name || 'this channel'}, please sign in to the Orbion Agents Web Dashboard on your computer or desktop browser.
              </Text>
            </View>

            {/* Security Explanation */}
            <View
              style={[
                styles.webPromptInfoBox,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
            >
              <ShieldCheck size={16} color={theme.primary} style={styles.infoIconFlex} />
              <Text style={[styles.webPromptInfoText, { color: theme.textMuted }]}>
                Meta Cloud OAuth authentication, Twilio webhook routing, and business phone
                verification require secure browser permissions managed in the web portal.
              </Text>
            </View>



            {/* Buttons: Got it (and optional preview for Twilio) */}
            <View style={styles.webPromptActions}>


              <TouchableOpacity
                style={[
                  styles.primaryGotItBtn,
                  {
                    backgroundColor: theme.primary,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setWebConnectModalChannel(null)}
              >
                <Text style={styles.primaryGotItBtnText}>Got it</Text>
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
  workspacePillContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 14,
    borderWidth: 1,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  roleBadge: {
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  workspaceNameText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  subtitleNote: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
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
  channelsList: {
    gap: 14,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  channelIconBox: {
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  channelTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginBottom: 3,
  },
  channelSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
  },
  channelStatusCol: {
    marginLeft: 10,
  },

  // .connected-btn Linear Gradient Badge Styles (User specification)
  connectedBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 999,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  connectedBadgeStandard: {
    paddingVertical: 7,
    paddingHorizontal: 15,
    gap: 7,
  },
  connectedBadgeCompact: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 5.5,
  },
  onlineDotWhite: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  connectedBadgeText: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  connectedBadgeTextStandard: {
    fontSize: 12.5,
  },
  connectedBadgeTextCompact: {
    fontSize: 11,
  },

  connectBtnBadge: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  connectBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 26,
    gap: 12,
  },
  infoBannerIcon: {
    flexShrink: 0,
  },
  infoBannerText: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    lineHeight: 18,
    flex: 1,
  },

  // Connection Details Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleBox: {
    flex: 1,
  },
  modalChannelName: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 13,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldValue: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    flex: 1,
  },
  fieldValueMasked: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    letterSpacing: 2,
    flex: 1,
  },
  copyBtn: {
    padding: 4,
    marginLeft: 10,
  },
  encryptionNoteBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 2,
  },
  encryptionNoteText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    lineHeight: 16,
  },

  // Modal Footer Single "Done" button (User asked to remove disconnect button on mobile)
  modalFooterSingle: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  doneBtnFull: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnFullText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Web Dashboard Required Modal Card Styles
  webPromptCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    gap: 14,
  },
  webPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webPromptIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  webPromptHeaderTextCol: {
    flex: 1,
  },
  webPromptTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  webPromptSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  targetChannelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  targetChannelBadgeText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  notConnectedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F59E0B',
    marginLeft: 4,
  },
  notConnectedText: {
    fontSize: 11.5,
    fontFamily: Fonts.medium,
  },
  webPromptMessageContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  webPromptNoticeTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    lineHeight: 19,
  },
  webPromptNoticeDesc: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  webPromptInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  infoIconFlex: {
    marginTop: 2,
    flexShrink: 0,
  },
  webPromptInfoText: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    lineHeight: 17,
    flex: 1,
  },
  webUrlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  webUrlText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  webPromptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  secondaryActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  primaryGotItBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryGotItBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

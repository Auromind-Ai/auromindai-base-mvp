import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  RadialGradient,
} from 'react-native-svg';
import {
  Search,
  Bell,
  Filter,
  ChevronDown,
  X,
  Check,
} from 'lucide-react-native';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';

export type ChannelType = 'all' | 'whatsapp' | 'instagram' | 'twilio';
export type StatusType = 'all' | 'unread' | 'open';

export interface ConversationItem {
  id: string;
  name: string;
  channel: 'whatsapp' | 'instagram' | 'twilio';
  avatarUrl: string;
  avatarInitials: string;
  avatarBg: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  status: 'open' | 'unread' | 'closed';
}

// Authentic conversation data matching the reference images exactly
const CONVERSATIONS_DATA: ConversationItem[] = [
  {
    id: '1',
    name: 'Wade Warren',
    channel: 'whatsapp',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    avatarInitials: 'WW',
    avatarBg: '#5B4EB5',
    lastMessage: 'How are you?',
    time: '3:32 Pm',
    unread: true,
    status: 'open',
  },
  {
    id: '2',
    name: 'Brooklyn Simmons',
    channel: 'instagram',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    avatarInitials: 'BS',
    avatarBg: '#C026D3',
    lastMessage: 'Are you available tomorrow?',
    time: '2:24 Pm',
    unread: true,
    status: 'open',
  },
  {
    id: '3',
    name: 'Jenny Wilson',
    channel: 'whatsapp',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    avatarInitials: 'JW',
    avatarBg: '#059669',
    lastMessage: 'Have a nice day.',
    time: '1:28 Pm',
    unread: false,
    status: 'open',
  },
  {
    id: '4',
    name: 'Guy Hawkins',
    channel: 'twilio',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
    avatarInitials: 'GH',
    avatarBg: '#D97706',
    lastMessage: "What's the progress on that...",
    time: '8:25 Am',
    unread: false,
    status: 'open',
  },
  {
    id: '5',
    name: 'Guy Hawkins',
    channel: 'instagram',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
    avatarInitials: 'GH',
    avatarBg: '#7C3AED',
    lastMessage: 'I want to book the life coach.',
    time: '8:35 Am',
    unread: false,
    status: 'open',
  },
  {
    id: '6',
    name: 'Dianne Russell',
    channel: 'whatsapp',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80',
    avatarInitials: 'DR',
    avatarBg: '#0D9488',
    lastMessage: 'My friend want to see coach list',
    time: '8:40 Am',
    unread: false,
    status: 'open',
  },
  {
    id: '7',
    name: 'Theresa Webb',
    channel: 'twilio',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    avatarInitials: 'TW',
    avatarBg: '#DC2626',
    lastMessage: 'See you tomorrow then.',
    time: '8:45 Am',
    unread: false,
    status: 'open',
  },
];

// WhatsApp Icon
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="12" fill="#25D366" />
      <Path
        d="M17.2 13.8c-.28-.14-1.63-.8-1.88-.9-.25-.1-.43-.14-.62.14-.19.28-.72.9-.88 1.09-.16.19-.31.21-.59.07-.28-.14-1.18-.43-2.25-1.39-.83-.75-1.4-1.67-1.56-1.95-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.1-.19 0-.38-.05-.52-.05-.14-.62-1.5-.85-2.05-.22-.55-.45-.48-.62-.48h-.53c-.19 0-.5.07-.76.35-.26.29-1 1-1 2.45s1.02 2.85 1.16 3.05c.14.19 2.01 3.2 4.95 4.38.7.28 1.25.45 1.68.58.7.21 1.34.18 1.85.1.57-.09 1.75-.72 2-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.19-.55-.32z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// Instagram Icon
function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="igIconGradient" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FA7E1E" />
          <Stop offset="40%" stopColor="#D62976" />
          <Stop offset="70%" stopColor="#962FBF" />
          <Stop offset="100%" stopColor="#4F5BD5" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="24" height="24" rx="6.5" fill="url(#igIconGradient)" />
      <Rect
        x="5.2"
        y="5.2"
        width="13.6"
        height="13.6"
        rx="4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.6"
      />
      <Circle cx="12" cy="12" r="3.2" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <Circle cx="15.8" cy="8.2" r="0.9" fill="#FFFFFF" />
    </Svg>
  );
}

// Twilio Icon
function TwilioIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="12" fill="#E11D48" />
      <Circle cx="8.5" cy="8.5" r="1.85" fill="#FFFFFF" />
      <Circle cx="15.5" cy="8.5" r="1.85" fill="#FFFFFF" />
      <Circle cx="8.5" cy="15.5" r="1.85" fill="#FFFFFF" />
      <Circle cx="15.5" cy="15.5" r="1.85" fill="#FFFFFF" />
    </Svg>
  );
}

export default function OmniInboxScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  // State
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Dynamic Channel counts
  const channelCounts = useMemo(() => {
    return {
      all: 24,
      whatsapp: 12,
      instagram: 8,
      twilio: 4,
    };
  }, []);

  // Filtered conversation items
  const filteredConversations = useMemo(() => {
    return CONVERSATIONS_DATA.filter((item) => {
      // Channel filtering
      if (selectedChannel !== 'all' && item.channel !== selectedChannel) {
        return false;
      }
      // Status filtering
      if (selectedStatus === 'unread' && !item.unread) {
        return false;
      }
      if (selectedStatus === 'open' && item.status !== 'open') {
        return false;
      }
      // Search query filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesMessage = item.lastMessage.toLowerCase().includes(query);
        if (!matchesName && !matchesMessage) return false;
      }
      return true;
    });
  }, [selectedChannel, selectedStatus, searchQuery]);

  // Mini badge overlapping the bottom-right corner of avatar
  const renderAvatarChannelBadge = (channel: 'whatsapp' | 'instagram' | 'twilio') => {
    const badgeBorderColor = isDark ? '#202941' : '#FFFFFF';
    return (
      <View style={[styles.avatarMiniBadge, { borderColor: badgeBorderColor }]}>
        {channel === 'whatsapp' && <WhatsAppIcon size={20} />}
        {channel === 'instagram' && <InstagramIcon size={20} />}
        {channel === 'twilio' && <TwilioIcon size={20} />}
      </View>
    );
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: isDark ? '#0A1023' : '#EEEEF5' }]}>
      <StatusBar style="light" />

      {/* TOP HEADER SECTION */}
      <View style={styles.headerWrapper}>
        {/* Background Linear Gradient with angle ~135deg */}
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
                id={isDark ? 'hdrDarkGlow' : 'hdrLightGlow'}
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
              fill={`url(#${isDark ? 'hdrDarkGlow' : 'hdrLightGlow'})`}
            />
          </Svg>
        </View>

        <SafeAreaView edges={['top', 'left', 'right']}>
          {/* Header Top Row: Messages Title & Glass Action Buttons */}
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitleText, { color: isDark ? '#F8F8FF' : '#FFFFFF' }]}>
              Messages
            </Text>

            <View style={styles.headerActionsGroup}>
              {/* Search Glass Button */}
              <TouchableOpacity
                style={[
                  styles.glassActionButton,
                  isDark ? styles.glassActionDark : styles.glassActionLight,
                  isSearchActive && styles.glassActionActive,
                ]}
                activeOpacity={0.75}
                onPress={() => setIsSearchActive(!isSearchActive)}
              >
                <Search size={20} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>

              {/* Notification Glass Button */}
              <TouchableOpacity
                style={[
                  styles.glassActionButton,
                  isDark ? styles.glassActionDark : styles.glassActionLight,
                ]}
                activeOpacity={0.75}
                onPress={() => setShowFilterModal(true)}
              >
                <Bell size={20} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Expandable Search Input (if active) */}
          {isSearchActive && (
            <View
              style={[
                styles.searchBarWrapper,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.10)'
                    : 'rgba(255, 255, 255, 0.18)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.35)',
                },
              ]}
            >
              <Search size={16} color="#FFFFFF" style={styles.searchBarIcon} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search messages or contacts..."
                placeholderTextColor={isDark ? '#C4C9E6' : '#E8EDFF'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* CHANNEL FILTER BAR CONTAINER */}
          <View
            style={[
              styles.channelBarContainer,
              isDark ? styles.channelBarDark : styles.channelBarLight,
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.channelScrollContent}
              bounces={false}
            >
              {/* 1. All (24) */}
              <TouchableOpacity
                style={styles.channelItemTouchable}
                onPress={() => setSelectedChannel('all')}
                activeOpacity={0.8}
              >
                {selectedChannel === 'all' ? (
                  <LinearGradient
                    colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#FDFCFF', '#E5DFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.channelPillActiveGradient,
                      isDark ? styles.channelPillBorderDark : styles.channelPillBorderLight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.channelPillLabel,
                        isDark
                          ? styles.channelPillLabelActiveDark
                          : styles.channelPillLabelActiveLight,
                      ]}
                    >
                      All
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeSelectedDark
                          : styles.channelBadgeSelectedLight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.channelCountBadgeText,
                          !isDark && { color: '#6F51D1' },
                        ]}
                      >
                        {channelCounts.all}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.channelPillBase}>
                    <Text style={[styles.channelPillLabel, styles.channelPillLabelInactive]}>
                      All
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeUnselectedDark
                          : styles.channelBadgeUnselectedLight,
                      ]}
                    >
                      <Text style={styles.channelCountBadgeText}>{channelCounts.all}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View
                style={[
                  styles.channelDivider,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)' },
                ]}
              />

              {/* 2. WhatsApp (12) */}
              <TouchableOpacity
                style={styles.channelItemTouchable}
                onPress={() => setSelectedChannel(selectedChannel === 'whatsapp' ? 'all' : 'whatsapp')}
                activeOpacity={0.8}
              >
                {selectedChannel === 'whatsapp' ? (
                  <LinearGradient
                    colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#FDFCFF', '#E5DFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.channelPillActiveGradient,
                      isDark ? styles.channelPillBorderDark : styles.channelPillBorderLight,
                    ]}
                  >
                    <WhatsAppIcon size={17} />
                    <Text
                      style={[
                        styles.channelPillLabel,
                        isDark
                          ? styles.channelPillLabelActiveDark
                          : styles.channelPillLabelActiveLight,
                      ]}
                    >
                      WhatsApp
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeSelectedDark
                          : styles.channelBadgeSelectedLight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.channelCountBadgeText,
                          !isDark && { color: '#6F51D1' },
                        ]}
                      >
                        {channelCounts.whatsapp}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.channelPillBase}>
                    <WhatsAppIcon size={17} />
                    <Text style={[styles.channelPillLabel, styles.channelPillLabelInactive]}>
                      WhatsApp
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeUnselectedDark
                          : styles.channelBadgeUnselectedLight,
                      ]}
                    >
                      <Text style={styles.channelCountBadgeText}>{channelCounts.whatsapp}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View
                style={[
                  styles.channelDivider,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)' },
                ]}
              />

              {/* 3. Instagram (8) */}
              <TouchableOpacity
                style={styles.channelItemTouchable}
                onPress={() => setSelectedChannel(selectedChannel === 'instagram' ? 'all' : 'instagram')}
                activeOpacity={0.8}
              >
                {selectedChannel === 'instagram' ? (
                  <LinearGradient
                    colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#FDFCFF', '#E5DFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.channelPillActiveGradient,
                      isDark ? styles.channelPillBorderDark : styles.channelPillBorderLight,
                    ]}
                  >
                    <InstagramIcon size={17} />
                    <Text
                      style={[
                        styles.channelPillLabel,
                        isDark
                          ? styles.channelPillLabelActiveDark
                          : styles.channelPillLabelActiveLight,
                      ]}
                    >
                      Instagram
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeSelectedDark
                          : styles.channelBadgeSelectedLight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.channelCountBadgeText,
                          !isDark && { color: '#6F51D1' },
                        ]}
                      >
                        {channelCounts.instagram}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.channelPillBase}>
                    <InstagramIcon size={17} />
                    <Text style={[styles.channelPillLabel, styles.channelPillLabelInactive]}>
                      Instagram
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeUnselectedDark
                          : styles.channelBadgeUnselectedLight,
                      ]}
                    >
                      <Text style={styles.channelCountBadgeText}>{channelCounts.instagram}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View
                style={[
                  styles.channelDivider,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)' },
                ]}
              />

              {/* 4. Twilio (4) */}
              <TouchableOpacity
                style={styles.channelItemTouchable}
                onPress={() => setSelectedChannel(selectedChannel === 'twilio' ? 'all' : 'twilio')}
                activeOpacity={0.8}
              >
                {selectedChannel === 'twilio' ? (
                  <LinearGradient
                    colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#FDFCFF', '#E5DFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.channelPillActiveGradient,
                      isDark ? styles.channelPillBorderDark : styles.channelPillBorderLight,
                    ]}
                  >
                    <TwilioIcon size={17} />
                    <Text
                      style={[
                        styles.channelPillLabel,
                        isDark
                          ? styles.channelPillLabelActiveDark
                          : styles.channelPillLabelActiveLight,
                      ]}
                    >
                      Twilio
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeSelectedDark
                          : styles.channelBadgeSelectedLight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.channelCountBadgeText,
                          !isDark && { color: '#6F51D1' },
                        ]}
                      >
                        {channelCounts.twilio}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.channelPillBase}>
                    <TwilioIcon size={17} />
                    <Text style={[styles.channelPillLabel, styles.channelPillLabelInactive]}>
                      Twilio
                    </Text>
                    <View
                      style={[
                        styles.channelCountBadge,
                        isDark
                          ? styles.channelBadgeUnselectedDark
                          : styles.channelBadgeUnselectedLight,
                      ]}
                    >
                      <Text style={styles.channelCountBadgeText}>{channelCounts.twilio}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>

      {/* MAIN CONVERSATION AREA SHEET */}
      <View style={styles.mainContentSheet}>
        {/* Background gradient for conversation area */}
        <LinearGradient
          colors={
            isDark
              ? ['#0C1125', '#10162D', '#0A1023']
              : ['#F2F2F8', '#F6F6FA', '#EEEEF5']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* INBOX STATUS FILTERS ROW */}
        <View style={styles.statusFiltersRow}>
          {/* All (24) */}
          <TouchableOpacity
            onPress={() => setSelectedStatus('all')}
            activeOpacity={0.8}
            style={styles.statusPillWrapper}
          >
            {selectedStatus === 'all' ? (
              <LinearGradient
                colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#8060E8', '#6749DE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusPillActiveGradient}
              >
                <Text style={styles.statusTextActive}>All</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isDark ? styles.statusBadgeActiveDark : styles.statusBadgeActiveLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isDark ? styles.statusBadgeTextActiveDark : styles.statusBadgeTextActiveLight,
                    ]}
                  >
                    24
                  </Text>
                </View>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.statusPillInactiveBase,
                  isDark ? styles.statusPillInactiveDark : styles.statusPillInactiveLight,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isDark ? styles.statusTextInactiveDark : styles.statusTextInactiveLight,
                  ]}
                >
                  All
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    isDark ? styles.statusBadgeInactiveDark : styles.statusBadgeInactiveLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isDark ? styles.statusBadgeTextInactiveDark : styles.statusBadgeTextInactiveLight,
                    ]}
                  >
                    24
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Unread (12) */}
          <TouchableOpacity
            onPress={() => setSelectedStatus(selectedStatus === 'unread' ? 'all' : 'unread')}
            activeOpacity={0.8}
            style={styles.statusPillWrapper}
          >
            {selectedStatus === 'unread' ? (
              <LinearGradient
                colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#8060E8', '#6749DE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusPillActiveGradient}
              >
                <Text style={styles.statusTextActive}>Unread</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isDark ? styles.statusBadgeActiveDark : styles.statusBadgeActiveLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isDark ? styles.statusBadgeTextActiveDark : styles.statusBadgeTextActiveLight,
                    ]}
                  >
                    12
                  </Text>
                </View>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.statusPillInactiveBase,
                  isDark ? styles.statusPillInactiveDark : styles.statusPillInactiveLight,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isDark ? styles.statusTextInactiveDark : styles.statusTextInactiveLight,
                  ]}
                >
                  Unread
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    isDark ? styles.statusBadgeInactiveDark : styles.statusBadgeInactiveLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isDark ? styles.statusBadgeTextInactiveDark : styles.statusBadgeTextInactiveLight,
                    ]}
                  >
                    12
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Open (12) */}
          <TouchableOpacity
            onPress={() => setSelectedStatus(selectedStatus === 'open' ? 'all' : 'open')}
            activeOpacity={0.8}
            style={styles.statusPillWrapper}
          >
            {selectedStatus === 'open' ? (
              <LinearGradient
                colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#8060E8', '#6749DE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusPillActiveGradient}
              >
                <Text style={styles.statusTextActive}>Open</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isDark ? styles.statusBadgeActiveDark : styles.statusBadgeActiveLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isDark ? styles.statusBadgeTextActiveDark : styles.statusBadgeTextActiveLight,
                    ]}
                  >
                    12
                  </Text>
                </View>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.statusPillInactiveBase,
                  isDark ? styles.statusPillInactiveDark : styles.statusPillInactiveLight,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    isDark ? styles.statusTextInactiveDark : styles.statusTextInactiveLight,
                  ]}
                >
                  Open
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    isDark ? styles.statusBadgeInactiveDark : styles.statusBadgeInactiveLight,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isDark ? styles.statusBadgeTextInactiveDark : styles.statusBadgeTextInactiveLight,
                    ]}
                  >
                    12
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Filter (Funnel + Chevron) */}
          <TouchableOpacity
            style={[
              styles.statusPillInactiveBase,
              styles.filterButtonPill,
              isDark ? styles.statusPillInactiveDark : styles.statusPillInactiveLight,
            ]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <Filter size={15} color={isDark ? '#A2ADD8' : '#7583A5'} />
            <Text
              style={[
                styles.statusPillText,
                isDark ? styles.statusTextInactiveDark : styles.statusTextInactiveLight,
              ]}
            >
              Filter
            </Text>
            <ChevronDown size={14} color={isDark ? '#A2ADD8' : '#7583A5'} />
          </TouchableOpacity>
        </View>

        {/* CONVERSATION CARDS LIST */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.cardsListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasValidImage = Boolean(item.avatarUrl) && !imageErrors[item.id];

            return (
              <TouchableOpacity
                style={[
                  styles.conversationCard,
                  isDark ? styles.cardDark : styles.cardLight,
                ]}
                activeOpacity={0.88}
                onPress={() => {
                  router.push({
                    pathname: '/chat/[id]',
                    params: {
                      id: item.id,
                      channel: item.channel,
                      name: item.name,
                    },
                  });
                }}
              >
                {/* Avatar with overlapping channel logo */}
                <View style={styles.avatarContainer}>
                  {hasValidImage ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={styles.avatarImage}
                      onError={() =>
                        setImageErrors((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarFallback,
                        { backgroundColor: item.avatarBg },
                      ]}
                    >
                      <Text style={styles.avatarFallbackText}>
                        {item.avatarInitials}
                      </Text>
                    </View>
                  )}

                  {/* Overlapping channel logo at bottom right */}
                  {renderAvatarChannelBadge(item.channel)}
                </View>

                {/* Content: Name, Last Message, Timestamp, Unread indicator */}
                <View style={styles.cardDetailsColumn}>
                  {/* Top row: Name & Timestamp */}
                  <View style={styles.cardHeaderRow}>
                    <Text
                      style={[
                        styles.contactNameText,
                        { color: isDark ? '#F5F4FF' : '#211D3D' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.timestampText,
                        { color: isDark ? '#A8B4D9' : '#7C8AA9' },
                      ]}
                    >
                      {item.time}
                    </Text>
                  </View>

                  {/* Bottom row: Message preview & Purple unread dot */}
                  <View style={styles.cardFooterRow}>
                    <Text
                      style={[
                        styles.messagePreviewText,
                        { color: isDark ? '#A2ADD8' : '#7887A9' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>

                    {item.unread && (
                      <View
                        style={[
                          styles.unreadPurpleDot,
                          { backgroundColor: isDark ? '#8060E8' : '#8060E8' },
                        ]}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* FILTER SHEET MODAL */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View
            style={[
              styles.modalSheetCard,
              {
                backgroundColor: isDark ? '#161D36' : '#FFFFFF',
                borderColor: isDark ? 'rgba(164,170,255,0.15)' : 'rgba(113,124,164,0.18)',
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text
                style={[
                  styles.modalTitleText,
                  { color: isDark ? '#F5F4FF' : '#211D3D' },
                ]}
              >
                Filter Channels
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} color={isDark ? '#A2ADD8' : '#7887A9'} />
              </TouchableOpacity>
            </View>

            {/* Channels Checklist */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalChannelsList}>
              {[
                { id: 'all', label: 'All Channels', count: 24, icon: null },
                { id: 'whatsapp', label: 'WhatsApp', count: 12, icon: <WhatsAppIcon size={22} /> },
                { id: 'instagram', label: 'Instagram', count: 8, icon: <InstagramIcon size={22} /> },
                { id: 'twilio', label: 'Twilio', count: 4, icon: <TwilioIcon size={22} /> },
              ].map((ch) => {
                const isSelected = selectedChannel === ch.id;
                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[
                      styles.modalOptionRow,
                      {
                        borderBottomColor: isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}
                    onPress={() => {
                      setSelectedChannel(ch.id as ChannelType);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalOptionLeft}>
                      {ch.icon ? (
                        <View style={styles.modalChannelIconBox}>{ch.icon}</View>
                      ) : (
                        <View
                          style={[
                            styles.modalAllIconBox,
                            { backgroundColor: isDark ? '#263154' : '#E8EDFF' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalAllIconText,
                              { color: isDark ? '#FFFFFF' : '#7555D9' },
                            ]}
                          >
                            All
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.modalOptionLabel,
                          { color: isDark ? '#F5F4FF' : '#211D3D' },
                        ]}
                      >
                        {ch.label}
                      </Text>
                    </View>

                    <View style={styles.modalOptionRight}>
                      <Text
                        style={[
                          styles.modalOptionCount,
                          { color: isDark ? '#A2ADD8' : '#7887A9' },
                        ]}
                      >
                        {ch.count}
                      </Text>
                      <View
                        style={[
                          styles.modalCheckbox,
                          isSelected && styles.modalCheckboxChecked,
                          {
                            borderColor: isSelected
                              ? '#8060E8'
                              : isDark
                              ? 'rgba(164,170,255,0.3)'
                              : '#CBD5E1',
                          },
                        ]}
                      >
                        {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={[
                  styles.modalResetButton,
                  {
                    backgroundColor: isDark ? '#202941' : '#F1F3F9',
                    borderColor: isDark ? 'rgba(164,170,255,0.1)' : 'rgba(113,124,164,0.15)',
                  },
                ]}
                onPress={() => {
                  setSelectedChannel('all');
                  setSelectedStatus('all');
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalResetButtonText,
                    { color: isDark ? '#F5F4FF' : '#211D3D' },
                  ]}
                >
                  Reset
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },

  /* HEADER */
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
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glassActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassActionLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  glassActionDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  glassActionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },

  /* EXPANDABLE SEARCH */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  searchBarIcon: {
    marginRight: 10,
  },
  searchBarInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },

  /* CHANNEL FILTER BAR */
  channelBarContainer: {
    borderRadius: 999,
    paddingVertical: 4,
    marginTop: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  channelBarLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.40)',
  },
  channelBarDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(171, 166, 255, 0.18)',
  },
  channelScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingRight: 8,
  },
  channelItemTouchable: {
    borderRadius: 999,
  },
  channelPillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5.5,
    borderRadius: 999,
    gap: 5,
  },
  channelPillActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 999,
    gap: 5,
  },
  channelPillBorderLight: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#814AC8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  channelPillBorderDark: {
    borderWidth: 1,
    borderColor: 'rgba(211, 204, 255, 0.45)',
    shadowColor: '#7757FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 5,
  },
  channelPillLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  channelPillLabelActiveLight: {
    color: '#7555D9',
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  channelPillLabelActiveDark: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  channelPillLabelInactive: {
    color: '#FFFFFF',
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  channelCountBadge: {
    borderRadius: 999,
    paddingHorizontal: 5.5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBadgeSelectedLight: {
    backgroundColor: '#E5DFFF',
  },
  channelBadgeSelectedDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  channelBadgeUnselectedLight: {
    backgroundColor: '#8060E8',
  },
  channelBadgeUnselectedDark: {
    backgroundColor: '#7860E8',
  },
  channelCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  channelDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 3,
    borderRadius: 0.5,
  },

  /* MAIN CONVERSATION CONTENT SHEET */
  mainContentSheet: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -12,
    overflow: 'hidden',
    paddingTop: 16,
  },

  /* STATUS FILTERS */
  statusFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  statusPillWrapper: {
    borderRadius: 999,
  },
  statusPillActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  statusPillInactiveBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  filterButtonPill: {
    marginLeft: 'auto',
  },
  statusPillInactiveLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    borderWidth: 1,
    borderColor: 'rgba(215, 222, 238, 0.85)',
  },
  statusPillInactiveDark: {
    backgroundColor: 'rgba(128, 140, 190, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 176, 225, 0.08)',
  },
  statusPillText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  statusTextInactiveLight: {
    color: '#7583A5',
  },
  statusTextInactiveDark: {
    color: '#A2ADD8',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeActiveLight: {
    backgroundColor: '#E5DFFF',
  },
  statusBadgeActiveDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusBadgeInactiveLight: {
    backgroundColor: '#E5DFFF',
  },
  statusBadgeInactiveDark: {
    backgroundColor: 'rgba(162, 173, 216, 0.18)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  statusBadgeTextActiveLight: {
    color: '#6F51D1',
  },
  statusBadgeTextActiveDark: {
    color: '#FFFFFF',
  },
  statusBadgeTextInactiveLight: {
    color: '#7583A5',
  },
  statusBadgeTextInactiveDark: {
    color: '#A2ADD8',
  },

  /* CONVERSATION CARDS */
  cardsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 24,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#2F2B5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#202941',
    borderWidth: 1,
    borderColor: 'rgba(164, 170, 255, 0.07)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#8E8AA0',
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  avatarMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cardDetailsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactNameText: {
    fontSize: 17,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  timestampText: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreviewText: {
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    flex: 1,
    marginRight: 12,
  },
  unreadPurpleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  /* FILTER MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '75%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  modalTitleText: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalChannelsList: {
    marginVertical: 6,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalChannelIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAllIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAllIconText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  modalOptionLabel: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  modalOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionCount: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCheckboxChecked: {
    backgroundColor: '#8060E8',
  },
  modalFooterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  modalResetButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalResetButtonText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  modalApplyButton: {
    flex: 1.4,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#8060E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
});

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
import { BlurView } from 'expo-blur';
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
  Plus,
  SlidersHorizontal,
  X,
  Check,
  ChevronDown,
  Image as ImageIcon,
} from 'lucide-react-native';
import { OrbionLogo } from '@/components/common/OrbionLogo';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';

export type ChannelType = 'all' | 'whatsapp' | 'instagram' | 'twilio';

export type StatusType = 'all' | 'unread' | 'open' | 'follow_up' | 'converted';

export interface ConversationItem {
  id: string;
  name: string;
  phoneOrHandle: string;
  channel: 'whatsapp' | 'instagram' | 'twilio';
  avatarUrl: string;
  avatarInitials: string;
  avatarColor: string;
  isOnline: boolean;
  status: 'open' | 'follow_up' | 'converted' | 'closed';
  lastMessage: string;
  lastMessageType: 'text' | 'image' | 'audio' | 'ai';
  time: string;
  unreadCount: number;
}

// Authentic Mock Data matching the user uploaded designs
const MOCK_CONVERSATIONS: ConversationItem[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    phoneOrHandle: '+91 98765 43210',
    channel: 'whatsapp',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    avatarInitials: 'PS',
    avatarColor: '#A78BFA',
    isOnline: true,
    status: 'open',
    lastMessage: 'Hi, I want to know more about your saree coll...',
    lastMessageType: 'text',
    time: '2m',
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'TrendyWear Boutique',
    phoneOrHandle: '@trendywear_in',
    channel: 'instagram',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80',
    avatarInitials: 'TW',
    avatarColor: '#F43F5E',
    isOnline: true,
    status: 'open',
    lastMessage: 'Replied to your story',
    lastMessageType: 'image',
    time: '12m',
    unreadCount: 1,
  },
  {
    id: '3',
    name: 'Arun Kumar',
    phoneOrHandle: '+91 94432 10987',
    channel: 'whatsapp',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&q=80',
    avatarInitials: 'AK',
    avatarColor: '#0EA5E9',
    isOnline: true,
    status: 'open',
    lastMessage: 'Where is my order?',
    lastMessageType: 'text',
    time: '25m',
    unreadCount: 1,
  },
  {
    id: '4',
    name: 'Sneha Fashions',
    phoneOrHandle: '+1 (555) 234-5678',
    channel: 'instagram',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    avatarInitials: 'SF',
    avatarColor: '#10B981',
    isOnline: true,
    status: 'follow_up',
    lastMessage: 'Can you confirm our SMS appointment for tomo...',
    lastMessageType: 'text',
    time: '1h',
    unreadCount: 0,
  },
  {
    id: '5',
    name: 'Rohit Mehta',
    phoneOrHandle: '@rohit_m',
    channel: 'instagram',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&q=80',
    avatarInitials: 'RM',
    avatarColor: '#F59E0B',
    isOnline: true,
    status: 'open',
    lastMessage: 'Sent a photo',
    lastMessageType: 'image',
    time: '2h',
    unreadCount: 0,
  },
  {
    id: '6',
    name: 'Anjali Creations',
    phoneOrHandle: '+91 98111 22334',
    channel: 'whatsapp',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80',
    avatarInitials: 'AC',
    avatarColor: '#EC4899',
    isOnline: true,
    status: 'converted',
    lastMessage: 'Thank you! 🙏',
    lastMessageType: 'text',
    time: '3h',
    unreadCount: 0,
  },
  {
    id: '7',
    name: 'Marcus Vance',
    phoneOrHandle: '+1 415 555 0198',
    channel: 'twilio',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&q=80',
    avatarInitials: 'MV',
    avatarColor: '#EF4444',
    isOnline: true,
    status: 'open',
    lastMessage: 'Received the verification code via SMS. Thank yo...',
    lastMessageType: 'text',
    time: '4h',
    unreadCount: 0,
  },
];

// Dedicated Brand Icons matching the exact design
function AllChannelsIcon({ size = 26, isLight = false }: { size?: number; isLight?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10.5" fill={isLight ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.22)'} />
      <Circle cx="12" cy="12" r="5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
      <Circle cx="12" cy="4.5" r="1.5" fill="#FFFFFF" />
      <Circle cx="12" cy="19.5" r="1.5" fill="#FFFFFF" />
      <Circle cx="4.5" cy="12" r="1.5" fill="#FFFFFF" />
      <Circle cx="19.5" cy="12" r="1.5" fill="#FFFFFF" />
    </Svg>
  );
}

function WhatsAppIcon({ size = 26 }: { size?: number }) {
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

function InstagramIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="igIconGrad" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FA7E1E" />
          <Stop offset="35%" stopColor="#D62976" />
          <Stop offset="65%" stopColor="#962FBF" />
          <Stop offset="100%" stopColor="#4F5BD5" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="2" y="2" width="20" height="20" rx="6.5" fill="url(#igIconGrad)" />
      <Rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <Circle cx="12" cy="12" r="3.2" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
      <Circle cx="15.8" cy="8.2" r="0.9" fill="#FFFFFF" />
    </Svg>
  );
}

function TwilioIcon({ size = 26 }: { size?: number }) {
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

export default function OmniInboxScreen() {
  const router = useRouter();
  const { colors, isDark, statusBarStyle } = useAppTheme();
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);

  // Channels state for filter modal
  const [channelFilters, setChannelFilters] = useState([
    { id: 'all', name: 'All Channels', count: 21, checked: true },
    { id: 'whatsapp', name: 'WhatsApp', count: 12, checked: true },
    { id: 'instagram', name: 'Instagram', count: 5, checked: true },
    { id: 'twilio', name: 'Twilio', count: 4, checked: true },
  ]);

  const toggleFilterCheck = (id: string) => {
    setChannelFilters((prev) => {
      if (id === 'all') {
        const nextState = !prev.find((c) => c.id === 'all')?.checked;
        return prev.map((c) => ({ ...c, checked: nextState }));
      }
      const updated = prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c));
      const specific = updated.filter((c) => c.id !== 'all');
      const allChecked = specific.every((c) => c.checked);
      return updated.map((c) => (c.id === 'all' ? { ...c, checked: allChecked } : c));
    });
  };

  const handleResetFilters = () => {
    setChannelFilters((prev) =>
      prev.map((c) => ({
        ...c,
        checked: true,
      }))
    );
  };

  const activeChannelFilterIds = useMemo(() => {
    const isAllChecked = channelFilters.find((c) => c.id === 'all')?.checked;
    if (isAllChecked) return ['whatsapp', 'instagram', 'twilio'];
    return channelFilters.filter((c) => c.checked && c.id !== 'all').map((c) => c.id);
  }, [channelFilters]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return MOCK_CONVERSATIONS.filter((item) => {
      // Channel match from cards
      if (selectedChannel !== 'all' && item.channel !== selectedChannel) {
        return false;
      }
      // Channel match from modal
      if (!activeChannelFilterIds.includes(item.channel)) {
        return false;
      }
      // Status match
      if (selectedStatus === 'unread' && item.unreadCount === 0) {
        return false;
      }
      if (selectedStatus === 'open' && item.status !== 'open') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesHandle = item.phoneOrHandle.toLowerCase().includes(query);
        const matchesMessage = item.lastMessage.toLowerCase().includes(query);
        if (!matchesName && !matchesHandle && !matchesMessage) return false;
      }
      return true;
    });
  }, [selectedChannel, activeChannelFilterIds, selectedStatus, searchQuery]);

  // Mini channel badge on avatar
  const renderChannelMiniBadge = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return (
          <View style={styles.miniBadgeContainer}>
            <WhatsAppIcon size={16} />
          </View>
        );
      case 'instagram':
        return (
          <View style={styles.miniBadgeContainer}>
            <InstagramIcon size={16} />
          </View>
        );
      case 'twilio':
        return (
          <View style={styles.miniBadgeContainer}>
            <TwilioIcon size={16} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: isDark ? '#0A0618' : '#F6F8FC' }]}>
      <StatusBar style="light" />

      {/* Top Header Background Gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['#190F3B', '#110A29', '#0A0618']
            : ['#382A7C', '#4C359E', '#653FBF']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.9 }}
        style={styles.topHeaderGradient}
      >
        <SafeAreaView edges={['top', 'left', 'right']}>
          {/* Header Row: Logo on left, Glass buttons on right */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <OrbionLogo size="sm" showText={true} textColor="#FFFFFF" />
            </View>

            <View style={styles.headerActions}>
              {/* Glassmorphic Search Button */}
              <TouchableOpacity
                style={[
                  styles.glassCircleButton,
                  isDark ? styles.glassDark : styles.glassLight,
                  isSearchActive && styles.glassActive,
                ]}
                activeOpacity={0.75}
                onPress={() => setIsSearchActive(!isSearchActive)}
              >
                <BlurView
                  intensity={20}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                <Search size={19} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>

              {/* Glassmorphic Plus Button - identical background to Search button */}
              <TouchableOpacity
                style={[
                  styles.glassCircleButton,
                  isDark ? styles.glassDark : styles.glassLight,
                ]}
                activeOpacity={0.8}
                onPress={() => setShowChannelModal(true)}
              >
                <BlurView
                  intensity={20}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Expandable Search Input */}
          {isSearchActive && (
            <View
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)',
                },
              ]}
            >
              <Search size={16} color="#FFFFFF" style={styles.searchBarIcon} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search conversations, names or numbers..."
                placeholderTextColor={isDark ? '#A1A1AA' : '#E0E7FF'}
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

          {/* 4 Channel Cards Row */}
          <View style={styles.channelCardsRow}>
            {/* All (21) */}
            <TouchableOpacity
              style={[styles.channelCardOuter]}
              onPress={() => setSelectedChannel('all')}
              activeOpacity={0.85}
            >
              {selectedChannel === 'all' ? (
                <LinearGradient
                  colors={isDark ? ['#8B5CF6', '#6D28D9'] : ['#9333EA', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.channelCardInner, styles.channelCardActiveShadow]}
                >
                  <AllChannelsIcon size={26} isLight={true} />
                  <Text style={styles.activeChannelName}>All</Text>
                  <Text style={styles.activeChannelCount}>(21)</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.channelCardInner,
                    isDark ? styles.channelCardDark : styles.channelCardLight,
                  ]}
                >
                  <AllChannelsIcon size={26} isLight={false} />
                  <Text style={[styles.inactiveChannelName, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
                    All
                  </Text>
                  <Text style={[styles.inactiveChannelCount, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                    (21)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* WhatsApp (12) */}
            <TouchableOpacity
              style={styles.channelCardOuter}
              onPress={() => setSelectedChannel('whatsapp')}
              activeOpacity={0.85}
            >
              {selectedChannel === 'whatsapp' ? (
                <LinearGradient
                  colors={isDark ? ['#8B5CF6', '#6D28D9'] : ['#9333EA', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.channelCardInner, styles.channelCardActiveShadow]}
                >
                  <WhatsAppIcon size={26} />
                  <Text style={styles.activeChannelName}>WhatsApp</Text>
                  <Text style={styles.activeChannelCount}>(12)</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.channelCardInner,
                    isDark ? styles.channelCardDark : styles.channelCardLight,
                  ]}
                >
                  <WhatsAppIcon size={26} />
                  <Text style={[styles.inactiveChannelName, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
                    WhatsApp
                  </Text>
                  <Text style={[styles.inactiveChannelCount, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                    (12)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Instagram (5) */}
            <TouchableOpacity
              style={styles.channelCardOuter}
              onPress={() => setSelectedChannel('instagram')}
              activeOpacity={0.85}
            >
              {selectedChannel === 'instagram' ? (
                <LinearGradient
                  colors={isDark ? ['#8B5CF6', '#6D28D9'] : ['#9333EA', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.channelCardInner, styles.channelCardActiveShadow]}
                >
                  <InstagramIcon size={26} />
                  <Text style={styles.activeChannelName}>Instagram</Text>
                  <Text style={styles.activeChannelCount}>(5)</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.channelCardInner,
                    isDark ? styles.channelCardDark : styles.channelCardLight,
                  ]}
                >
                  <InstagramIcon size={26} />
                  <Text style={[styles.inactiveChannelName, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
                    Instagram
                  </Text>
                  <Text style={[styles.inactiveChannelCount, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                    (5)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Twilio (4) */}
            <TouchableOpacity
              style={styles.channelCardOuter}
              onPress={() => setSelectedChannel('twilio')}
              activeOpacity={0.85}
            >
              {selectedChannel === 'twilio' ? (
                <LinearGradient
                  colors={isDark ? ['#8B5CF6', '#6D28D9'] : ['#9333EA', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.channelCardInner, styles.channelCardActiveShadow]}
                >
                  <TwilioIcon size={26} />
                  <Text style={styles.activeChannelName}>Twilio</Text>
                  <Text style={styles.activeChannelCount}>(4)</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.channelCardInner,
                    isDark ? styles.channelCardDark : styles.channelCardLight,
                  ]}
                >
                  <TwilioIcon size={26} />
                  <Text style={[styles.inactiveChannelName, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
                    Twilio
                  </Text>
                  <Text style={[styles.inactiveChannelCount, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                    (4)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Body Section */}
      <View
        style={[
          styles.mainBodyContainer,
          { backgroundColor: isDark ? '#0A0618' : '#F6F8FC' },
        ]}
      >
        {/* Sub-Filters Pill Row */}
        <View style={styles.subFilterRow}>
          <TouchableOpacity
            style={[
              styles.subFilterPill,
              isDark ? styles.subFilterDark : styles.subFilterLight,
              selectedStatus === 'all' && styles.subFilterPillActive,
            ]}
            onPress={() => setSelectedStatus('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subFilterText, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
              All
            </Text>
            <ChevronDown size={14} color={isDark ? '#9CA3AF' : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subFilterPill,
              isDark ? styles.subFilterDark : styles.subFilterLight,
              selectedStatus === 'unread' && styles.subFilterPillActive,
            ]}
            onPress={() => setSelectedStatus(selectedStatus === 'unread' ? 'all' : 'unread')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subFilterText, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
              Unread
            </Text>
            <ChevronDown size={14} color={isDark ? '#9CA3AF' : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subFilterPill,
              isDark ? styles.subFilterDark : styles.subFilterLight,
              selectedStatus === 'open' && styles.subFilterPillActive,
            ]}
            onPress={() => setSelectedStatus(selectedStatus === 'open' ? 'all' : 'open')}
            activeOpacity={0.7}
          >
            <Text style={[styles.subFilterText, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
              Open
            </Text>
            <ChevronDown size={14} color={isDark ? '#9CA3AF' : '#64748B'} />
          </TouchableOpacity>

          {/* Filter button */}
          <TouchableOpacity
            style={[
              styles.filterIconPill,
              isDark ? styles.subFilterDark : styles.subFilterLight,
            ]}
            onPress={() => setShowChannelModal(true)}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={16} color={isDark ? '#FFFFFF' : '#1E1B4B'} />
          </TouchableOpacity>
        </View>

        {/* Conversation List */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasPhoto = isDark && Boolean(item.avatarUrl);

            return (
              <TouchableOpacity
                style={[
                  styles.convCard,
                  isDark ? styles.convCardDark : styles.convCardLight,
                ]}
                activeOpacity={0.82}
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
                {/* Avatar with Badges */}
                <View style={styles.avatarWrapper}>
                  {hasPhoto ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarInitialsBox, { backgroundColor: item.avatarColor }]}>
                      <Text style={styles.avatarInitialsText}>{item.avatarInitials}</Text>
                    </View>
                  )}

                  {/* Online Dot */}
                  {item.isOnline && (
                    <View
                      style={[
                        styles.onlineDot,
                        { borderColor: isDark ? '#141026' : '#FFFFFF' },
                      ]}
                    />
                  )}

                  {/* Mini Channel Badge */}
                  {renderChannelMiniBadge(item.channel)}
                </View>

                {/* Conversation Details */}
                <View style={styles.convInfo}>
                  <View style={styles.convHeader}>
                    <Text
                      style={[styles.contactName, { color: isDark ? '#FFFFFF' : '#111827' }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.timestamp, { color: isDark ? '#71717A' : '#94A3B8' }]}>
                      {item.time}
                    </Text>
                  </View>

                  <View style={styles.convFooter}>
                    <View style={styles.previewRow}>
                      <Text
                        style={[styles.previewText, { color: isDark ? '#9CA3AF' : '#475569' }]}
                        numberOfLines={1}
                      >
                        {item.lastMessage}
                      </Text>
                      {item.lastMessageType === 'image' && (
                        <ImageIcon size={14} color={isDark ? '#9CA3AF' : '#64748B'} style={styles.msgIcon} />
                      )}
                    </View>

                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Screen 6: Channel Filter Modal */}
      <Modal
        visible={showChannelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChannelModal(false)}
      >
        <SafeAreaView style={[styles.modalBackdrop, { backgroundColor: isDark ? '#0A0618' : '#F6F8FC' }]}>
          <View
            style={[
              styles.filterModalCard,
              {
                backgroundColor: isDark ? '#120E24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Filter Channels
              </Text>
              <TouchableOpacity
                onPress={() => setShowChannelModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
            </View>

            {/* Channels Checklist */}
            <ScrollView
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator={false}
            >
              {channelFilters.map((channel) => {
                const getIcon = () => {
                  switch (channel.id) {
                    case 'whatsapp':
                      return <WhatsAppIcon size={20} />;
                    case 'instagram':
                      return <InstagramIcon size={20} />;
                    case 'twilio':
                      return <TwilioIcon size={20} />;
                    default:
                      return <AllChannelsIcon size={20} isLight={false} />;
                  }
                };

                return (
                  <TouchableOpacity
                    key={channel.id}
                    style={styles.channelFilterRow}
                    onPress={() => toggleFilterCheck(channel.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.filterRowLeft}>
                      <View style={styles.channelFilterIconBox}>{getIcon()}</View>
                      <Text
                        style={[styles.channelFilterName, { color: isDark ? '#FFFFFF' : '#111827' }]}
                      >
                        {channel.name}
                      </Text>
                    </View>

                    <View style={styles.filterRowRight}>
                      {channel.count > 0 && (
                        <Text style={[styles.channelFilterCount, { color: isDark ? '#71717A' : '#94A3B8' }]}>
                          {channel.count}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.checkboxBox,
                          channel.checked && styles.checkboxBoxChecked,
                        ]}
                      >
                        {channel.checked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer Buttons: Reset and Apply */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.resetBtn,
                  {
                    backgroundColor: isDark ? '#1C1635' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  },
                ]}
                onPress={handleResetFilters}
                activeOpacity={0.7}
              >
                <Text style={[styles.resetBtnText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  Reset
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowChannelModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  topHeaderGradient: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glassCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
      : {}),
  },
  glassLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    shadowColor: 'rgb(100, 80, 160)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
      : {}),
  },
  glassActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
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
  channelCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  channelCardOuter: {
    flex: 1,
  },
  channelCardInner: {
    height: 90,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  channelCardDark: {
    backgroundColor: '#141026',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  channelCardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  channelCardActiveShadow: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  activeChannelName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  activeChannelCount: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11.5,
    fontFamily: Fonts.medium,
    marginTop: 2,
    textAlign: 'center',
  },
  inactiveChannelName: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  inactiveChannelCount: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
    marginTop: 2,
    textAlign: 'center',
  },
  mainBodyContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -8,
    paddingTop: 14,
  },
  subFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  subFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 13,
    gap: 6,
  },
  subFilterPillActive: {
    borderColor: '#8B5CF6',
    borderWidth: 1.2,
  },
  subFilterDark: {
    backgroundColor: '#16122C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  subFilterLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  subFilterText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  filterIconPill: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 115,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 18,
    marginBottom: 10,
  },
  convCardDark: {
    backgroundColor: '#130F26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  convCardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 13,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2D2250',
  },
  avatarInitialsBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  miniBadgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convInfo: {
    flex: 1,
  },
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  contactName: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 11.5,
    fontFamily: Fonts.regular,
  },
  convFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 5,
  },
  previewText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    flexShrink: 1,
  },
  msgIcon: {
    marginLeft: 2,
  },
  unreadBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 5.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
  },
  filterModalCard: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalListContent: {
    paddingVertical: 12,
  },
  channelFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  filterRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelFilterIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  channelFilterName: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  filterRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  channelFilterCount: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#52525B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
});

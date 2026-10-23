import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  SlidersHorizontal,
  Camera,
  Mic,
  Bot,
  X,
  MessageSquare,
  Globe,
  Phone,
} from 'lucide-react-native';
import { OrbionLogo } from '@/components/common/OrbionLogo';
import { BrandColors, Fonts } from '@/theme/tokens';

// Channels matched with Web App (CHANNELS in admin/inbox/page.js)
export type ChannelType = 'all' | 'whatsapp' | 'instagram' | 'twilio' | 'website';

export type StatusType = 'all' | 'open' | 'follow_up' | 'converted' | 'closed';

export type SystemTier = 'hot' | 'warm' | 'cold';

export interface ConversationItem {
  id: string;
  name: string;
  phoneOrHandle: string;
  channel: 'whatsapp' | 'instagram' | 'twilio' | 'website';
  avatarInitials: string;
  avatarColor: string;
  isOnline: boolean;
  status: 'open' | 'follow_up' | 'converted' | 'closed';
  systemTier: SystemTier;
  lastMessage: string;
  lastMessageType: 'text' | 'image' | 'audio' | 'ai';
  time: string;
  unreadCount: number;
}

// Authentic Mock Data matching the Auromind AI / Orbion Web App inbox
const MOCK_CONVERSATIONS: ConversationItem[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    phoneOrHandle: '+91 98765 43210',
    channel: 'whatsapp',
    avatarInitials: 'PS',
    avatarColor: '#814AC8',
    isOnline: true,
    status: 'open',
    systemTier: 'hot',
    lastMessage: 'Can you share the price for this saree catalogue?',
    lastMessageType: 'text',
    time: '2m',
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'TrendyWear Boutique',
    phoneOrHandle: '@trendywear_in',
    channel: 'instagram',
    avatarInitials: 'TW',
    avatarColor: '#E1306C',
    isOnline: true,
    status: 'follow_up',
    systemTier: 'hot',
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
    avatarInitials: 'AK',
    avatarColor: '#0EA5E9',
    isOnline: false,
    status: 'open',
    systemTier: 'warm',
    lastMessage: 'Where is my order #ORB-8821 delivery status?',
    lastMessageType: 'text',
    time: '25m',
    unreadCount: 1,
  },
  {
    id: '4',
    name: 'Sneha Fashions',
    phoneOrHandle: '+91 91234 56789',
    channel: 'whatsapp',
    avatarInitials: 'SF',
    avatarColor: '#10B981',
    isOnline: true,
    status: 'converted',
    systemTier: 'warm',
    lastMessage: 'Payment verified! Booking confirmed for bridal demo.',
    lastMessageType: 'ai',
    time: '1h',
    unreadCount: 0,
  },
  {
    id: '5',
    name: 'Rohit Mehta',
    phoneOrHandle: '+91 98840 12345',
    channel: 'twilio',
    avatarInitials: 'RM',
    avatarColor: '#F59E0B',
    isOnline: false,
    status: 'follow_up',
    systemTier: 'cold',
    lastMessage: 'Voice inquiry recorded: 42s',
    lastMessageType: 'audio',
    time: '2h',
    unreadCount: 0,
  },
  {
    id: '6',
    name: 'Anjali Creations',
    phoneOrHandle: '@anjali_creations',
    channel: 'instagram',
    avatarInitials: 'AC',
    avatarColor: '#EC4899',
    isOnline: false,
    status: 'closed',
    systemTier: 'warm',
    lastMessage: 'Thank you! Received the invoice copy.',
    lastMessageType: 'text',
    time: '3h',
    unreadCount: 0,
  },
  {
    id: '7',
    name: 'Zixv Tech Store',
    phoneOrHandle: 'Visitor #3942',
    channel: 'website',
    avatarInitials: 'ZT',
    avatarColor: '#6366F1',
    isOnline: true,
    status: 'open',
    systemTier: 'hot',
    lastMessage: 'Looking for enterprise pricing plan details.',
    lastMessageType: 'text',
    time: '4h',
    unreadCount: 3,
  },
];

export default function OmniInboxScreen() {
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return MOCK_CONVERSATIONS.filter((item) => {
      // Channel match
      if (selectedChannel !== 'all' && item.channel !== selectedChannel) {
        return false;
      }
      // Status match
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
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
  }, [selectedChannel, selectedStatus, searchQuery]);

  // Channel badge counts
  const channelCounts = useMemo(() => {
    return {
      all: MOCK_CONVERSATIONS.length,
      whatsapp: MOCK_CONVERSATIONS.filter((c) => c.channel === 'whatsapp').length,
      instagram: MOCK_CONVERSATIONS.filter((c) => c.channel === 'instagram').length,
      twilio: MOCK_CONVERSATIONS.filter((c) => c.channel === 'twilio').length,
      website: MOCK_CONVERSATIONS.filter((c) => c.channel === 'website').length,
    };
  }, []);

  // Helper for Status Pill matching Web App colors
  const renderStatusPill = (status: ConversationItem['status']) => {
    switch (status) {
      case 'open':
        return (
          <View style={[styles.statusPill, styles.statusOpen]}>
            <View style={[styles.statusDot, styles.dotOpen]} />
            <Text style={[styles.statusPillText, styles.textOpen]}>Open</Text>
          </View>
        );
      case 'follow_up':
        return (
          <View style={[styles.statusPill, styles.statusFollowUp]}>
            <View style={[styles.statusDot, styles.dotFollowUp]} />
            <Text style={[styles.statusPillText, styles.textFollowUp]}>Follow Up</Text>
          </View>
        );
      case 'converted':
        return (
          <View style={[styles.statusPill, styles.statusConverted]}>
            <View style={[styles.statusDot, styles.dotConverted]} />
            <Text style={[styles.statusPillText, styles.textConverted]}>Converted</Text>
          </View>
        );
      case 'closed':
        return (
          <View style={[styles.statusPill, styles.statusClosed]}>
            <View style={[styles.statusDot, styles.dotClosed]} />
            <Text style={[styles.statusPillText, styles.textClosed]}>Closed</Text>
          </View>
        );
    }
  };

  // Helper for Channel mini icon
  const renderChannelMiniBadge = (channel: ConversationItem['channel']) => {
    switch (channel) {
      case 'whatsapp':
        return (
          <View style={[styles.miniChannelBadge, { backgroundColor: '#25D366' }]}>
            <Phone size={9} color="#FFFFFF" />
          </View>
        );
      case 'instagram':
        return (
          <View style={[styles.miniChannelBadge, { backgroundColor: '#E1306C' }]}>
            <Camera size={9} color="#FFFFFF" />
          </View>
        );
      case 'twilio':
        return (
          <View style={[styles.miniChannelBadge, { backgroundColor: '#F22F46' }]}>
            <MessageSquare size={9} color="#FFFFFF" />
          </View>
        );
      case 'website':
        return (
          <View style={[styles.miniChannelBadge, { backgroundColor: '#0EA5E9' }]}>
            <Globe size={9} color="#FFFFFF" />
          </View>
        );
    }
  };

  // Helper for Lead Scoring / System Tier Chip (Hot / Warm / Cold)
  const renderTierBadge = (tier: SystemTier) => {
    switch (tier) {
      case 'hot':
        return (
          <View style={[styles.tierBadge, styles.tierHot]}>
            <Text style={styles.tierTextHot}>🔥 Hot</Text>
          </View>
        );
      case 'warm':
        return (
          <View style={[styles.tierBadge, styles.tierWarm]}>
            <Text style={styles.tierTextWarm}>⚡ Warm</Text>
          </View>
        );
      case 'cold':
        return (
          <View style={[styles.tierBadge, styles.tierCold]}>
            <Text style={styles.tierTextCold}>❄️ Cold</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top App Bar Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <OrbionLogo size="sm" showText={true} />
        </View>

        <View style={styles.headerActions}>
          {/* Toggle Search */}
          <TouchableOpacity
            style={[styles.iconButton, isSearchActive && styles.iconButtonActive]}
            activeOpacity={0.7}
            onPress={() => setIsSearchActive(!isSearchActive)}
          >
            <Search size={18} color={isSearchActive ? '#FFFFFF' : '#A1A1AA'} />
          </TouchableOpacity>

          {/* New Chat Primary Button */}
          <TouchableOpacity
            style={styles.newChatButton}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable Search Input with Inter font */}
      {isSearchActive && (
        <View style={styles.searchBarContainer}>
          <Search size={16} color="#71717A" style={styles.searchBarIcon} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search conversations, names or numbers..."
            placeholderTextColor="#71717A"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#71717A" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Channel Filter Chips Ribbon */}
      <View style={styles.channelScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channelScrollContent}
        >
          {/* All Channels */}
          <TouchableOpacity
            style={[
              styles.channelChip,
              selectedChannel === 'all' && styles.channelChipActive,
            ]}
            onPress={() => setSelectedChannel('all')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.channelChipText,
                selectedChannel === 'all' && styles.channelChipTextActive,
              ]}
            >
              All Channels ({channelCounts.all})
            </Text>
          </TouchableOpacity>

          {/* WhatsApp */}
          <TouchableOpacity
            style={[
              styles.channelChip,
              selectedChannel === 'whatsapp' && styles.channelChipActive,
            ]}
            onPress={() => setSelectedChannel('whatsapp')}
            activeOpacity={0.75}
          >
            <View style={[styles.channelDot, { backgroundColor: '#25D366' }]} />
            <Text
              style={[
                styles.channelChipText,
                selectedChannel === 'whatsapp' && styles.channelChipTextActive,
              ]}
            >
              WhatsApp ({channelCounts.whatsapp})
            </Text>
          </TouchableOpacity>

          {/* Instagram */}
          <TouchableOpacity
            style={[
              styles.channelChip,
              selectedChannel === 'instagram' && styles.channelChipActive,
            ]}
            onPress={() => setSelectedChannel('instagram')}
            activeOpacity={0.75}
          >
            <View style={[styles.channelDot, { backgroundColor: '#E1306C' }]} />
            <Text
              style={[
                styles.channelChipText,
                selectedChannel === 'instagram' && styles.channelChipTextActive,
              ]}
            >
              Instagram ({channelCounts.instagram})
            </Text>
          </TouchableOpacity>

          {/* Twilio */}
          <TouchableOpacity
            style={[
              styles.channelChip,
              selectedChannel === 'twilio' && styles.channelChipActive,
            ]}
            onPress={() => setSelectedChannel('twilio')}
            activeOpacity={0.75}
          >
            <View style={[styles.channelDot, { backgroundColor: '#F22F46' }]} />
            <Text
              style={[
                styles.channelChipText,
                selectedChannel === 'twilio' && styles.channelChipTextActive,
              ]}
            >
              Twilio ({channelCounts.twilio})
            </Text>
          </TouchableOpacity>

          {/* Website Chat */}
          <TouchableOpacity
            style={[
              styles.channelChip,
              selectedChannel === 'website' && styles.channelChipActive,
            ]}
            onPress={() => setSelectedChannel('website')}
            activeOpacity={0.75}
          >
            <View style={[styles.channelDot, { backgroundColor: '#0EA5E9' }]} />
            <Text
              style={[
                styles.channelChipText,
                selectedChannel === 'website' && styles.channelChipTextActive,
              ]}
            >
              Web Chat ({channelCounts.website})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Sub-Filter Tabs: All | Open | Follow Up | Converted */}
      <View style={styles.subFilterRow}>
        {(['all', 'open', 'follow_up', 'converted'] as StatusType[]).map((st) => {
          const isActive = selectedStatus === st;
          const label =
            st === 'all'
              ? 'All Status'
              : st === 'open'
              ? 'Open'
              : st === 'follow_up'
              ? 'Follow Up'
              : 'Converted';
          return (
            <TouchableOpacity
              key={st}
              style={[styles.subFilterTab, isActive && styles.subFilterTabActive]}
              onPress={() => setSelectedStatus(st)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.subFilterTabText,
                  isActive && styles.subFilterTabTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Conversation List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.convCard}
            activeOpacity={0.8}
            onPress={() => {
              // Navigates to chat detail in subsequent steps
            }}
          >
            {/* Avatar with Channel Badge and Online Indicator */}
            <View style={styles.avatarWrapper}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: item.avatarColor },
                ]}
              >
                <Text style={styles.avatarInitials}>{item.avatarInitials}</Text>
              </View>

              {/* Online Dot */}
              {item.isOnline && <View style={styles.onlineDot} />}

              {/* Mini Channel Badge on bottom-right corner */}
              {renderChannelMiniBadge(item.channel)}
            </View>

            {/* Conversation Details */}
            <View style={styles.convInfo}>
              {/* Row 1: Name + System Tier + Timestamp */}
              <View style={styles.convHeader}>
                <View style={styles.nameRow}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {renderTierBadge(item.systemTier)}
                </View>
                <Text style={styles.timestamp}>{item.time}</Text>
              </View>

              {/* Row 2: Status Pill */}
              <View style={styles.statusPillRow}>
                {renderStatusPill(item.status)}
              </View>

              {/* Row 3: Last Message Preview + Unread Count Badge */}
              <View style={styles.convFooter}>
                <View style={styles.previewContainer}>
                  {item.lastMessageType === 'image' && (
                    <Camera size={14} color="#A1A1AA" style={styles.previewIcon} />
                  )}
                  {item.lastMessageType === 'audio' && (
                    <Mic size={14} color="#A1A1AA" style={styles.previewIcon} />
                  )}
                  {item.lastMessageType === 'ai' && (
                    <View style={styles.aiBadge}>
                      <Bot size={11} color="#A855F7" />
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.lastMessageText,
                      item.unreadCount > 0 && styles.lastMessageUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                </View>

                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={36} color="#3F3F46" />
            <Text style={styles.emptyTitle}>No conversations found</Text>
            <Text style={styles.emptySubtitle}>
              Try clearing filters or search queries to see more.
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => {
                setSelectedChannel('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
            >
              <Text style={styles.emptyResetText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#15161C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: BrandColors.primaryDark,
    borderColor: BrandColors.primaryLight,
  },
  newChatButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15161C',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  channelScrollWrapper: {
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 8,
  },
  channelScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#121217',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  channelChipActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primaryLight,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  channelChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  channelChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
  },
  channelDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  subFilterTab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  subFilterTabActive: {
    backgroundColor: 'rgba(129, 74, 200, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(129, 74, 200, 0.4)',
  },
  subFilterTabText: {
    color: '#71717A',
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  subFilterTabTextActive: {
    color: BrandColors.primaryLight,
    fontFamily: Fonts.semiBold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 10,
  },
  convCard: {
    flexDirection: 'row',
    backgroundColor: '#15161C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 12,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#15161C',
  },
  miniChannelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#15161C',
  },
  convInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  timestamp: {
    color: '#71717A',
    fontSize: 11,
    fontFamily: Fonts.regular,
  },
  statusPillRow: {
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
  },
  statusOpen: {
    backgroundColor: '#09221A',
    borderColor: '#14533E',
  },
  dotOpen: {
    backgroundColor: '#25D366',
  },
  textOpen: {
    color: '#25D366',
  },
  statusFollowUp: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  dotFollowUp: {
    backgroundColor: '#FBBF24',
  },
  textFollowUp: {
    color: '#FBBF24',
  },
  statusConverted: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  dotConverted: {
    backgroundColor: '#A855F7',
  },
  textConverted: {
    color: '#A855F7',
  },
  statusClosed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dotClosed: {
    backgroundColor: '#9CA3AF',
  },
  textClosed: {
    color: '#9CA3AF',
  },
  tierBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tierHot: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  tierTextHot: {
    color: '#EF4444',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  tierWarm: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  tierTextWarm: {
    color: '#F59E0B',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  tierCold: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  tierTextCold: {
    color: '#3B82F6',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  convFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  previewIcon: {
    marginRight: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 6,
    gap: 2,
  },
  aiBadgeText: {
    color: '#A855F7',
    fontSize: 9,
    fontFamily: Fonts.bold,
  },
  lastMessageText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  lastMessageUnread: {
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#71717A',
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyResetBtn: {
    marginTop: 12,
    backgroundColor: '#1E1E28',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyResetText: {
    color: BrandColors.primaryLight,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
});

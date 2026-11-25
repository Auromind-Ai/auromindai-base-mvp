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
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
  Pressable,
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
  Line,
  G,
} from 'react-native-svg';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  X,
  Check,
  LogIn,
} from 'lucide-react-native';
import { AddLeadModal } from '../../components/leads/AddLeadModal';
import { Fonts } from '@/theme/tokens';
import { scaleContainer, scaleHeight, scaleFont } from '@/theme/responsive';
import { useAppTheme } from '@/context/theme-context';
import { fetchConversations, fetchConversationCounts, BackendConversation } from '@/api';
import { verifyOTP } from '@/api/auth';
import { useAuth, authStore } from '@/store/auth';
import { useWorkspaceRealtime } from '@/hooks/use-workspace-realtime';
import { getInitials, getAvatarColor, formatShortTime } from '@/utils/formatters';

export type ChannelType = 'all' | 'whatsapp' | 'instagram' | 'twilio';
export type StatusType = 'all' | 'unread' | 'open';

export interface ConversationItem {
  id: string;
  name: string;
  phone?: string;
  channel: 'whatsapp' | 'instagram' | 'twilio';
  avatarUrl: string;
  avatarInitials: string;
  avatarBg: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  status: 'open' | 'unread' | 'closed';
}

// WhatsApp Icon
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="24" fill="#25D366" />
      <Path
        d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z"
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

// All (4-Square Grid) Icon matching Design Image 2
function AllGridIcon({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="2" width="9" height="9" rx="2.6" fill="#FFFFFF" />
      <Rect x="13" y="2" width="9" height="9" rx="2.6" fill="#FFFFFF" />
      <Rect x="2" y="13" width="9" height="9" rx="2.6" fill="#FFFFFF" />
      <Rect x="13" y="13" width="9" height="9" rx="2.6" fill="#FFFFFF" />
    </Svg>
  );
}

// WhatsApp Channel Icon matching Design Image 2 (Green circle with white rim and phone)
function WhatsAppChannelIcon({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="22" fill="#25D366" stroke="#FFFFFF" strokeWidth="2.5" />
      <Path
        d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// Instagram Channel Icon matching Design Image 2 (Squircle gradient + camera glyph)
function InstagramChannelIcon({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="igChannelPillGrad" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FA7E1E" />
          <Stop offset="40%" stopColor="#D62976" />
          <Stop offset="70%" stopColor="#962FBF" />
          <Stop offset="100%" stopColor="#4F5BD5" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="24" height="24" rx="7.5" fill="url(#igChannelPillGrad)" />
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

// Twilio Channel Icon matching Design Image 2 (Red circle with 4 white dots)
function TwilioChannelIcon({ size = 38 }: { size?: number }) {
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



// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch {
    // Ignore in Fabric / New Architecture
  }
}

// Premium iOS Spring Transition Curve
const IOS_SPRING_LAYOUT = {
  duration: 380,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.spring,
    springDamping: 0.82,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

// Premium Channel Category Pill (Redesigned per Design Image 2 Pattern)
function ChannelCategoryPill({
  label,
  count,
  isSelected,
  onPress,
  isDark,
  isSmallDevice,
  renderIcon,
}: {
  id: ChannelType;
  label: string;
  count: number;
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
  isSmallDevice: boolean;
  renderIcon: () => React.ReactNode;
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 25,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const pillWidth = isSmallDevice ? 64 : 70;
  const pillHeight = isSmallDevice ? 21 : 24;
  const pillRadius = isSmallDevice ? 9 : 10;
  const iconWrapperHeight = isSmallDevice ? 34 : 38;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.channelCategoryTouchable}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.channelCategoryItem]}>
        {/* Outer pill wrapper that holds the pill backdrop and the taller icon */}
        <View
          style={[
            styles.channelPillCardWrapper,
            { width: pillWidth, height: iconWrapperHeight },
          ]}
        >
          {/* Glass Pill Backdrop (Decreased height and smaller border radius) */}
          <View
            style={[
              styles.channelGlassCapsule,
              {
                width: pillWidth,
                height: pillHeight,
                borderRadius: pillRadius,
                borderWidth: isSelected ? 1.5 : 1.2,
                borderColor: isSelected
                  ? '#FFFFFF'
                  : isDark
                  ? 'rgba(175, 165, 255, 0.32)'
                  : 'rgba(255, 255, 255, 0.40)',
              },
            ]}
          >
            {/* Background gradient matching the top section overall gradient */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: pillRadius, overflow: 'hidden' },
              ]}
            >
              <LinearGradient
                colors={
                  isSelected
                    ? isDark
                      ? ['rgba(210, 200, 255, 0.52)', 'rgba(135, 120, 250, 0.42)', 'rgba(75, 65, 190, 0.50)']
                      : ['rgba(242, 238, 255, 0.68)', 'rgba(185, 175, 255, 0.48)', 'rgba(135, 125, 225, 0.42)']
                    : isDark
                    ? ['rgba(152, 142, 255, 0.32)', 'rgba(90, 80, 205, 0.26)', 'rgba(45, 40, 115, 0.45)']
                    : ['rgba(220, 215, 255, 0.42)', 'rgba(155, 145, 230, 0.32)', 'rgba(100, 95, 175, 0.38)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Top Gloss Highlight Sheen */}
              <View
                style={[
                  styles.channelGlassSheen,
                  {
                    borderTopLeftRadius: pillRadius - 2,
                    borderTopRightRadius: pillRadius - 2,
                  },
                ]}
              />
            </View>
          </View>

          {/* Logo extending above the top of the pill container */}
          <View style={styles.channelIconWrapper}>
            {renderIcon()}

            {/* Notification Badge if count > 0 */}
            {count > 0 && (
              <View style={styles.channelCountBadge}>
                <Text style={styles.channelCountBadgeText}>
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Category Label */}
        <Text
          style={[
            styles.channelCategoryLabel,
            isSmallDevice && styles.channelCategoryLabelSmall,
            isSelected
              ? styles.channelCategoryLabelActive
              : styles.channelCategoryLabelInactive,
          ]}
        >
          {label}
        </Text>

        {/* Active Underline Indicator Bar */}
        <View
          style={[
            styles.channelActiveIndicator,
            isSmallDevice && styles.channelActiveIndicatorSmall,
            {
              backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// Premium Animated Status Pill
function AnimatedStatusPill({
  label,
  count,
  isSelected,
  onPress,
  isDark,
  isSmallDevice,
}: {
  id: StatusType;
  label: string;
  count: number;
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
  isSmallDevice: boolean;
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [activeAnim] = useState(() => new Animated.Value(isSelected ? 1 : 0));

  React.useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 320,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [isSelected, activeAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 25,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.statusPillWrapper]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            styles.statusPillInactiveBase,
            isDark ? styles.statusPillInactiveDark : styles.statusPillInactiveLight,
            isSmallDevice && styles.statusPillSmall,
            { overflow: 'hidden', position: 'relative' },
          ]}
        >
          {/* Animated Active Gradient Overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { opacity: activeAnim },
            ]}
          >
            <LinearGradient
              colors={isDark ? ['#A69BFF', '#7655F0', '#6241DD'] : ['#8060E8', '#6749DE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Inactive Content Layer */}
          <Animated.View
            style={[
              styles.statusPillInnerRow,
              isSmallDevice && styles.statusPillInnerRowSmall,
              { opacity: activeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isDark ? styles.statusTextInactiveDark : styles.statusTextInactiveLight,
                isSmallDevice && styles.statusTextSmall,
              ]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isDark ? styles.statusBadgeInactiveDark : styles.statusBadgeInactiveLight,
                isSmallDevice && styles.statusBadgeSmall,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isDark ? styles.statusBadgeTextInactiveDark : styles.statusBadgeTextInactiveLight,
                  isSmallDevice && styles.statusBadgeTextSmall,
                ]}
              >
                {count}
              </Text>
            </View>
          </Animated.View>

          {/* Active Content Layer (Overlayed perfectly on top) */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.statusPillInnerRow,
              isSmallDevice && styles.statusPillInnerRowSmall,
              {
                justifyContent: 'center',
                alignItems: 'center',
                opacity: activeAnim,
              },
            ]}
          >
            <Text
              style={[
                styles.statusTextActive,
                isSmallDevice && styles.statusTextSmall,
              ]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isDark ? styles.statusBadgeActiveDark : styles.statusBadgeActiveLight,
                isSmallDevice && styles.statusBadgeSmall,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isDark ? styles.statusBadgeTextActiveDark : styles.statusBadgeTextActiveLight,
                  isSmallDevice && styles.statusBadgeTextSmall,
                ]}
              >
                {count}
              </Text>
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Premium Animated Filter Button
function AnimatedFilterButton({
  onPress,
  isDark,
  isSmallDevice,
}: {
  onPress: () => void;
  isDark: boolean;
  isSmallDevice: boolean;
}) {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 25,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.filterButtonPill]}>
      <TouchableOpacity
        style={[
          styles.statusPillInactiveBase,
          isDark ? styles.statusPillInactiveDark : styles.statusPillInactiveLight,
          isSmallDevice && styles.statusPillSmall,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.92}
      >
        <Filter size={isSmallDevice ? 13 : 15} color={isDark ? '#A2ADD8' : '#7583A5'} />
        <Text
          style={[
            styles.statusPillText,
            isDark ? styles.statusTextInactiveDark : styles.statusTextInactiveLight,
            isSmallDevice && styles.statusTextSmall,
          ]}
        >
          Filter
        </Text>
        <ChevronDown size={isSmallDevice ? 12 : 14} color={isDark ? '#A2ADD8' : '#7583A5'} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function OmniInboxScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isSmallDevice = screenWidth < 400;

  // State
  const authState = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusType>('all');

  const handleSelectChannel = (channel: ChannelType) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(IOS_SPRING_LAYOUT);
    }
    setSelectedChannel(channel);
  };

  const handleSelectStatus = (status: StatusType) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(IOS_SPRING_LAYOUT);
    }
    setSelectedStatus(status);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [createdLeadSuccess, setCreatedLeadSuccess] = useState<{ name: string } | null>(null);
  const [leadSuccessToast, setLeadSuccessToast] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const [serverConversations, setServerConversations] = useState<ConversationItem[]>([]);
  const [counts, setCounts] = useState<{ all: number; whatsapp: number; instagram: number; twilio: number; open: number; unread: number }>({
    all: 0,
    whatsapp: 0,
    instagram: 0,
    twilio: 0,
    open: 0,
    unread: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [devLoggingIn, setDevLoggingIn] = useState(false);

  const handleDevQuickLogin = async () => {
    try {
      setDevLoggingIn(true);
      const res = await verifyOTP('yogisanjay278@gmail.com', '123456', 'login');
      if (res?.access_token && res?.user) {
        await authStore.setAuth({
          token: res.access_token,
          user: res.user,
          workspaces: res.workspaces,
        });
      }
    } catch (e: any) {
      console.warn('Dev quick login failed:', e);
    } finally {
      setDevLoggingIn(false);
    }
  };

  const workspaceId = (authState.selectedWorkspace?.id && !authState.selectedWorkspace.id.startsWith('ws-'))
    ? authState.selectedWorkspace.id
    : (authState.workspaces.find((w) => !w.id.startsWith('ws-'))?.id || '');

  React.useEffect(() => {
    if (authState.token && (!workspaceId || authState.workspaces.length === 0)) {
      authStore.refreshWorkspaces().catch(() => {});
    }
  }, [authState.token, workspaceId, authState.workspaces.length]);

  const loadInboxData = React.useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const statusParam =
        selectedStatus === 'unread' ? 'UNREAD' : selectedStatus === 'open' ? 'OPEN' : 'ALL';

      const [activeCounts, allCounts, waCounts, igCounts, twCounts, convs] = await Promise.all([
        selectedChannel !== 'all'
          ? fetchConversationCounts({ workspaceId, channel: selectedChannel }).catch(() => null)
          : Promise.resolve(null),
        fetchConversationCounts({ workspaceId }).catch(() => null),
        fetchConversationCounts({ workspaceId, channel: 'whatsapp' }).catch(() => null),
        fetchConversationCounts({ workspaceId, channel: 'instagram' }).catch(() => null),
        fetchConversationCounts({ workspaceId, channel: 'twilio' }).catch(() => null),
        fetchConversations({
          workspaceId,
          channel: selectedChannel !== 'all' ? selectedChannel : undefined,
          status: statusParam,
        }),
      ]);

      const statusSource = activeCounts || allCounts;
      if (allCounts || statusSource) {
        setCounts({
          all: statusSource?.all ?? 0,
          open: statusSource?.open ?? 0,
          unread: statusSource?.unread ?? 0,
          whatsapp: waCounts?.all ?? 0,
          instagram: igCounts?.all ?? 0,
          twilio: twCounts?.all ?? 0,
        });
      }

      if (Array.isArray(convs)) {
        const mapped: ConversationItem[] = convs.map((c: BackendConversation, idx: number) => {
          let ch: 'whatsapp' | 'instagram' | 'twilio' = 'whatsapp';
          const rawCh = (c.channel || '').toLowerCase();
          if (rawCh.includes('instagram')) ch = 'instagram';
          else if (rawCh.includes('twilio')) ch = 'twilio';

          const name = c.contact_name || c.phone || 'Customer';
          const isUnread = (c.unread_count || 0) > 0;
          const st: ConversationItem['status'] =
            (c.status || '').toLowerCase() === 'closed' ? 'closed' : isUnread ? 'unread' : 'open';

          return {
            id: String(c.id),
            name,
            phone: c.phone || '',
            channel: ch,
            avatarUrl: c.profile_pic || '',
            avatarInitials: getInitials(name, 'CU'),
            avatarBg: getAvatarColor(idx),
            lastMessage: c.last_message || 'No messages yet',
            time: formatShortTime(c.last_message_at || c.created_at, 'Recently'),
            unread: isUnread,
            status: st,
          };
        });
        setServerConversations(mapped);
        setLoadError(null);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load conversations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, selectedChannel, selectedStatus]);

  React.useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      if (!cancelled) await loadInboxData();
    };
    sync();
    const pollInterval = setInterval(sync, 15000);
    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [loadInboxData]);

  useWorkspaceRealtime((evt) => {
    const evType = evt.event_type || evt.event || evt.type || '';
    if (evType === 'new_message' || evType === 'conversation_updated' || evType === 'message_status_updated') {
      loadInboxData();
    }
  });

  const channelCounts = counts;

  const filteredConversations = useMemo(() => {
    return serverConversations.filter((item) => {
      if (selectedChannel !== 'all' && item.channel !== selectedChannel) return false;
      if (selectedStatus === 'unread' && !item.unread) return false;
      if (selectedStatus === 'open' && item.status === 'closed') return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        if (!item.name.toLowerCase().includes(query) && !item.lastMessage.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [serverConversations, selectedChannel, selectedStatus, searchQuery]);

  // Mini badge overlapping the bottom-right corner of avatar
  const renderAvatarChannelBadge = (channel: 'whatsapp' | 'instagram' | 'twilio') => {
    const badgeBorderColor = isDark ? '#202941' : '#FFFFFF';
    const iconSize = isSmallDevice ? 15 : 20;
    return (
      <View
        style={[
          styles.avatarMiniBadge,
          { borderColor: badgeBorderColor },
          isSmallDevice && styles.avatarMiniBadgeSmall,
        ]}
      >
        {channel === 'whatsapp' && <WhatsAppIcon size={iconSize} />}
        {channel === 'instagram' && <InstagramIcon size={iconSize} />}
        {channel === 'twilio' && <TwilioIcon size={iconSize} />}
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

              {/* Add New Lead Glass Button */}
              <TouchableOpacity
                style={[
                  styles.glassActionButton,
                  isDark ? styles.glassActionDark : styles.glassActionLight,
                ]}
                activeOpacity={0.75}
                onPress={() => setShowAddLeadModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Add New Lead"
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.4} />
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

          {/* CHANNEL CATEGORIES (REDESIGNED PER DESIGN IMAGE 2 PATTERN) */}
          <View style={styles.channelCategoriesContainer}>
            <View style={styles.channelCategoriesRow}>
              {/* 1. All */}
              <ChannelCategoryPill
                id="all"
                label="All"
                count={channelCounts.all}
                isSelected={selectedChannel === 'all'}
                onPress={() => handleSelectChannel('all')}
                isDark={isDark}
                isSmallDevice={isSmallDevice}
                renderIcon={() => <AllGridIcon size={isSmallDevice ? 30 : 34} />}
              />

              {/* 2. WhatsApp */}
              <ChannelCategoryPill
                id="whatsapp"
                label="WhatsApp"
                count={channelCounts.whatsapp}
                isSelected={selectedChannel === 'whatsapp'}
                onPress={() => handleSelectChannel(selectedChannel === 'whatsapp' ? 'all' : 'whatsapp')}
                isDark={isDark}
                isSmallDevice={isSmallDevice}
                renderIcon={() => <WhatsAppChannelIcon size={isSmallDevice ? 34 : 38} />}
              />

              {/* 3. Instagram */}
              <ChannelCategoryPill
                id="instagram"
                label="Instagram"
                count={channelCounts.instagram}
                isSelected={selectedChannel === 'instagram'}
                onPress={() => handleSelectChannel(selectedChannel === 'instagram' ? 'all' : 'instagram')}
                isDark={isDark}
                isSmallDevice={isSmallDevice}
                renderIcon={() => <InstagramChannelIcon size={isSmallDevice ? 34 : 38} />}
              />

              {/* 4. Twilio */}
              <ChannelCategoryPill
                id="twilio"
                label="Twilio"
                count={channelCounts.twilio}
                isSelected={selectedChannel === 'twilio'}
                onPress={() => handleSelectChannel(selectedChannel === 'twilio' ? 'all' : 'twilio')}
                isDark={isDark}
                isSmallDevice={isSmallDevice}
                renderIcon={() => <TwilioChannelIcon size={isSmallDevice ? 34 : 38} />}
              />
            </View>
            
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
        <View style={[styles.statusFiltersRow, isSmallDevice && styles.statusFiltersRowSmall]}>
          <AnimatedStatusPill
            id="all"
            label="All"
            count={counts.all}
            isSelected={selectedStatus === 'all'}
            onPress={() => handleSelectStatus('all')}
            isDark={isDark}
            isSmallDevice={isSmallDevice}
          />

          <AnimatedStatusPill
            id="unread"
            label="Unread"
            count={counts.unread}
            isSelected={selectedStatus === 'unread'}
            onPress={() => handleSelectStatus(selectedStatus === 'unread' ? 'all' : 'unread')}
            isDark={isDark}
            isSmallDevice={isSmallDevice}
          />

          <AnimatedStatusPill
            id="open"
            label="Open"
            count={counts.open}
            isSelected={selectedStatus === 'open'}
            onPress={() => handleSelectStatus(selectedStatus === 'open' ? 'all' : 'open')}
            isDark={isDark}
            isSmallDevice={isSmallDevice}
          />

          <AnimatedFilterButton
            onPress={() => setShowFilterModal(true)}
            isDark={isDark}
            isSmallDevice={isSmallDevice}
          />
        </View>

        {/* CONVERSATION CARDS LIST */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.cardsListContent,
            isSmallDevice && styles.cardsListContentSmall,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadInboxData();
              }}
              tintColor="#8060E8"
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#8060E8" />
              </View>
            ) : loadError ? (
              <TouchableOpacity
                onPress={loadInboxData}
                style={{ margin: 20, padding: 16, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center' }}
              >
                <Text style={{ color: '#EF4444', fontWeight: '600', marginBottom: 4 }}>{loadError}</Text>
                <Text style={{ color: isDark ? '#A2ADD8' : '#6B7280', fontSize: 12 }}>Tap to retry</Text>
              </TouchableOpacity>
            ) : !authState.token ? (
              <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? 'rgba(128,96,232,0.18)' : 'rgba(128,96,232,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <LogIn size={26} color="#8060E8" />
                </View>
                <Text style={{ color: isDark ? '#F1F3FB' : '#1A1C29', fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>
                  Sign in to view conversations
                </Text>
                <Text style={{ color: isDark ? '#A2ADD8' : '#7887A9', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18, maxWidth: 280 }}>
                  Please sign in to access your leads and messages from WhatsApp and Instagram.
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/login')}
                    style={{
                      backgroundColor: '#8060E8',
                      paddingHorizontal: 22,
                      paddingVertical: 12,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                      Go to Login
                    </Text>
                  </TouchableOpacity>
                  {__DEV__ && (
                    <TouchableOpacity
                      onPress={handleDevQuickLogin}
                      disabled={devLoggingIn}
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      }}
                    >
                      {devLoggingIn ? (
                        <ActivityIndicator size="small" color="#8060E8" />
                      ) : (
                        <Text style={{ color: isDark ? '#D1D5DB' : '#374151', fontWeight: '600', fontSize: 13 }}>
                          Quick Dev Login
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : !workspaceId ? (
              <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' }}>
                <Text style={{ color: isDark ? '#F1F3FB' : '#1A1C29', fontSize: 16, fontWeight: '600', marginBottom: 6 }}>
                  Connecting to workspace...
                </Text>
                <Text style={{ color: isDark ? '#A2ADD8' : '#7887A9', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                  Syncing your workspace leads and channel data.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    authStore.refreshWorkspaces();
                    loadInboxData();
                  }}
                  style={{ backgroundColor: isDark ? '#2A2C40' : '#E9ECEF', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 }}
                >
                  <Text style={{ color: isDark ? '#F1F3FB' : '#1A1C29', fontWeight: '600', fontSize: 13 }}>
                    Refresh Workspace
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                <Text style={{ color: isDark ? '#A2ADD8' : '#7887A9', fontSize: 14 }}>
                  No conversations found
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const hasValidImage = Boolean(item.avatarUrl) && !imageErrors[item.id];

            return (
              <TouchableOpacity
                style={[
                  styles.conversationCard,
                  isDark ? styles.cardDark : styles.cardLight,
                  isSmallDevice && styles.conversationCardSmall,
                ]}
                activeOpacity={0.88}
                onPress={() => {
                  router.push({
                    pathname: '/chat/[id]',
                    params: {
                      id: item.id,
                      channel: item.channel,
                      name: item.name,
                      phone: item.phone || '',
                    },
                  });
                }}
              >
                {/* Avatar with overlapping channel logo */}
                <View style={[styles.avatarContainer, isSmallDevice && styles.avatarContainerSmall]}>
                  {hasValidImage ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={[styles.avatarImage, isSmallDevice && styles.avatarImageSmall]}
                      onError={() =>
                        setImageErrors((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarFallback,
                        { backgroundColor: item.avatarBg },
                        isSmallDevice && styles.avatarFallbackSmall,
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarFallbackText,
                          isSmallDevice && styles.avatarFallbackTextSmall,
                        ]}
                      >
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
                  <View style={[styles.cardHeaderRow, isSmallDevice && styles.cardHeaderRowSmall]}>
                    <Text
                      style={[
                        styles.contactNameText,
                        { color: isDark ? '#F5F4FF' : '#211D3D' },
                        isSmallDevice && styles.contactNameTextSmall,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.timestampText,
                        { color: isDark ? '#A8B4D9' : '#7C8AA9' },
                        isSmallDevice && styles.timestampTextSmall,
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
                        isSmallDevice && styles.messagePreviewTextSmall,
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
                          isSmallDevice && styles.unreadPurpleDotSmall,
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
                { id: 'all', label: 'All Channels', count: counts.all, icon: null },
                { id: 'whatsapp', label: 'WhatsApp', count: counts.whatsapp, icon: <WhatsAppIcon size={22} /> },
                { id: 'instagram', label: 'Instagram', count: counts.instagram, icon: <InstagramIcon size={22} /> },
                { id: 'twilio', label: 'Twilio', count: counts.twilio, icon: <TwilioIcon size={22} /> },
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

      {/* ADD NEW LEAD MODAL */}
      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onSuccess={(newLead) => {
          loadInboxData();
          setCreatedLeadSuccess({
            name: newLead?.name || 'Customer',
          });
        }}
      />

      {/* LEAD CREATED SUCCESS BOTTOM SHEET CARD (Matching Edit-Profile Congrats UI) */}
      <Modal
        visible={!!createdLeadSuccess}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCreatedLeadSuccess(null)}
      >
        <View style={styles.statusSheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCreatedLeadSuccess(null)}
          />
          <View
            style={[
              styles.statusSheetCard,
              {
                backgroundColor: isDark ? '#181C2E' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            {/* Header: Title ("Add Lead") + Circular Close Button (X) */}
            <View style={styles.statusSheetHeader}>
              <Text
                style={[
                  styles.statusSheetHeaderTitle,
                  { color: isDark ? '#FFFFFF' : '#1A2138' },
                ]}
              >
                Add Lead
              </Text>
              <TouchableOpacity
                style={[
                  styles.statusSheetCloseBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setCreatedLeadSuccess(null)}
              >
                <X size={16} color={isDark ? '#FFFFFF' : '#475569'} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Illustration Section */}
            <View style={styles.statusSheetIllustration}>
              <Svg width={220} height={150} viewBox="0 0 220 150" fill="none">
                {/* Subtle circular halo background */}
                <Circle
                  cx="110"
                  cy="75"
                  r="60"
                  fill={isDark ? '#222B48' : '#EDE9FE'}
                  opacity={isDark ? 0.7 : 0.8}
                />

                {/* Sparkle / decorative dots */}
                <Circle cx="168" cy="34" r="2.5" fill="#7655F0" opacity={0.8} />
                <Circle cx="52" cy="118" r="3" fill="#7655F0" opacity={0.65} />

                {/* Floating window / lead card */}
                <Rect
                  x="35"
                  y="40"
                  width="150"
                  height="85"
                  rx="12"
                  fill={isDark ? '#161B2E' : '#FFFFFF'}
                  stroke={isDark ? '#2C3555' : '#E2E8F0'}
                  strokeWidth="1.5"
                />

                {/* Window title bar 3 dots */}
                <Circle cx="48" cy="51" r="2.2" fill="#7655F0" />
                <Circle cx="55" cy="51" r="2.2" fill="#9E8CFC" />
                <Circle cx="62" cy="51" r="2.2" fill="#C4B5FD" />

                {/* Window title bar divider */}
                <Line
                  x1="35"
                  y1="59"
                  x2="185"
                  y2="59"
                  stroke={isDark ? '#232C48' : '#F1F5F9'}
                  strokeWidth="1"
                />

                {/* Glowing Shield with Checkmark on left */}
                <G transform="translate(68, 88)">
                  {/* Outer shield glow */}
                  <Path
                    d="M 0,-18 L 16,-12 C 16,3 10,12 0,18 C -10,12 -16,3 -16,-12 Z"
                    fill={isDark ? 'rgba(118, 85, 240, 0.25)' : 'rgba(118, 85, 240, 0.15)'}
                  />
                  {/* Inner shield */}
                  <Path
                    d="M 0,-15 L 13,-10 C 13,2 8,10 0,15 C -8,10 -13,2 -13,-10 Z"
                    fill={isDark ? '#2C2658' : '#EDE9FE'}
                    stroke="#7655F0"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {/* Checkmark inside shield */}
                  <Path
                    d="M -5,0 L -1,4 L 6,-4"
                    stroke={isDark ? '#FFFFFF' : '#7655F0'}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </G>

                {/* Lead data preview lines on right */}
                <Rect
                  x="96"
                  y="69"
                  width="74"
                  height="6"
                  rx="3"
                  fill={isDark ? '#3D4A74' : '#CBD5E1'}
                />
                <Rect
                  x="96"
                  y="79"
                  width="56"
                  height="5"
                  rx="2.5"
                  fill={isDark ? '#283252' : '#E2E8F0'}
                />
                <Rect
                  x="96"
                  y="88"
                  width="66"
                  height="5"
                  rx="2.5"
                  fill={isDark ? '#283252' : '#E2E8F0'}
                />
                <Rect
                  x="96"
                  y="97"
                  width="44"
                  height="5"
                  rx="2.5"
                  fill={isDark ? '#283252' : '#E2E8F0'}
                />

                {/* 5-Star pill badge overlapping bottom right */}
                <Rect
                  x="94"
                  y="112"
                  width="88"
                  height="24"
                  rx="6"
                  fill={isDark ? '#111524' : '#F8FAFC'}
                  stroke={isDark ? '#2C3656' : '#E2E8F0'}
                  strokeWidth="1.2"
                />
                {/* 5 purple stars */}
                {[103, 116, 129, 142, 155].map((starX, idx) => (
                  <G key={idx} transform={`translate(${starX}, 124)`}>
                    <Path
                      d="M 0.0,-4.2 L 1.08,-1.5 L 3.99,-1.3 L 1.75,0.57 L 2.47,3.4 L 0.0,1.85 L -2.47,3.4 L -1.75,0.57 L -3.99,-1.3 L -1.08,-1.5 Z"
                      fill="#7655F0"
                    />
                  </G>
                ))}
              </Svg>
            </View>

            {/* Title: Congrats */}
            <Text
              style={[
                styles.statusSheetCongratsTitle,
                { color: isDark ? '#FFFFFF' : '#1A2138' },
              ]}
            >
              Congrats
            </Text>

            {/* Subtitle / Description */}
            <Text
              style={[
                styles.statusSheetDescription,
                { color: isDark ? '#A2ADD8' : '#7583A5' },
              ]}
            >
              {createdLeadSuccess?.name && createdLeadSuccess.name !== 'Customer'
                ? `Lead "${createdLeadSuccess.name}" successfully created. You can start the conversation and manage deals now.`
                : 'New lead successfully created. You can start the conversation and manage deals now.'}
            </Text>

            {/* Done Action Button */}
            <TouchableOpacity
              style={[
                styles.statusSheetDoneBtn,
                { backgroundColor: isDark ? '#7655F0' : '#8060E8' },
              ]}
              activeOpacity={0.85}
              onPress={() => setCreatedLeadSuccess(null)}
            >
              <Text style={styles.statusSheetDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS TOAST BANNER */}
      {leadSuccessToast && (
        <View
          style={[
            styles.toastContainer,
            {
              backgroundColor: isDark ? '#1C1930' : '#FFFFFF',
              borderColor: isDark ? 'rgba(139, 92, 246, 0.45)' : '#DDD6FE',
              shadowColor: '#8A3FFC',
            },
          ]}
        >
          <View style={styles.toastSuccessDot} />
          <Text
            style={[
              styles.toastText,
              { color: isDark ? '#F5F3FF' : '#111827' },
            ]}
          >
            {leadSuccessToast}
          </Text>
          <TouchableOpacity
            onPress={() => setLeadSuccessToast(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const TOP_CURVE_RADIUS = scaleContainer(36);
const TOP_CURVE_GAP = scaleContainer(8);

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },

  /* HEADER */
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: TOP_CURVE_RADIUS + TOP_CURVE_GAP + scaleContainer(6),
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
    fontFamily: Fonts.medium,
    fontWeight: '500',
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

  /* CHANNEL CATEGORIES (REDESIGN - IMAGE 2 PATTERN) */
  channelCategoriesContainer: {
    position: 'relative',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  channelCategoriesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  channelCategoryTouchable: {
    flex: 1,
    alignItems: 'center',
  },
  channelCategoryItem: {
    alignItems: 'center',
  },
  channelPillCardWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  channelGlassCapsule: {
    position: 'absolute',
    bottom: 0,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  channelGlassSheen: {
    position: 'absolute',
    top: 1,
    left: 4,
    right: 4,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  channelIconWrapper: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  channelCountBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#5275F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#292B6B',
    zIndex: 10,
  },
  channelCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: Fonts.medium,
    fontWeight: '700',
    lineHeight: 12,
  },
  channelCategoryLabel: {
    marginTop: 7,
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  channelCategoryLabelSmall: {
    fontSize: 11.5,
    marginTop: 6,
  },
  channelCategoryLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  channelCategoryLabelInactive: {
    color: 'rgba(255, 255, 255, 0.70)',
    fontWeight: '400',
  },
  channelActiveIndicator: {
    marginTop: 5,
    height: 2.5,
    width: 36,
    borderRadius: 2,
  },
  channelActiveIndicatorSmall: {
    width: 30,
    marginTop: 4,
  },
  channelSparkleDecor: {
    position: 'absolute',
    right: 2,
    bottom: 2,
  },

  /* MAIN CONVERSATION CONTENT SHEET */
  mainContentSheet: {
    flex: 1,
    borderTopLeftRadius: TOP_CURVE_RADIUS,
    borderTopRightRadius: TOP_CURVE_RADIUS,
    marginTop: -TOP_CURVE_RADIUS,
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
  statusPillInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPillInnerRowSmall: {
    gap: 4,
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

  /* RESPONSIVE STYLES FOR SMALLER DEVICES */
  statusFiltersRowSmall: {
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 10,
  },
  statusPillSmall: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 4,
  },
  statusTextSmall: {
    fontSize: 11.5,
  },
  statusBadgeSmall: {
    paddingHorizontal: 4.5,
    paddingVertical: 0.5,
    minWidth: 16,
  },
  statusBadgeTextSmall: {
    fontSize: 10,
  },

  cardsListContentSmall: {
    paddingHorizontal: 12,
    gap: 8,
  },
  conversationCardSmall: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
  },
  avatarContainerSmall: {
    marginRight: 10,
  },
  avatarImageSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallbackSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallbackTextSmall: {
    fontSize: 15,
  },
  avatarMiniBadgeSmall: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.5,
    bottom: -1,
    right: -1,
  },
  cardHeaderRowSmall: {
    marginBottom: 2,
  },
  contactNameTextSmall: {
    fontSize: 15,
    marginRight: 8,
  },
  timestampTextSmall: {
    fontSize: 12,
  },
  messagePreviewTextSmall: {
    fontSize: 13,
    marginRight: 8,
  },
  unreadPurpleDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  toastContainer: {
    position: 'absolute',
    top: 56,
    left: 18,
    right: 18,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  toastSuccessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  toastText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },

  /* STATUS BOTTOM SHEET MODAL (Congrats / Success Lead Creation) */
  statusSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  statusSheetCard: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  statusSheetHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusSheetHeaderTitle: {
    fontSize: 16,
    fontFamily: Fonts.light,
    fontWeight: '300',
    letterSpacing: -0.1,
  },
  statusSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: scaleContainer(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSheetIllustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  statusSheetCongratsTitle: {
    fontSize: scaleFont(18),
    fontFamily: Fonts.light,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  statusSheetDescription: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    lineHeight: 18.5,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statusSheetDoneBtn: {
    width: '100%',
    height: scaleHeight(50),
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSheetDoneText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    fontFamily: Fonts.light,
    fontWeight: '300',
    letterSpacing: -0.1,
  },
});

import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Settings } from 'lucide-react-native';
import { Fonts } from '@/theme/tokens';
import { scaleFont, scaleContainer, scaleHeight, isSmallDevice } from '@/theme/responsive';
import { useAppTheme } from '@/context/theme-context';

const INITIAL_CONTAINER_WIDTH = Dimensions.get('window').width - 32;

function GlassmorphicTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useAppTheme();

  const isSettings = pathname.includes('settings');
  const isInbox = !isSettings;

  const [containerWidth, setContainerWidth] = React.useState(INITIAL_CONTAINER_WIDTH);

  // Animated value: 0 for inbox, 1 for settings
  const [slideAnim] = React.useState(() => new Animated.Value(isSettings ? 1 : 0));

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isSettings ? 1 : 0,
      tension: 65,
      friction: 10,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isSettings, slideAnim]);

  const navigateToTab = (tabName: 'inbox' | 'settings') => {
    if (tabName === 'inbox') {
      router.replace('/(tabs)/inbox');
    } else {
      router.replace('/(tabs)/settings');
    }
  };

  const activeColor = isDark ? '#FFFFFF' : '#8060E8';
  const inactiveColor = isDark ? '#8E8AA0' : '#7C89A8';

  const innerPadding = 6;
  const usableWidth = Math.max(containerWidth - innerPadding * 2, 0);
  const pillWidth = usableWidth / 2;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pillWidth],
  });

  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      <View
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          if (width > 0) {
            setContainerWidth(width);
          }
        }}
        style={[
          styles.dockContainer,
          isDark ? styles.dockDark : styles.dockLight,
        ]}
      >
        {/* Animated Sliding Water Glassmorphism Pill */}
        <Animated.View
          style={[
            styles.animatedPill,
            isDark ? styles.waterPillDark : styles.waterPillLight,
            {
              width: pillWidth,
              transform: [{ translateX }],
            },
          ]}
        >
          {/* Frosted glass blur on iOS; smooth translucent view fallback on Android/Web */}
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(255, 255, 255, 0.35)',
                },
              ]}
            />
          )}
          {/* Water glass specular sheen gradient */}
          <LinearGradient
            colors={
              isDark
                ? [
                    'rgba(255, 255, 255, 0.22)',
                    'rgba(255, 255, 255, 0.08)',
                    'rgba(255, 255, 255, 0.03)',
                  ]
                : [
                    'rgba(255, 255, 255, 0.95)',
                    'rgba(255, 255, 255, 0.65)',
                    'rgba(255, 255, 255, 0.40)',
                  ]
            }
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* iOS Water Gloss Top Reflection highlight */}
          {!isDark && (
            <View
              style={[
                styles.glassGlossHighlight,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                },
              ]}
            />
          )}
        </Animated.View>

        {/* Inbox Tab Button */}
        <TouchableOpacity
          onPress={() => navigateToTab('inbox')}
          activeOpacity={0.7}
          style={styles.tabButton}
        >
          <MessageCircle
            size={20}
            color={isInbox ? activeColor : inactiveColor}
            strokeWidth={isInbox ? 2.3 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isInbox ? activeColor : inactiveColor },
              isInbox && styles.tabLabelActive,
            ]}
          >
            Inbox
          </Text>
        </TouchableOpacity>

        {/* Settings Tab Button */}
        <TouchableOpacity
          onPress={() => navigateToTab('settings')}
          activeOpacity={0.7}
          style={styles.tabButton}
        >
          <Settings
            size={20}
            color={isSettings ? activeColor : inactiveColor}
            strokeWidth={isSettings ? 2.3 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: isSettings ? activeColor : inactiveColor },
              isSettings && styles.tabLabelActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      if (pathname.includes('settings')) {
        router.replace('/(tabs)/inbox');
        return true;
      }
      if (pathname === '/inbox' || pathname === '/(tabs)/inbox' || pathname === '/') {
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [pathname, router]);

  return (
    <Tabs
      tabBar={() => <GlassmorphicTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? (isSmallDevice ? 12 : 24) : 16,
    left: scaleContainer(16),
    right: scaleContainer(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: scaleContainer(6),
    borderRadius: scaleContainer(36),
    position: 'relative',
  },
  dockDark: {
    backgroundColor: '#16122C',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  dockLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EDF5',
    borderWidth: 1,
    shadowColor: 'rgb(100, 80, 160)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  animatedPill: {
    position: 'absolute',
    left: scaleContainer(6),
    top: scaleContainer(6),
    bottom: scaleContainer(6),
    borderRadius: scaleContainer(28),
    overflow: 'hidden',
    zIndex: 1,
  },
  waterPillDark: {
    borderColor: 'rgba(255, 255, 255, 0.26)',
    borderWidth: 1.2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
      : {}),
  },
  waterPillLight: {
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1.2,
    shadowColor: 'rgb(100, 80, 160)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
      : {}),
  },
  glassGlossHighlight: {
    position: 'absolute',
    top: 1,
    left: 14,
    right: 14,
    height: 1.2,
    borderRadius: 1,
  },
  tabButton: {
    flex: 1,
    height: scaleHeight(52),
    borderRadius: scaleContainer(28),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: scaleContainer(6),
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  tabLabel: {
    fontSize: scaleFont(12),
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
});

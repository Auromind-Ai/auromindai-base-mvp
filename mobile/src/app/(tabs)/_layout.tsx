import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MessageCircle, Settings } from 'lucide-react-native';
import { Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';

function GlassmorphicTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useAppTheme();

  const isSettings = pathname.includes('settings');
  const isInbox = !isSettings;

  const navigateToTab = (tabName: 'inbox' | 'settings') => {
    if (tabName === 'inbox') {
      router.replace('/(tabs)/inbox');
    } else {
      router.replace('/(tabs)/settings');
    }
  };

  const activeColor = isDark ? '#A855F7' : '#7C3AED';
  const inactiveColor = isDark ? '#8E8AA0' : '#64748B';

  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      <View
        style={[
          styles.dockContainer,
          isDark ? styles.dockDark : styles.dockLight,
        ]}
      >
        {/* Inbox Tab Button */}
        <TouchableOpacity
          onPress={() => navigateToTab('inbox')}
          activeOpacity={0.8}
          style={[
            styles.tabPill,
            isInbox && (isDark ? styles.tabPillActiveDark : styles.tabPillActiveLight),
          ]}
        >
          {isInbox && (
            <BlurView
              intensity={Platform.OS === 'ios' ? 25 : 20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
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
          {isInbox && (
            <View
              style={[
                styles.activeDot,
                { backgroundColor: activeColor },
              ]}
            />
          )}
        </TouchableOpacity>

        {/* Settings Tab Button */}
        <TouchableOpacity
          onPress={() => navigateToTab('settings')}
          activeOpacity={0.8}
          style={[
            styles.tabPill,
            isSettings && (isDark ? styles.tabPillActiveDark : styles.tabPillActiveLight),
          ]}
        >
          {isSettings && (
            <BlurView
              intensity={Platform.OS === 'ios' ? 25 : 20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
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
          {isSettings && (
            <View
              style={[
                styles.activeDot,
                { backgroundColor: activeColor },
              ]}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TabLayout() {
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
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 38,
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
  tabPill: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  tabPillActiveDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
      : {}),
  },
  tabPillActiveLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    shadowColor: 'rgb(100, 80, 160)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }
      : {}),
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});

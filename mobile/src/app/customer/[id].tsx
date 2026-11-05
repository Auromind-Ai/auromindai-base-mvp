import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import {
  ChevronLeft,
  Snowflake,
  Crown,
  Flame,
  Zap,
  Calendar,
  Check,
} from 'lucide-react-native';
import { Fonts } from '../../theme/tokens';
import { scaleFont, scaleContainer, scaleHeight } from '../../theme/responsive';
import { useAppTheme } from '../../context/theme-context';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; phone?: string }>();
  const { isDark } = useAppTheme();

  const [isConverted, setIsConverted] = useState(false);

  const customerName = params.name || 'Rahul';
  const customerPhone = params.phone || '9345660070';
  const customerInitial = customerName.charAt(0).toUpperCase() || 'R';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/inbox');
    }
  };

  const handleConvertConversation = () => {
    setIsConverted((prev) => !prev);
    if (!isConverted) {
      if (Platform.OS === 'web') {
        alert('Conversation converted successfully!');
      } else {
        Alert.alert('Success', 'Conversation converted successfully!');
      }
    }
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: isDark ? '#0A1023' : '#EEEEF5' }]}>
      <StatusBar style="light" />

      {/* TOP HEADER SECTION WITH INBOX GRADIENT PATTERN */}
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

        {/* Center Radial Glow overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient
                id={isDark ? 'customerDarkGlow' : 'customerLightGlow'}
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
              fill={`url(#${isDark ? 'customerDarkGlow' : 'customerLightGlow'})`}
            />
          </Svg>
        </View>

        <SafeAreaView edges={['top', 'left', 'right']}>
          {/* iOS Style Top Row: plain "<" back button and "Contact Details" in one row */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Contact Details</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* MAIN CONTENT SHEET WITH INBOX GRADIENT BACKGROUND */}
      <View style={styles.mainContentSheet}>
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Customer Avatar, Name & Phone (iOS Enhanced Avatar) */}
          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight, styles.profileRow]}>
            <LinearGradient
              colors={
                isDark
                  ? ['#1C3D2F', '#0E241B']
                  : ['#D1FAE5', '#A7F3D0']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.avatarCircle,
                {
                  borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : 'rgba(16, 185, 129, 0.45)',
                },
              ]}
            >
              <View
                style={[
                  styles.avatarInnerGlow,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.5)',
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: isDark ? '#34D399' : '#065F46' }]}>
                  {customerInitial}
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.profileTextCol}>
              <Text style={[styles.customerName, { color: isDark ? '#FFFFFF' : '#1F1A3C' }]}>
                {customerName}
              </Text>
              <Text style={[styles.customerPhone, { color: isDark ? '#9DA8C3' : '#7583A5' }]}>
                {customerPhone}
              </Text>
            </View>
          </View>

          {/* 2. System Tier & Unified Agent Labels Card */}
          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <Text style={[styles.sectionMetaTitle, { color: isDark ? '#8E99B7' : '#7583A5' }]}>
              SYSTEM TIER
            </Text>

            {/* Enhanced iOS Cold Badge with frosted gradient & glow */}
            <View style={styles.systemTierRow}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(56, 189, 248, 0.20)', 'rgba(14, 165, 233, 0.08)']
                    : ['#E0F2FE', '#BAE6FD']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.tierBadge,
                  {
                    borderColor: isDark ? 'rgba(56, 189, 248, 0.32)' : 'rgba(2, 132, 199, 0.25)',
                  },
                ]}
              >
                <Snowflake size={13} color={isDark ? '#38BDF8' : '#0284C7'} strokeWidth={2.4} />
                <Text style={[styles.tierBadgeText, { color: isDark ? '#7DD3FC' : '#0284C7' }]}>
                  Cold
                </Text>
              </LinearGradient>
              <Text style={[styles.calculatedText, { color: isDark ? '#7E8BA0' : '#8E99B7' }]}>
                Calculated automatically (0)
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            />

            <Text style={[styles.sectionMetaTitle, { color: isDark ? '#8E99B7' : '#7583A5', marginTop: 4 }]}>
              AGENT LABELS
            </Text>

            {/* Harmonized, iOS-consistent label badges with unified container styling */}
            <View style={styles.agentLabelsWrap}>
              {/* Premium Lead */}
              <View
                style={[
                  styles.labelPillUnified,
                  isDark ? styles.labelPillUnifiedDark : styles.labelPillUnifiedLight,
                ]}
              >
                <Crown size={14} color="#F59E0B" />
                <Text
                  style={[
                    styles.labelPillText,
                    { color: isDark ? '#E2E8F0' : '#334155' },
                  ]}
                >
                  Premium Lead
                </Text>
              </View>

              {/* High Priority */}
              <View
                style={[
                  styles.labelPillUnified,
                  isDark ? styles.labelPillUnifiedDark : styles.labelPillUnifiedLight,
                ]}
              >
                <Flame size={14} color="#EF4444" />
                <Text
                  style={[
                    styles.labelPillText,
                    { color: isDark ? '#E2E8F0' : '#334155' },
                  ]}
                >
                  High Priority
                </Text>
              </View>

              {/* Interested */}
              <View
                style={[
                  styles.labelPillUnified,
                  isDark ? styles.labelPillUnifiedDark : styles.labelPillUnifiedLight,
                ]}
              >
                <Zap size={14} color="#10B981" />
                <Text
                  style={[
                    styles.labelPillText,
                    { color: isDark ? '#E2E8F0' : '#334155' },
                  ]}
                >
                  Interested
                </Text>
              </View>

              {/* Follow Up */}
              <View
                style={[
                  styles.labelPillUnified,
                  isDark ? styles.labelPillUnifiedDark : styles.labelPillUnifiedLight,
                ]}
              >
                <Calendar size={14} color="#3B82F6" />
                <Text
                  style={[
                    styles.labelPillText,
                    { color: isDark ? '#E2E8F0' : '#334155' },
                  ]}
                >
                  Follow Up
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Conversation Info */}
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#1F1A3C' }]}>
            Conversation Info
          </Text>

          <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#9DA8C3' : '#7583A5' }]}>
                First Contact
              </Text>
              <Text style={[styles.infoValue, { color: isDark ? '#F8F8FF' : '#1F1A3C' }]}>
                Aug 3, 2026
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#9DA8C3' : '#7583A5' }]}>
                Last Contact
              </Text>
              <Text style={[styles.infoValue, { color: isDark ? '#F8F8FF' : '#1F1A3C' }]}>
                Aug 19, 2026 03:54 PM
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#9DA8C3' : '#7583A5' }]}>
                Total Messages
              </Text>
              <Text style={[styles.infoValue, { color: isDark ? '#F8F8FF' : '#1F1A3C' }]}>
                2
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? 'rgba(164, 170, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            />

            {/* Enhanced iOS Status Badge with glowing indicator dot */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#9DA8C3' : '#7583A5' }]}>
                Status
              </Text>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(16, 185, 129, 0.20)', 'rgba(5, 150, 105, 0.08)']
                    : ['rgba(16, 185, 129, 0.16)', 'rgba(5, 150, 105, 0.06)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.statusBadge,
                  {
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.30)',
                  },
                ]}
              >
                <View style={styles.statusIndicatorDot} />
                <Text style={styles.statusBadgeText}>Closed</Text>
              </LinearGradient>
            </View>
          </View>

          {/* 4. Quick Actions (iOS Premium Action Button) */}
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#1F1A3C' }]}>
            Quick Actions
          </Text>

          <TouchableOpacity
            style={styles.convertButtonTouchable}
            activeOpacity={0.85}
            onPress={handleConvertConversation}
          >
            <LinearGradient
              colors={
                isConverted
                  ? ['#059669', '#047857']
                  : ['#10B981', '#059669']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.convertButtonGradient}
            >
              <View style={styles.convertIconCircle}>
                <Check size={16} color="#10B981" strokeWidth={2.8} />
              </View>
              <Text style={styles.convertButtonText}>
                {isConverted ? 'Conversation Converted' : 'Convert Conversation'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(23),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  mainContentSheet: {
    flex: 1,
    borderTopLeftRadius: scaleContainer(32),
    borderTopRightRadius: scaleContainer(32),
    marginTop: -12,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 48,
    gap: 15,
  },
  card: {
    padding: scaleContainer(18),
    borderRadius: scaleContainer(20),
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
    borderColor: 'rgba(164, 170, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: scaleHeight(54),
    height: scaleHeight(54),
    borderRadius: scaleHeight(27),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarInnerGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontFamily: Fonts.medium,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  profileTextCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  customerPhone: {
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    marginTop: 3,
  },
  sectionMetaTitle: {
    fontSize: scaleFont(12),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  systemTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  tierBadgeText: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  calculatedText: {
    fontSize: scaleFont(13.5),
    fontFamily: Fonts.regular,
    fontWeight: '400',
    marginLeft: 10,
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 13,
  },
  agentLabelsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelPillUnified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6.5,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  labelPillUnifiedDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(164, 170, 255, 0.12)',
  },
  labelPillUnifiedLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  labelPillText: {
    fontSize: scaleFont(13.5),
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 16.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    marginTop: 5,
    marginBottom: -4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 14.5,
    fontFamily: Fonts.regular,
    fontWeight: '400',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  statusBadgeText: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#10B981',
    letterSpacing: 0.1,
  },
  convertButtonTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  convertButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  convertIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});

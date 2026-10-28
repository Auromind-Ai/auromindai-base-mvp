import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Camera,
  Mail,
  MapPin,
  ChevronDown,
  User,
  Check,
} from 'lucide-react-native';
import { BrandColors, Fonts } from '../../theme/tokens';
import { useAppTheme } from '../../context/theme-context';

type ProfileTab = 'Profile' | 'Notes' | 'Orders' | 'Activity';
type CustomerStatus = 'Open' | 'Follow Up' | 'Converted' | 'Closed';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors, isDark, statusBarStyle } = useAppTheme();

  const [activeTab, setActiveTab] = useState<ProfileTab>('Profile');
  const [status, setStatus] = useState<CustomerStatus>('Open');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/inbox');
    }
  };

  const customer = {
    name: 'Priya Sharma',
    initials: 'PS',
    avatarColor: '#8B5CF6',
    isOnline: true,
    phone: '+91 98765 43210',
    instagram: '@priyasharma',
    email: 'priya@email.com',
    location: 'Chennai, Tamil Nadu, India',
    assignedTo: 'Arun Kumar',
    tags: [
      { label: 'Hot Lead', color: '#EF4444', bg: '#EF444420' },
      { label: 'Saree Collection', color: '#3B82F6', bg: '#3B82F620' },
      { label: 'Interested', color: '#10B981', bg: '#10B98120' },
    ],
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} />

      {/* Header Bar matching Screen 9 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerUser}>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatar, { backgroundColor: customer.avatarColor }]}>
              <Text style={styles.avatarText}>{customer.initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={[styles.headerName, { color: colors.textPrimary }]}>{customer.name}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Lead • Online</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <MoreVertical size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Tabs: Profile, Notes, Orders, Activity */}
        <View style={[styles.tabBar, { backgroundColor: isDark ? '#120F20' : colors.cardElevated }]}>
          {(['Profile', 'Notes', 'Orders', 'Activity'] as ProfileTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  isActive && [styles.tabItemActive, { backgroundColor: colors.primary }],
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    { color: colors.textSecondary },
                    isActive && styles.tabItemTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'Profile' && (
          <View style={styles.tabContent}>
            {/* Contact Information Card */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Contact Information</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#25D36620' }]}>
                  <Phone size={16} color="#25D366" />
                </View>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{customer.phone}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#E1306C20' }]}>
                  <Camera size={16} color="#E1306C" />
                </View>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{customer.instagram}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#3B82F620' }]}>
                  <Mail size={16} color="#3B82F6" />
                </View>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{customer.email}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: '#F59E0B20' }]}>
                  <MapPin size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{customer.location}</Text>
              </View>
            </View>

            {/* Tags Section */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {customer.tags.map((tag, idx) => (
                <View
                  key={idx}
                  style={[styles.tagPill, { backgroundColor: tag.bg }]}
                >
                  <Text style={[styles.tagText, { color: tag.color }]}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Assigned To Card */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Assigned To</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.assignedRow}>
                <View style={styles.assignedUser}>
                  <View style={styles.assignedAvatar}>
                    <User size={16} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.assignedName, { color: colors.textPrimary }]}>{customer.assignedTo}</Text>
                </View>

                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={[styles.changeActionText, { color: colors.primary }]}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Dropdown Card */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Status</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={styles.statusRow}
                onPress={() => setShowStatusPicker(!showStatusPicker)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusLabelText, { color: colors.textPrimary }]}>{status}</Text>
                <ChevronDown size={18} color={colors.icon} />
              </TouchableOpacity>

              {showStatusPicker && (
                <View style={styles.statusOptions}>
                  {(['Open', 'Follow Up', 'Converted', 'Closed'] as CustomerStatus[]).map(
                    (st) => (
                      <TouchableOpacity
                        key={st}
                        style={styles.statusOptionItem}
                        onPress={() => {
                          setStatus(st);
                          setShowStatusPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            status === st && styles.statusOptionTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                        {status === st && <Check size={16} color={BrandColors.primaryLight} />}
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Other Tabs Placeholder */}
        {activeTab === 'Notes' && (
          <View style={styles.emptyTabWrapper}>
            <Text style={styles.emptyTabText}>2 Internal Notes recorded.</Text>
            <Text style={styles.emptyTabSubtext}>Customer inquired about bridal silk discounts.</Text>
          </View>
        )}
        {activeTab === 'Orders' && (
          <View style={styles.emptyTabWrapper}>
            <Text style={styles.emptyTabText}>Order #ORB-8821 in progress.</Text>
            <Text style={styles.emptyTabSubtext}>Estimated delivery: 28 Oct 2026</Text>
          </View>
        )}
        {activeTab === 'Activity' && (
          <View style={styles.emptyTabWrapper}>
            <Text style={styles.emptyTabText}>Active 5 minutes ago via WhatsApp.</Text>
            <Text style={styles.emptyTabSubtext}>Assigned to Arun Kumar by Orbion Bot.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05010B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#08080C',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#08080C',
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#120F20',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: BrandColors.primaryLight,
  },
  tabItemText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  tabItemTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  tabContent: {
    gap: 16,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#0F0C1B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignedUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assignedName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  changeActionText: {
    color: BrandColors.primaryLight,
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  statusOptions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  statusOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statusOptionText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  emptyTabWrapper: {
    backgroundColor: '#0F0C1B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyTabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyTabSubtext: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Search, Plus, X } from 'lucide-react-native';
import { BrandColors, Fonts } from '@/theme/tokens';
import { useAppTheme } from '@/context/theme-context';

type LeadFilter = 'All' | 'New' | 'Contacted';

interface LeadItem {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  enquiry: string;
  time: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed';
}

const MOCK_LEADS: LeadItem[] = [
  {
    id: 'l1',
    name: 'Sneha Fashions',
    initials: 'SF',
    avatarColor: '#10B981',
    enquiry: 'Interested in saree collection',
    time: '2m',
    status: 'New',
  },
  {
    id: 'l2',
    name: 'Karthik Store',
    initials: 'KS',
    avatarColor: '#3B82F6',
    enquiry: 'Bulk order enquiry',
    time: '1h',
    status: 'Contacted',
  },
  {
    id: 'l3',
    name: 'Meena',
    initials: 'M',
    avatarColor: '#EC4899',
    enquiry: 'Price details please',
    time: '1h',
    status: 'New',
  },
  {
    id: 'l4',
    name: 'Rahul Enterprises',
    initials: 'RE',
    avatarColor: '#8B5CF6',
    enquiry: 'Wedding collection',
    time: '1d',
    status: 'Qualified',
  },
  {
    id: 'l5',
    name: 'Style Hub',
    initials: 'SH',
    avatarColor: '#F59E0B',
    enquiry: 'Is this available in size M?',
    time: '1d',
    status: 'New',
  },
  {
    id: 'l6',
    name: 'Divya',
    initials: 'D',
    avatarColor: '#6B7280',
    enquiry: 'Custom design enquiry',
    time: '2d',
    status: 'Closed',
  },
];

export default function LeadsScreen() {
  const router = useRouter();
  const { colors, isDark, statusBarStyle } = useAppTheme();
  const [activeFilter, setActiveFilter] = useState<LeadFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const getStatusBadgeStyle = (status: LeadItem['status']) => {
    switch (status) {
      case 'New':
        return { bg: '#8B5CF620', text: '#A855F7', border: '#8B5CF640' };
      case 'Contacted':
        return { bg: '#3B82F620', text: '#60A5FA', border: '#3B82F640' };
      case 'Qualified':
        return { bg: '#10B98120', text: '#34D399', border: '#10B98140' };
      case 'Closed':
        return { bg: '#37415120', text: '#9CA3AF', border: '#4B556340' };
    }
  };

  const filteredLeads = MOCK_LEADS.filter((item) => {
    if (activeFilter !== 'All' && item.status !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.enquiry.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} />

      {/* Top Header matching Screen 11 */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Leads</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: isDark ? '#191724' : colors.cardElevated },
            ]}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Search size={20} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} activeOpacity={0.85}>
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable Search Input */}
      {showSearch && (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <Search size={16} color={colors.iconMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.inputText }]}
            placeholder="Search leads..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.iconMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Chips Bar: All (120), New (35), Contacted (50) */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: isDark ? '#191724' : colors.cardElevated,
              borderColor: colors.cardBorder,
            },
            activeFilter === 'All' && [
              styles.filterChipActive,
              { backgroundColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveFilter('All')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: colors.textSecondary },
              activeFilter === 'All' && styles.filterChipTextActive,
            ]}
          >
            All (120)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: isDark ? '#191724' : colors.cardElevated,
              borderColor: colors.cardBorder,
            },
            activeFilter === 'New' && [
              styles.filterChipActive,
              { backgroundColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveFilter('New')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: colors.textSecondary },
              activeFilter === 'New' && styles.filterChipTextActive,
            ]}
          >
            New (35)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor: isDark ? '#191724' : colors.cardElevated,
              borderColor: colors.cardBorder,
            },
            activeFilter === 'Contacted' && [
              styles.filterChipActive,
              { backgroundColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveFilter('Contacted')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: colors.textSecondary },
              activeFilter === 'Contacted' && styles.filterChipTextActive,
            ]}
          >
            Contacted (50)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const badgeStyle = getStatusBadgeStyle(item.status);
          return (
            <TouchableOpacity
              style={[styles.leadCard, { borderBottomColor: colors.divider }]}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: `/chat/[id]`,
                  params: {
                    id: item.id,
                    name: item.name,
                    channel: 'whatsapp',
                  },
                })
              }
            >
              <View
                style={[styles.leadAvatar, { backgroundColor: item.avatarColor }]}
              >
                <Text style={styles.leadAvatarText}>{item.initials}</Text>
              </View>

              <View style={styles.leadInfo}>
                <View style={styles.leadTopRow}>
                  <Text style={[styles.leadName, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.leadTime, { color: colors.textMuted }]}>
                    {item.time}
                  </Text>
                </View>

                <View style={styles.leadBottomRow}>
                  <Text
                    style={[styles.leadEnquiry, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.enquiry}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: badgeStyle.bg,
                        borderColor: badgeStyle.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.statusBadgeText, { color: badgeStyle.text }]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipActive: {
    borderWidth: 0,
  },
  filterChipText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  leadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  leadAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  leadInfo: {
    flex: 1,
  },
  leadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  leadName: {
    fontSize: 15.5,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  leadTime: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  leadBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leadEnquiry: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
});

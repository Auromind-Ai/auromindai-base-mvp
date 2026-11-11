import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Search, Plus, X } from 'lucide-react-native';
import { BrandColors, Fonts } from '@/theme/tokens';
import { scaleFont, scaleContainer, scaleHeight } from '@/theme/responsive';
import { useAppTheme } from '@/context/theme-context';
import { fetchLeads } from '@/api';
import { useAuth } from '@/store/auth';
import { AddLeadModal } from '@/components/leads/AddLeadModal';
import { getInitials, getAvatarColor, formatRelativeTime } from '@/utils/formatters';

type LeadFilter = 'All' | 'New' | 'Contacted';

interface LeadItem {
  id: string;
  conversationId?: string | null;
  name: string;
  initials: string;
  avatarColor: string;
  enquiry: string;
  time: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed';
}

export default function LeadsScreen() {
  const router = useRouter();
  const { colors, isDark, statusBarStyle } = useAppTheme();
  const authState = useAuth();
  const [activeFilter, setActiveFilter] = useState<LeadFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [serverLeads, setServerLeads] = useState<LeadItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const workspaceId = (authState.selectedWorkspace?.id && !authState.selectedWorkspace.id.startsWith('ws-'))
    ? authState.selectedWorkspace.id
    : (authState.workspaces.find((w) => !w.id.startsWith('ws-'))?.id || '');

  const loadLeads = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetchLeads(workspaceId);
      const items = res?.items || [];
      const mapped: LeadItem[] = items.map((l, idx) => {
        let st: LeadItem['status'] = 'New';
        const rawSt = (l.status || '').toLowerCase();
        if (rawSt.includes('contact')) st = 'Contacted';
        else if (rawSt.includes('qualif') || rawSt.includes('convert')) st = 'Qualified';
        else if (rawSt.includes('close')) st = 'Closed';

        return {
          id: String(l.lead_id || l.id || idx),
          conversationId: l.conversation_id || null,
          name: l.name || 'Unnamed Lead',
          initials: getInitials(l.name, 'LD'),
          avatarColor: getAvatarColor(idx),
          enquiry: l.source ? `Source: ${l.source}` : (l.phone ? `Phone: ${l.phone}` : 'Lead contact'),
          time: formatRelativeTime(l.last_message_at || l.created_at, 'Recently'),
          status: st,
        };
      });
      setServerLeads(mapped);
    } catch (err) {
      console.warn('Failed to load leads from backend:', err);
      setServerLeads([]);
    } finally {
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!workspaceId || cancelled) return;
      await loadLeads();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, loadLeads]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeads();
  };

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

  const leadCounts = useMemo(() => ({
    all: serverLeads.length,
    new: serverLeads.filter((l) => l.status === 'New').length,
    contacted: serverLeads.filter((l) => l.status === 'Contacted').length,
  }), [serverLeads]);

  const filteredLeads = useMemo(() => {
    return serverLeads.filter((item) => {
      if (activeFilter !== 'All' && item.status !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.enquiry.toLowerCase().includes(q);
      }
      return true;
    });
  }, [serverLeads, activeFilter, searchQuery]);

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

          <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={() => setShowAddModal(true)}>
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

      {/* Filter Chips Bar: All ({leadCounts.all}), New ({leadCounts.new}), Contacted ({leadCounts.contacted}) */}
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
            All ({leadCounts.all})
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
            New ({leadCounts.new})
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
            Contacted ({leadCounts.contacted})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leads List */}
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 32 }}>No leads found</Text>}
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
                    id: item.conversationId || item.id,
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
          <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadLeads();
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
    paddingHorizontal: scaleContainer(20),
    paddingTop: scaleContainer(8),
    paddingBottom: scaleContainer(12),
  },
  title: {
    fontSize: scaleFont(22),
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleContainer(10),
  },
  iconButton: {
    width: scaleHeight(36),
    height: scaleHeight(36),
    borderRadius: scaleHeight(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: scaleHeight(36),
    height: scaleHeight(36),
    borderRadius: scaleHeight(18),
    backgroundColor: BrandColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scaleContainer(16),
    marginBottom: scaleContainer(12),
    borderRadius: scaleContainer(12),
    paddingHorizontal: scaleContainer(14),
    paddingVertical: scaleContainer(8),
    borderWidth: 1,
    gap: scaleContainer(10),
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    fontFamily: Fonts.regular,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: scaleContainer(16),
    gap: scaleContainer(8),
    marginBottom: scaleContainer(14),
  },
  filterChip: {
    paddingHorizontal: scaleContainer(14),
    paddingVertical: scaleContainer(7),
    borderRadius: scaleContainer(18),
    borderWidth: 1,
  },
  filterChipActive: {
    borderWidth: 0,
  },
  filterChipText: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: scaleContainer(16),
    paddingBottom: scaleContainer(24),
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleContainer(14),
    borderBottomWidth: 1,
  },
  leadAvatar: {
    width: scaleHeight(44),
    height: scaleHeight(44),
    borderRadius: scaleHeight(22),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleContainer(14),
  },
  leadAvatarText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
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
    marginBottom: scaleContainer(4),
  },
  leadName: {
    fontSize: scaleFont(15.5),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
  leadTime: {
    fontSize: scaleFont(12),
    fontFamily: Fonts.regular,
  },
  leadBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leadEnquiry: {
    fontSize: scaleFont(13),
    fontFamily: Fonts.regular,
    flex: 1,
    marginRight: scaleContainer(12),
  },
  statusBadge: {
    paddingHorizontal: scaleContainer(8),
    paddingVertical: scaleContainer(3),
    borderRadius: scaleContainer(6),
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: scaleFont(11),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
});

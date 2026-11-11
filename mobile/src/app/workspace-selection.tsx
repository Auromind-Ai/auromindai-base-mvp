import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { OrbionLogo } from '../components/common/OrbionLogo';
import { BrandColors, Fonts } from '../theme/tokens';
import { scaleFont, scaleContainer, scaleHeight } from '../theme/responsive';
import { authStore, useAuth } from '../store/auth';
import { useAppTheme } from '../context/theme-context';

interface WorkspaceOption {
  id: string;
  name: string;
  subtitle: string;
  initial: string;
  color: string;
}

const COLOR_PALETTE = ['#8B5CF6', '#EF4444', '#10B981', '#3B82F6', '#F59E0B'];

export default function WorkspaceSelectionScreen() {
  const router = useRouter();
  const { colors, statusBarStyle } = useAppTheme();
  const authState = useAuth();

  const workspacesList: WorkspaceOption[] = React.useMemo(() => {
    if (authState.workspaces && authState.workspaces.length > 0) {
      return authState.workspaces.map((w, idx) => ({
        id: w.id,
        name: w.name || 'Workspace',
        subtitle: w.role ? `${w.role.toUpperCase()} Workspace` : 'Active Workspace',
        initial: (w.name || 'W')[0].toUpperCase(),
        color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
      }));
    }
    if (authState.selectedWorkspace) {
      return [{
        id: authState.selectedWorkspace.id,
        name: authState.selectedWorkspace.name || 'My Workspace',
        subtitle: 'Active Workspace',
        initial: (authState.selectedWorkspace.name || 'W')[0].toUpperCase(),
        color: COLOR_PALETTE[0],
      }];
    }
    return [{
      id: 'default',
      name: 'Default Workspace',
      subtitle: 'Active Workspace',
      initial: 'O',
      color: COLOR_PALETTE[0],
    }];
  }, [authState.workspaces, authState.selectedWorkspace]);

  const [selectedId, setSelectedId] = useState<string>(
    authState.selectedWorkspace?.id || workspacesList[0]?.id || ''
  );

  React.useEffect(() => {
    authStore.refreshWorkspaces().catch(() => {});
  }, []);

  const activeSelectedId = workspacesList.some((w) => w.id === selectedId)
    ? selectedId
    : workspacesList[0]?.id || '';

  const handleContinue = () => {
    const selected = workspacesList.find((w) => w.id === activeSelectedId) || workspacesList[0];
    if (selected && !selected.id.startsWith('ws-') && selected.id !== 'default') {
      authStore.setSelectedWorkspace({
        id: selected.id,
        name: selected.name,
        role: 'admin',
      });
    }
    router.replace('/(tabs)/inbox');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={statusBarStyle} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Logo Emblem matching Screen 4 */}
        <View style={styles.logoWrapper}>
          <OrbionLogo size="sm" showText={false} />
        </View>

        {/* Title & Subtitle */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Select Workspace</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Choose the workspace you want to access.</Text>

        {/* Workspace Cards */}
        <View style={styles.workspaceList}>
          {workspacesList.map((ws) => {
            const isSelected = ws.id === activeSelectedId;
            return (
              <TouchableOpacity
                key={ws.id}
                style={[
                  styles.workspaceCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                  isSelected && styles.workspaceCardSelected,
                ]}
                onPress={() => setSelectedId(ws.id)}
                activeOpacity={0.8}
              >
                {/* Initial Badge */}
                <View style={[styles.avatarBadge, { backgroundColor: ws.color }]}>
                  <Text style={styles.avatarInitial}>{ws.initial}</Text>
                </View>

                {/* Info */}
                <View style={styles.infoWrapper}>
                  <Text style={[styles.workspaceName, { color: colors.textPrimary }]}>{ws.name}</Text>
                  <Text style={[styles.workspaceSubtitle, { color: colors.textMuted }]}>{ws.subtitle}</Text>
                </View>

                {/* Checkbox indicator */}
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleSelected,
                  ]}
                >
                  {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add Another Workspace button */}
          <TouchableOpacity
            style={[
              styles.addWorkspaceButton,
              {
                backgroundColor: colors.btnSecondaryBg,
                borderColor: colors.btnSecondaryBorder,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.addIconBox}>
              <Plus size={16} color={colors.icon} />
            </View>
            <Text style={[styles.addWorkspaceText, { color: colors.textPrimary }]}>Add Another Workspace</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Continue Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05010B',
  },
  scrollContent: {
    paddingHorizontal: scaleContainer(24),
    paddingTop: scaleContainer(40),
    paddingBottom: scaleContainer(32),
    flexGrow: 1,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: scaleFont(24),
    fontFamily: Fonts?.bold || 'System',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: scaleFont(14),
    fontFamily: Fonts?.regular || 'System',
    textAlign: 'center',
    marginBottom: 32,
  },
  workspaceList: {
    gap: 12,
  },
  workspaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0C1B',
    borderRadius: scaleContainer(16),
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  workspaceCardSelected: {
    borderColor: BrandColors.primaryLight,
    backgroundColor: '#161129',
  },
  avatarBadge: {
    width: scaleHeight(44),
    height: scaleHeight(44),
    borderRadius: scaleContainer(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: scaleFont(18),
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  infoWrapper: {
    flex: 1,
  },
  workspaceName: {
    color: '#FFFFFF',
    fontSize: scaleFont(16),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginBottom: 2,
  },
  workspaceSubtitle: {
    color: '#9CA3AF',
    fontSize: scaleFont(13),
    fontFamily: Fonts.regular,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    backgroundColor: BrandColors.primaryLight,
    borderColor: BrandColors.primaryLight,
  },
  addWorkspaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: scaleContainer(16),
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addWorkspaceText: {
    color: '#A1A1AA',
    fontSize: scaleFont(14),
    fontFamily: Fonts.medium,
    fontWeight: '500',
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingTop: 36,
  },
  continueButton: {
    backgroundColor: BrandColors.primaryLight,
    borderRadius: 14,
    height: scaleHeight(52),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: scaleFont(16),
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
  },
});

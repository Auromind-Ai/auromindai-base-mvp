import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SquareMorphLoader } from './SquareMorphLoader';
import { useGlobalLoading } from '@/context/loading-context';
import { useAppTheme } from '@/context/theme-context';
import { Fonts } from '@/theme/tokens';
import { scaleFont, scaleContainer } from '@/theme/responsive';

export const GlobalLoadingOverlay: React.FC = () => {
  const { isVisible, state, message, sublabel, canCancel, cancel } = useGlobalLoading();
  const { isDark } = useAppTheme();

  // Only render when active or dismissing
  if (!isVisible && state === 'idle') {
    return null;
  }

  return (
    <View
      style={[
        styles.fixedBackdrop,
        {
          backgroundColor: isDark
            ? 'rgba(7, 6, 10, 0.78)'
            : 'rgba(248, 249, 250, 0.85)',
        },
      ]}
      pointerEvents="auto"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? 'rgba(18, 16, 25, 0.95)'
              : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark
              ? 'rgba(255, 255, 255, 0.10)'
              : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <SquareMorphLoader
          state={state}
          size="lg"
          label={message}
          sublabel={sublabel}
          showDots={state === 'loading'}
          glow
        />

        {/* Graceful cancellation if request takes > 4s */}
        {canCancel && state === 'loading' && (
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.05)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(0, 0, 0, 0.10)',
              },
            ]}
            onPress={cancel}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cancel request"
          >
            <Text
              style={[
                styles.cancelText,
                { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fixedBackdrop: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    elevation: 999999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaleContainer(24),
  },
  card: {
    paddingVertical: scaleContainer(32),
    paddingHorizontal: scaleContainer(28),
    borderRadius: scaleContainer(24),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: scaleContainer(240),
    maxWidth: scaleContainer(340),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  cancelButton: {
    marginTop: scaleContainer(20),
    paddingVertical: scaleContainer(8),
    paddingHorizontal: scaleContainer(18),
    borderRadius: scaleContainer(12),
    borderWidth: 1,
  },
  cancelText: {
    fontSize: scaleFont(12.5),
    fontFamily: Fonts.medium,
  },
});

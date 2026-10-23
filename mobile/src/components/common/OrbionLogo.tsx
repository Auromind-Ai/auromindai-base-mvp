import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { BrandColors } from '../../theme/tokens';

// High-resolution logo mark copied from frontend/public/logo.png
const LOGO_SOURCE = require('../../../assets/images/logo.png');

interface OrbionLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}

export function OrbionLogo({
  size = 'md',
  showText = true,
  style,
  glow = true,
}: OrbionLogoProps) {
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  // Base emblem dimensions maintaining aspect ratio (693:631 ≈ 1.1:1)
  const iconWidth = isLg ? 96 : isSm ? 56 : 74;
  const iconHeight = isLg ? 87 : isSm ? 51 : 67;

  return (
    <View style={[styles.container, style]}>
      {/* Emblem Container with ambient glowing backdrop */}
      <View
        style={[
          styles.emblemContainer,
          {
            width: iconWidth,
            height: iconHeight,
          },
        ]}
      >
        {glow && (
          <View
            style={[
              styles.emblemGlow,
              {
                width: iconWidth * 0.9,
                height: iconHeight * 0.9,
                borderRadius: (iconWidth * 0.9) / 2,
              },
            ]}
          />
        )}

        <Image
          source={LOGO_SOURCE}
          style={
            [
              styles.logoImage,
              {
                width: iconWidth,
                height: iconHeight,
              },
            ] as StyleProp<ImageStyle>
          }
          resizeMode="contain"
          accessibilityLabel="Orbion Logo"
        />
      </View>

      {/* Brand Text: Orbion Agents */}
      {showText && (
        <View style={styles.textRow}>
          <Text style={[styles.textOrbion, isLg && styles.textOrbionLg, isSm && styles.textOrbionSm]}>
            Orbion
          </Text>
          <Text style={[styles.textAgents, isLg && styles.textAgentsLg, isSm && styles.textAgentsSm]}>
            Agents
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emblemGlow: {
    position: 'absolute',
    backgroundColor: '#814AC8',
    opacity: 0.38,
    transform: [{ scale: 1.25 }],
  },
  logoImage: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textOrbion: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  textOrbionLg: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  textOrbionSm: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  textAgents: {
    color: '#C084FC',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  textAgentsLg: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  textAgentsSm: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Fonts } from '../../theme/tokens';
import { useAppTheme } from '../../context/theme-context';

// High-resolution clean logo mark
const LOGO_SOURCE = require('../../../assets/images/logo.png');

interface OrbionLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  width?: number;
  height?: number;
  textColor?: string;
}

export function OrbionLogo({
  size = 'md',
  showText = true,
  style,
  glow = false,
  width,
  height,
  textColor,
}: OrbionLogoProps) {
  const { colors, isDark } = useAppTheme();
  const effectiveTextColor = textColor || (isDark ? '#FFFFFF' : '#111827');

  // Dimensions calibrated to exact 2.065:1 aspect ratio of the clean emblem
  const dimensions = {
    sm: { width: 66, height: 32, textSpacing: 8, textSize: 19 },
    md: { width: 112, height: 54, textSpacing: 12, textSize: 24 },
    lg: { width: 206, height: 100, textSpacing: 20, textSize: 34 },
    xl: { width: 230, height: 111, textSpacing: 24, textSize: 38 },
  }[size] || { width: 112, height: 54, textSpacing: 12, textSize: 24 };

  const iconWidth = width ?? dimensions.width;
  const iconHeight = height ?? dimensions.height;
  const textSpacing = dimensions.textSpacing;

  return (
    <View style={[styles.container, style]}>
      {/* Pure emblem logo image without any background circle, glow or shadow */}
      <View
        style={[
          styles.emblemContainer,
          {
            width: iconWidth,
            height: iconHeight,
            marginBottom: showText ? textSpacing : 0,
          },
        ]}
      >
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
          <Text
            style={[
              styles.textOrbion,
              { fontSize: dimensions.textSize, color: effectiveTextColor },
              size === 'lg' && styles.textOrbionLg,
              size === 'sm' && styles.textOrbionSm,
            ]}
          >
            Orbion
          </Text>
          <Text
            style={[
              styles.textAgents,
              { fontSize: dimensions.textSize },
              size === 'lg' && styles.textAgentsLg,
              size === 'sm' && styles.textAgentsSm,
            ]}
          >
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    // Pure logo image with no shadow or circle artifacts
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textOrbion: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  textOrbionLg: {
    fontSize: 34,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  textOrbionSm: {
    fontSize: 19,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  textAgents: {
    color: '#A855F7',
    fontSize: 24,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  textAgentsLg: {
    color: '#A855F7',
    fontSize: 34,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  textAgentsSm: {
    color: '#A855F7',
    fontSize: 19,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});

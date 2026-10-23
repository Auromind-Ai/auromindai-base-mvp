import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OrbionLogo } from '../components/common/OrbionLogo';
import { BrandColors } from '../theme/tokens';

export default function SplashScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Atmospheric Ambient Purple Glow Orb in Background */}
      <View
        pointerEvents="none"
        style={[
          styles.glowBackdrop,
          {
            top: height * 0.42,
            left: -width * 0.25,
            width: width * 1.5,
            height: width * 1.5,
          },
        ]}
      />

      {/* Secondary Ambient Accent Light */}
      <View
        pointerEvents="none"
        style={[
          styles.secondaryGlow,
          {
            top: height * 0.55,
            left: width * 0.1,
            width: width * 0.8,
            height: width * 0.8,
          },
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Top/Center Branding & Copy */}
        <View style={styles.contentContainer}>
          {/* Logo & Monogram */}
          <View style={styles.logoWrapper}>
            <OrbionLogo size="lg" />
          </View>

          {/* Hero Headline */}
          <Text style={styles.headline}>
            Your AI Team{'\n'}Always On{'\n'}Everywhere
          </Text>

          {/* Supporting Subtitle */}
          <Text style={styles.subtitle}>
            Manage customer conversations, leads and automation from one place.
          </Text>
        </View>

        {/* Bottom CTA Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGetStarted}
            style={styles.ctaButton}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <Text style={styles.ctaButtonText}>Get Started  →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08080C',
    position: 'relative',
    overflow: 'hidden',
  },
  glowBackdrop: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#6730E6',
    opacity: 0.22,
    transform: [{ scaleY: 0.55 }],
  },
  secondaryGlow: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#9353D3',
    opacity: 0.16,
    transform: [{ scaleY: 0.45 }],
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logoWrapper: {
    marginBottom: 36,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 290,
  },
  bottomContainer: {
    paddingBottom: 20,
    width: '100%',
  },
  ctaButton: {
    backgroundColor: BrandColors.primary,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Path,
  Rect,
} from 'react-native-svg';
import { OrbionLogo } from '../components/common/OrbionLogo';
import { Fonts } from '../theme/tokens';
import { useAppTheme } from '../context/theme-context';
import { useAuth } from '../store/auth';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, isDark, statusBarStyle } = useAppTheme();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isInitialized && auth.token) {
      router.replace('/(tabs)/inbox');
    }
  }, [auth.isInitialized, auth.token]);

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

  const baseBg = isDark ? '#05010B' : colors.background;

  return (
    <View style={[styles.root, { backgroundColor: baseBg }]}>
      <StatusBar style={statusBarStyle} />

      {/* Atmospheric Neon Waves Background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 390 844"
          preserveAspectRatio="none"
        >
          <Defs>
            {/* Top ambient purple glow around brand mark */}
            <RadialGradient
              id="topGlow"
              cx="50%"
              cy="25%"
              rx="60%"
              ry="35%"
              fx="50%"
              fy="25%"
            >
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity={isDark ? 0.14 : 0.10} />
              <Stop offset="60%" stopColor="#6D28D9" stopOpacity={isDark ? 0.04 : 0.02} />
              <Stop offset="100%" stopColor={baseBg} stopOpacity="0" />
            </RadialGradient>

            {/* Bottom luminous glow filling behind wave crests */}
            <RadialGradient
              id="bottomWaveGlow"
              cx="50%"
              cy="74%"
              rx="70%"
              ry="45%"
              fx="50%"
              fy="74%"
            >
              <Stop
                offset="0%"
                stopColor={isDark ? '#7928CA' : '#C4B5FD'}
                stopOpacity={isDark ? 0.45 : 0.35}
              />
              <Stop
                offset="45%"
                stopColor={isDark ? '#581C87' : '#DDD6FE'}
                stopOpacity={isDark ? 0.25 : 0.18}
              />
              <Stop offset="100%" stopColor={baseBg} stopOpacity="0" />
            </RadialGradient>

            {/* Upper sweeping wave gradient body */}
            <SvgLinearGradient
              id="waveFill1"
              x1="0"
              y1="0.3"
              x2="0.6"
              y2="1"
            >
              <Stop
                offset="0%"
                stopColor={isDark ? '#6D28D9' : '#DDD6FE'}
                stopOpacity={isDark ? 0.32 : 0.40}
              />
              <Stop
                offset="50%"
                stopColor={isDark ? '#4C1D95' : '#EDE9FE'}
                stopOpacity={isDark ? 0.18 : 0.22}
              />
              <Stop offset="100%" stopColor={baseBg} stopOpacity="0" />
            </SvgLinearGradient>

            {/* Lower crossing wave gradient body */}
            <SvgLinearGradient
              id="waveFill2"
              x1="0.1"
              y1="1"
              x2="0.9"
              y2="0"
            >
              <Stop
                offset="0%"
                stopColor={isDark ? '#7C3AED' : '#C4B5FD'}
                stopOpacity={isDark ? 0.40 : 0.40}
              />
              <Stop
                offset="60%"
                stopColor={isDark ? '#581C87' : '#DDD6FE'}
                stopOpacity={isDark ? 0.22 : 0.20}
              />
              <Stop offset="100%" stopColor={baseBg} stopOpacity="0" />
            </SvgLinearGradient>

            {/* Neon stroke gradient for wave 1 (upper curve) */}
            <SvgLinearGradient
              id="neonLine1"
              x1="0"
              y1="0"
              x2="1"
              y2="0.6"
            >
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
              <Stop offset="30%" stopColor="#A855F7" stopOpacity="0.95" />
              <Stop offset="65%" stopColor="#C084FC" stopOpacity="1" />
              <Stop offset="90%" stopColor="#8B5CF6" stopOpacity="0.7" />
              <Stop offset="100%" stopColor="#581C87" stopOpacity="0.2" />
            </SvgLinearGradient>

            {/* Neon stroke gradient for wave 2 (crossing sharp beam) */}
            <SvgLinearGradient
              id="neonLine2"
              x1="0"
              y1="1"
              x2="1"
              y2="0"
            >
              <Stop offset="0%" stopColor="#6D28D9" stopOpacity="0.15" />
              <Stop offset="25%" stopColor="#8B5CF6" stopOpacity="0.75" />
              <Stop offset="60%" stopColor="#C084FC" stopOpacity="1" />
              <Stop offset="88%" stopColor={isDark ? '#F3E8FF' : '#7C3AED'} stopOpacity="1" />
              <Stop offset="100%" stopColor="#A855F7" stopOpacity="0.6" />
            </SvgLinearGradient>

            {/* Subtle lower accent line gradient */}
            <SvgLinearGradient
              id="neonLine3"
              x1="0"
              y1="1"
              x2="1"
              y2="0"
            >
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.2" />
              <Stop offset="50%" stopColor="#A855F7" stopOpacity="0.65" />
              <Stop offset="100%" stopColor="#4C1D95" stopOpacity="0.1" />
            </SvgLinearGradient>
          </Defs>

          {/* Ambient light fields */}
          <Rect x="0" y="0" width="390" height="844" fill="url(#topGlow)" />
          <Rect x="0" y="0" width="390" height="844" fill="url(#bottomWaveGlow)" />

          {/* Wave 1: Gradient volume fill under the upper curve */}
          <Path
            d="M -20 625 C 80 575, 180 580, 270 635 C 330 670, 370 690, 410 715 L 410 860 L -20 860 Z"
            fill="url(#waveFill1)"
          />

          {/* Wave 2: Gradient volume fill under crossing curve */}
          <Path
            d="M -20 710 C 100 668, 220 625, 310 575 C 355 548, 385 522, 410 495 L 410 860 L -20 860 Z"
            fill="url(#waveFill2)"
          />

          {/* Wave 1 Neon Stroke - Multi-layered bloom glow */}
          {/* Layer 1: Outer diffused haze */}
          <Path
            d="M -20 625 C 80 575, 180 580, 270 635 C 330 670, 370 690, 410 715"
            fill="none"
            stroke="url(#neonLine1)"
            strokeWidth="18"
            strokeOpacity="0.12"
          />
          {/* Layer 2: Medium glow */}
          <Path
            d="M -20 625 C 80 575, 180 580, 270 635 C 330 670, 370 690, 410 715"
            fill="none"
            stroke="url(#neonLine1)"
            strokeWidth="8"
            strokeOpacity="0.35"
          />
          {/* Layer 3: Vibrant core line */}
          <Path
            d="M -20 625 C 80 575, 180 580, 270 635 C 330 670, 370 690, 410 715"
            fill="none"
            stroke="url(#neonLine1)"
            strokeWidth="3"
            strokeOpacity="0.85"
          />
          {/* Layer 4: Razor sharp light reflection */}
          <Path
            d="M -20 625 C 80 575, 180 580, 270 635 C 330 670, 370 690, 410 715"
            fill="none"
            stroke={isDark ? '#F3E8FF' : '#7C3AED'}
            strokeWidth="1.2"
            strokeOpacity="0.9"
          />

          {/* Wave 2 Neon Stroke - Main intersecting brilliant beam */}
          {/* Layer 1: Broad soft atmospheric aura */}
          <Path
            d="M -20 710 C 100 668, 220 625, 310 575 C 355 548, 385 522, 410 495"
            fill="none"
            stroke="url(#neonLine2)"
            strokeWidth="24"
            strokeOpacity="0.15"
          />
          {/* Layer 2: Concentrated halo */}
          <Path
            d="M -20 710 C 100 668, 220 625, 310 575 C 355 548, 385 522, 410 495"
            fill="none"
            stroke="url(#neonLine2)"
            strokeWidth="10"
            strokeOpacity="0.38"
          />
          {/* Layer 3: Intense laser stroke */}
          <Path
            d="M -20 710 C 100 668, 220 625, 310 575 C 355 548, 385 522, 410 495"
            fill="none"
            stroke="url(#neonLine2)"
            strokeWidth="3.5"
            strokeOpacity="0.9"
          />
          {/* Layer 4: Pure highlight */}
          <Path
            d="M -20 710 C 100 668, 220 625, 310 575 C 355 548, 385 522, 410 495"
            fill="none"
            stroke={isDark ? '#FFFFFF' : '#6D28D9'}
            strokeWidth="1.4"
            strokeOpacity="1"
          />

          {/* Wave 3: Subtle bottom-depth sweeping curve */}
          <Path
            d="M -20 795 C 110 755, 240 710, 410 635"
            fill="none"
            stroke="url(#neonLine3)"
            strokeWidth="12"
            strokeOpacity="0.15"
          />
          <Path
            d="M -20 795 C 110 755, 240 710, 410 635"
            fill="none"
            stroke="url(#neonLine3)"
            strokeWidth="2.5"
            strokeOpacity="0.7"
          />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Top/Center Branding & Copy */}
        <View style={styles.contentContainer}>
          {/* Emblem & OrbionAgents Brand */}
          <View style={styles.logoWrapper}>
            <OrbionLogo size="lg" />
          </View>

          {/* Hero Headline: exactly two lines */}
          <Text style={[styles.headline, { color: colors.textPrimary }]}>
            Your AI Team{'\n'}Always On Everywhere
          </Text>

          {/* Supporting Subtitle: exactly three lines */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage customer conversations,{'\n'}leads and automation from{'\n'}one place.
          </Text>
        </View>

        {/* Bottom CTA Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleGetStarted}
            style={styles.ctaButtonWrapper}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <LinearGradient
              colors={['#8A3FFC', '#5D1FE6']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaButtonText}>Get Started</Text>
              <ArrowRight
                size={20}
                color="#FFFFFF"
                strokeWidth={2.4}
                style={styles.ctaArrow}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
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
    paddingTop: 10,
  },
  logoWrapper: {
    marginBottom: 48,
  },
  headline: {
    fontSize: 30,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 18,
    maxWidth: 320,
  },
  bottomContainer: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 28,
    width: '100%',
  },
  ctaButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaGradient: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  ctaArrow: {
    marginLeft: 8,
  },
});

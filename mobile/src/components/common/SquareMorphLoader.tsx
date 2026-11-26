import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  interpolate,
  Easing,
  useReducedMotion,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, AlertCircle } from 'lucide-react-native';
import { useAppTheme } from '@/context/theme-context';
import { BrandColors, Fonts } from '@/theme/tokens';
import { scaleFont, scaleContainer } from '@/theme/responsive';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'dismissed';
export type LoaderSize = 'sm' | 'md' | 'lg' | 'xl' | number;

export interface SquareMorphLoaderProps {
  /** Current state of the loader. Default: 'loading' */
  state?: LoadingState;
  /** Size preset or exact numeric pixel size. Default: 'md' (44px) */
  size?: LoaderSize;
  /** Optional loading or status label shown below the animation */
  label?: string;
  /** Optional subtitle or secondary text below the label */
  sublabel?: string;
  /** Show animated 3-dot wave below the loader. Default: false */
  showDots?: boolean;
  /** Enable the ambient neon glow aura around the shape. Default: true */
  glow?: boolean;
  /** Custom primary brand color or gradient start color */
  color?: string;
  /** Custom secondary or gradient end color */
  secondaryColor?: string;
  /** Custom glow halo color */
  glowColor?: string;
  /** Custom success state color. Default: emerald green #22C55E */
  successColor?: string;
  /** Custom error state color. Default: coral red #EF4444 */
  errorColor?: string;
  /** Auto-dismiss duration in ms after reaching success or error state. Default: 1600ms (0 to disable) */
  autoDismissDelay?: number;
  /** Callback fired when dismissed transition completes */
  onDismissed?: () => void;
  /** Callback fired when success animation completes */
  onSuccessComplete?: () => void;
  /** Callback fired when error animation completes */
  onErrorComplete?: () => void;
  /** Whether to render as an overlay centered in screen / container */
  fullscreen?: boolean;
  /** Container custom style */
  style?: StyleProp<ViewStyle>;
  /** Label custom style */
  labelStyle?: StyleProp<TextStyle>;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Test identifier */
  testID?: string;
}

// Spring physics config matching specification (damping: 15, stiffness: 150)
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

// Fluid cubic-bezier easing config (0.22, 1, 0.36, 1)
const FLUID_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const CYCLE_DURATION = 2200; // ms for one full seamless organic morph cycle

export const SquareMorphLoader: React.FC<SquareMorphLoaderProps> = ({
  state = 'loading',
  size = 'md',
  label,
  sublabel,
  showDots = false,
  glow = true,
  color,
  secondaryColor,
  glowColor,
  successColor = '#22C55E',
  errorColor = '#EF4444',
  autoDismissDelay = 1600,
  onDismissed,
  onSuccessComplete,
  onErrorComplete,
  fullscreen = false,
  style,
  labelStyle,
  accessibilityLabel,
  testID = 'square-morph-loader',
}) => {
  const { colors, isDark } = useAppTheme();
  const prefersReducedMotion = useReducedMotion();

  // Resolve numerical dimensions
  const resolvedSize = useMemo(() => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 64;
      case 'xl':
        return 84;
      case 'md':
      default:
        return 44;
    }
  }, [size]);

  const baseRadius = Math.round(resolvedSize * 0.26); // ~11-12px for 44px
  const iconSize = Math.round(resolvedSize * 0.52);

  // Dynamic theme colors
  const activeColorStart = color || (isDark ? BrandColors.primaryLight : BrandColors.primary);
  const activeColorEnd = secondaryColor || (isDark ? BrandColors.primaryDark : BrandColors.primaryGradientEnd);
  const activeGlow = glowColor || (isDark ? 'rgba(139, 92, 246, 0.38)' : 'rgba(129, 74, 200, 0.22)');

  // -------------------------------------------------------------
  // SHARED ANIMATION VALUES
  // -------------------------------------------------------------
  const morphProgress = useSharedValue(0);
  const masterScale = useSharedValue(state === 'idle' ? 0.95 : state === 'dismissed' ? 0 : 1);
  const masterOpacity = useSharedValue(state === 'idle' ? 0.7 : state === 'dismissed' ? 0 : 1);
  const shakeX = useSharedValue(0);

  // State-specific layer opacities
  const successOpacity = useSharedValue(state === 'success' ? 1 : 0);
  const errorOpacity = useSharedValue(state === 'error' ? 1 : 0);
  const iconScale = useSharedValue(state === 'success' || state === 'error' ? 1 : 0);

  // Dot wave animations
  const dotProgress1 = useSharedValue(0);
  const dotProgress2 = useSharedValue(0);
  const dotProgress3 = useSharedValue(0);

  // Ref to track timeouts safely
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Screen reader announcement on state change
  useEffect(() => {
    if (state === 'success') {
      AccessibilityInfo.announceForAccessibility?.('Operation completed successfully.');
    } else if (state === 'error') {
      AccessibilityInfo.announceForAccessibility?.('An error occurred.');
    } else if (state === 'loading') {
      AccessibilityInfo.announceForAccessibility?.(label || 'Loading content.');
    }
  }, [state, label]);

  // -------------------------------------------------------------
  // ANIMATION LOOPS & STATE MANAGEMENT
  // -------------------------------------------------------------
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (state === 'loading') {
      // Reset state overlays
      successOpacity.value = withTiming(0, { duration: 150 });
      errorOpacity.value = withTiming(0, { duration: 150 });
      iconScale.value = withTiming(0, { duration: 150 });
      shakeX.value = 0;

      // Bring master in smoothly
      masterScale.value = withSpring(1, SPRING_CONFIG);
      masterOpacity.value = withTiming(1, { duration: 250 });

      if (prefersReducedMotion) {
        // Simplified gentle breathing for reduced motion preference
        morphProgress.value = withRepeat(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      } else {
        // Full organic fluid morph continuous loop
        morphProgress.value = 0;
        morphProgress.value = withRepeat(
          withTiming(1, { duration: CYCLE_DURATION, easing: FLUID_EASING }),
          -1,
          false
        );
      }

      // Dot sequence
      if (showDots && !prefersReducedMotion) {
        dotProgress1.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 400, easing: Easing.bezier(0.33, 1, 0.68, 1) }),
            withTiming(0, { duration: 400, easing: Easing.bezier(0.32, 0, 0.67, 0) })
          ),
          -1,
          false
        );
        dotProgress2.value = withDelay(
          180,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 400, easing: Easing.bezier(0.33, 1, 0.68, 1) }),
              withTiming(0, { duration: 400, easing: Easing.bezier(0.32, 0, 0.67, 0) })
            ),
            -1,
            false
          )
        );
        dotProgress3.value = withDelay(
          360,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 400, easing: Easing.bezier(0.33, 1, 0.68, 1) }),
              withTiming(0, { duration: 400, easing: Easing.bezier(0.32, 0, 0.67, 0) })
            ),
            -1,
            false
          )
        );
      }
    } else if (state === 'success') {
      // Morph gracefully into steady circle
      cancelAnimation(morphProgress);
      morphProgress.value = withSpring(0.25, SPRING_CONFIG); // 0.25 corresponds to circle geometry

      // Spring pop
      masterScale.value = withSequence(
        withSpring(1.18, { damping: 10, stiffness: 220 }),
        withSpring(1.0, SPRING_CONFIG)
      );

      // Reveal success layer and checkmark
      successOpacity.value = withTiming(1, { duration: 250 });
      iconScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));

      if (onSuccessComplete) {
        runOnJS(onSuccessComplete)();
      }

      // Auto dismiss handling
      if (autoDismissDelay > 0) {
        timerRef.current = setTimeout(() => {
          masterScale.value = withSpring(0, SPRING_CONFIG);
          masterOpacity.value = withTiming(0, { duration: 240 }, (finished) => {
            if (finished && onDismissed) {
              runOnJS(onDismissed)();
            }
          });
        }, autoDismissDelay);
      }
    } else if (state === 'error') {
      // Morph gracefully to rounded square
      cancelAnimation(morphProgress);
      morphProgress.value = withSpring(0, SPRING_CONFIG);

      // Reveal error layer and alert icon
      errorOpacity.value = withTiming(1, { duration: 200 });
      iconScale.value = withDelay(80, withSpring(1, { damping: 12, stiffness: 180 }));

      // Subtle haptic horizontal shake
      if (!prefersReducedMotion) {
        shakeX.value = withSequence(
          withTiming(-8, { duration: 60 }),
          withTiming(8, { duration: 60 }),
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withTiming(-3, { duration: 50 }),
          withTiming(3, { duration: 50 }),
          withTiming(0, { duration: 40 })
        );
      }

      if (onErrorComplete) {
        runOnJS(onErrorComplete)();
      }

      // Auto dismiss handling
      if (autoDismissDelay > 0) {
        timerRef.current = setTimeout(() => {
          masterScale.value = withSpring(0, SPRING_CONFIG);
          masterOpacity.value = withTiming(0, { duration: 240 }, (finished) => {
            if (finished && onDismissed) {
              runOnJS(onDismissed)();
            }
          });
        }, autoDismissDelay);
      }
    } else if (state === 'dismissed') {
      cancelAnimation(morphProgress);
      masterScale.value = withSpring(0, SPRING_CONFIG);
      masterOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
        if (finished && onDismissed) {
          runOnJS(onDismissed)();
        }
      });
    } else if (state === 'idle') {
      cancelAnimation(morphProgress);
      morphProgress.value = 0;
      masterScale.value = withSpring(0.95, SPRING_CONFIG);
      masterOpacity.value = withTiming(0.65, { duration: 200 });
      successOpacity.value = 0;
      errorOpacity.value = 0;
      iconScale.value = 0;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      cancelAnimation(morphProgress);
      cancelAnimation(masterScale);
      cancelAnimation(masterOpacity);
      cancelAnimation(shakeX);
      cancelAnimation(successOpacity);
      cancelAnimation(errorOpacity);
      cancelAnimation(iconScale);
      cancelAnimation(dotProgress1);
      cancelAnimation(dotProgress2);
      cancelAnimation(dotProgress3);
    };
    // SharedValues are stable across renders in Reanimated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state,
    autoDismissDelay,
    prefersReducedMotion,
    showDots,
    onDismissed,
    onSuccessComplete,
    onErrorComplete,
  ]);

  // -------------------------------------------------------------
  // ANIMATED STYLES (PURE UI THREAD WORKLETS)
  // -------------------------------------------------------------
  const maxRadius = resolvedSize / 2;

  // Outer container transform (handles master scale, shake & exit)
  const masterContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: masterScale.value },
        { translateX: shakeX.value },
      ],
      opacity: masterOpacity.value,
    };
  });

  // Main morphing square style
  const morphingSquareStyle = useAnimatedStyle(() => {
    if (prefersReducedMotion) {
      // Subtle pulse opacity only
      const p = morphProgress.value;
      const opacity = interpolate(p, [0, 1], [0.75, 1.0]);
      return {
        borderRadius: baseRadius,
        transform: [{ scaleX: 1 }, { scaleY: 1 }, { rotate: '0deg' }],
        opacity,
      };
    }

    const p = morphProgress.value;

    // Border Radius Interpolation (Rounded Square -> Circle -> Pill -> Diamond Squircle -> Rounded Square)
    const currentRadius = interpolate(
      p,
      [0, 0.22, 0.48, 0.74, 1.0],
      [baseRadius, maxRadius, maxRadius, baseRadius * 0.72, baseRadius]
    );

    // Squash & Stretch ScaleX (Volume preserving)
    const scaleX = interpolate(
      p,
      [0, 0.2, 0.46, 0.72, 0.9, 1.0],
      [1.0, 1.1, 1.22, 0.92, 1.03, 1.0]
    );

    // Squash & Stretch ScaleY
    const scaleY = interpolate(
      p,
      [0, 0.2, 0.46, 0.72, 0.9, 1.0],
      [1.0, 1.1, 0.84, 1.18, 0.98, 1.0]
    );

    // Continuous Fluid Rotation (0deg -> 45deg -> 90deg -> 135deg -> 180deg)
    const rotateDeg = interpolate(p, [0, 1], [0, 180]);

    return {
      borderRadius: currentRadius,
      transform: [
        { scaleX },
        { scaleY },
        { rotate: `${rotateDeg}deg` },
      ],
    };
  });

  // Ambient Glow Aura
  const ambientGlowStyle = useAnimatedStyle(() => {
    if (!glow) return { opacity: 0 };
    if (prefersReducedMotion) {
      return {
        opacity: interpolate(morphProgress.value, [0, 1], [0.2, 0.4]),
        transform: [{ scale: 1.15 }],
      };
    }

    const p = morphProgress.value;
    const glowScale = interpolate(p, [0, 0.5, 1], [1.18, 1.42, 1.18]);
    const glowOpacity = interpolate(p, [0, 0.5, 1], [0.28, 0.65, 0.28]);
    const currentRadius = interpolate(
      p,
      [0, 0.22, 0.48, 0.74, 1.0],
      [baseRadius * 1.3, maxRadius * 1.3, maxRadius * 1.3, baseRadius * 1.1, baseRadius * 1.3]
    );

    return {
      borderRadius: currentRadius,
      transform: [{ scale: glowScale }],
      opacity: glowOpacity,
    };
  });

  // Inner Core Micro-Accent Style (gives liquid depth & counter-rotation)
  const innerCoreStyle = useAnimatedStyle(() => {
    if (prefersReducedMotion) {
      return { opacity: 0.8 };
    }

    const p = morphProgress.value;
    const coreScale = interpolate(p, [0, 0.25, 0.5, 0.75, 1], [0.85, 0.45, 0.95, 0.5, 0.85]);
    const coreRotate = interpolate(p, [0, 1], [0, -180]);
    const coreOpacity = interpolate(p, [0, 0.5, 1], [0.9, 0.35, 0.9]);

    return {
      transform: [
        { scale: coreScale },
        { rotate: `${coreRotate}deg` },
      ],
      opacity: coreOpacity,
    };
  });

  // State Overlay Styles
  const successOverlayStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
  }));

  const errorOverlayStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconScale.value,
  }));

  // Dot wave animations
  const dot1Style = useAnimatedStyle(() => ({
    opacity: interpolate(dotProgress1.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dotProgress1.value, [0, 1], [0, -4]) }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: interpolate(dotProgress2.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dotProgress2.value, [0, 1], [0, -4]) }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: interpolate(dotProgress3.value, [0, 1], [0.3, 1]),
    transform: [{ translateY: interpolate(dotProgress3.value, [0, 1], [0, -4]) }],
  }));

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  const content = (
    <Animated.View
      style={[
        styles.masterWrapper,
        fullscreen && styles.fullscreenContainer,
        style,
        masterContainerStyle,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel || label || (state === 'success' ? 'Success' : state === 'error' ? 'Error' : 'Loading')}
      accessibilityState={{ busy: state === 'loading' }}
      accessibilityLiveRegion={state === 'success' || state === 'error' ? 'polite' : 'none'}
      testID={testID}
    >
      {/* Central Morph Stage */}
      <View
        style={[
          styles.morphStage,
          {
            width: resolvedSize * 1.5,
            height: resolvedSize * 1.5,
          },
        ]}
      >
        {/* Layer 1: Ambient Glow Aura */}
        {glow && (
          <Animated.View
            style={[
              styles.glowAura,
              {
                width: resolvedSize,
                height: resolvedSize,
                backgroundColor:
                  state === 'success'
                    ? 'rgba(34, 197, 94, 0.45)'
                    : state === 'error'
                    ? 'rgba(239, 68, 68, 0.45)'
                    : activeGlow,
              },
              ambientGlowStyle,
            ]}
          />
        )}

        {/* Layer 2: Main Morphing Body */}
        <Animated.View
          style={[
            styles.morphingSquare,
            {
              width: resolvedSize,
              height: resolvedSize,
            },
            morphingSquareStyle,
          ]}
        >
          {/* Base Brand Linear Gradient */}
          <LinearGradient
            colors={[activeColorStart, activeColorEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Success State Gradient Layer */}
          <Animated.View style={[StyleSheet.absoluteFill, successOverlayStyle]}>
            <LinearGradient
              colors={[successColor, '#15803D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Error State Gradient Layer */}
          <Animated.View style={[StyleSheet.absoluteFill, errorOverlayStyle]}>
            <LinearGradient
              colors={[errorColor, '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Subtle Glassmorphic Inset Specular Highlight */}
          <View
            style={[
              styles.specularRim,
              {
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.28)'
                  : 'rgba(255, 255, 255, 0.55)',
              },
            ]}
          />

          {/* Layer 3: Inner Core Accent (Depth, liquid counter-rotation) */}
          {state === 'loading' && (
            <Animated.View
              style={[
                styles.innerCore,
                {
                  width: Math.round(resolvedSize * 0.32),
                  height: Math.round(resolvedSize * 0.32),
                  borderRadius: Math.round(baseRadius * 0.42),
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.85)'
                    : '#FFFFFF',
                },
                innerCoreStyle,
              ]}
            />
          )}

          {/* Layer 4: State Icons (Success Checkmark / Error Alert) */}
          <Animated.View style={[styles.iconContainer, iconContainerStyle]}>
            {state === 'success' && (
              <Check
                size={iconSize}
                color="#FFFFFF"
                strokeWidth={3}
              />
            )}
            {state === 'error' && (
              <AlertCircle
                size={iconSize}
                color="#FFFFFF"
                strokeWidth={2.8}
              />
            )}
          </Animated.View>
        </Animated.View>
      </View>

      {/* Label and Subtitle */}
      {(label || sublabel) && (
        <View style={styles.textContainer}>
          {label && (
            <Text
              style={[
                styles.labelText,
                { color: colors.textPrimary },
                labelStyle,
              ]}
            >
              {label}
            </Text>
          )}
          {sublabel && (
            <Text
              style={[
                styles.sublabelText,
                { color: colors.textSecondary },
              ]}
            >
              {sublabel}
            </Text>
          )}
        </View>
      )}

      {/* Optional Animated Dot Wave Indicator */}
      {showDots && state === 'loading' && (
        <View style={styles.dotsRow}>
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: activeColorStart },
              dot1Style,
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: activeColorStart },
              dot2Style,
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: activeColorStart },
              dot3Style,
            ]}
          />
        </View>
      )}
    </Animated.View>
  );

  if (fullscreen) {
    return (
      <View
        style={[
          styles.fullscreenBackdrop,
          {
            backgroundColor: isDark
              ? 'rgba(7, 6, 10, 0.72)'
              : 'rgba(248, 249, 250, 0.78)',
          },
        ]}
      >
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  masterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaleContainer(24),
  },
  fullscreenContainer: {
    padding: scaleContainer(24),
    borderRadius: scaleContainer(20),
  },
  morphStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowAura: {
    position: 'absolute',
  },
  morphingSquare: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  specularRim: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: 999, // Inherits clip from parent
    opacity: 0.8,
  },
  innerCore: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleContainer(12),
  },
  labelText: {
    fontSize: scaleFont(14),
    fontFamily: Fonts.medium,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  sublabelText: {
    fontSize: scaleFont(12),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: scaleContainer(3),
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleContainer(6),
    marginTop: scaleContainer(10),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

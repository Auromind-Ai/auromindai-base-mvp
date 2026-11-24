import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useAppTheme } from '@/context/theme-context';
import { scaleContainer } from '@/theme/responsive';

export interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%`;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { isDark } = useAppTheme();
  const prefersReducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      pulse.value = 0.5;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [prefersReducedMotion, pulse]);

  const animatedStyle = useAnimatedStyle(() => {
    if (prefersReducedMotion) {
      return { opacity: 0.6 };
    }
    const opacity = interpolate(pulse.value, [0, 1], [0.35, 0.85]);
    return { opacity };
  });

  const baseBg = isDark ? '#1C1A27' : '#E5E7EB';

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseBg,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Preset 1: Single Text Line
function SkeletonLine({
  width = '100%',
  height = 14,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <Skeleton width={width} height={height} borderRadius={6} style={style} />;
}
SkeletonLine.displayName = 'Skeleton.Line';

// Preset 2: Avatar / Icon Circle
function SkeletonCircle({
  size = 44,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}
SkeletonCircle.displayName = 'Skeleton.Circle';

// Preset 3: Container / Card Block
function SkeletonCard({
  height = 80,
  style,
  children,
}: {
  height?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { isDark } = useAppTheme();
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#121019' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E5E7EB',
          height,
        },
        style,
      ]}
    >
      {children || <Skeleton width="100%" height="100%" borderRadius={12} />}
    </View>
  );
}
SkeletonCard.displayName = 'Skeleton.Card';

// Preset 4: Full List Row (Avatar + 2 Lines + Badge)
function SkeletonListRow({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useAppTheme();
  return (
    <View
      style={[
        styles.listRow,
        {
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
        },
        style,
      ]}
    >
      <SkeletonCircle size={44} />
      <View style={styles.listRowContent}>
        <SkeletonLine width="65%" height={14} style={{ marginBottom: 6 }} />
        <SkeletonLine width="90%" height={12} />
      </View>
      <Skeleton width={50} height={20} borderRadius={10} />
    </View>
  );
}
SkeletonListRow.displayName = 'Skeleton.ListRow';

Skeleton.Line = SkeletonLine;
Skeleton.Circle = SkeletonCircle;
Skeleton.Card = SkeletonCard;
Skeleton.ListRow = SkeletonListRow;

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: scaleContainer(16),
    borderWidth: 1,
    padding: scaleContainer(14),
    marginBottom: scaleContainer(12),
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleContainer(14),
    paddingHorizontal: scaleContainer(16),
    borderBottomWidth: 1,
    gap: scaleContainer(12),
  },
  listRowContent: {
    flex: 1,
  },
});

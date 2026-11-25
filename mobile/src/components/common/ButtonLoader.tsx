import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

export interface ButtonLoaderProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  size = 18,
  color = '#FFFFFF',
  style,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
      false
    );
  }, [prefersReducedMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    if (prefersReducedMotion) {
      return { opacity: 0.8 };
    }
    const rotateDeg = interpolate(rotation.value, [0, 1], [0, 360]);
    return {
      transform: [{ rotate: `${rotateDeg}deg` }],
    };
  });

  const strokeWidth = Math.max(2, Math.round(size * 0.12));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading action"
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            borderTopColor: color,
            borderRightColor: color,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

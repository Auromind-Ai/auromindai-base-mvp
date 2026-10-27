/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter-Regular',
    serif: 'ui-serif',
    rounded: 'Inter-Regular',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter-Regular',
    serif: 'serif',
    rounded: 'Inter-Regular',
    mono: 'monospace',
  },
  web: {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'var(--font-serif)',
    rounded: 'Inter, system-ui, sans-serif',
    mono: 'var(--font-mono)',
  },
}) as {
  sans: string;
  serif: string;
  rounded: string;
  mono: string;
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

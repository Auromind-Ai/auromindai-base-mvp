import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts as ThemeFonts, ThemeColor } from '@/constants/theme';
import { Fonts } from '@/theme/tokens';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 36,
    lineHeight: 42,
  },
  subtitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 24,
    lineHeight: 32,
  },
  link: {
    fontFamily: Fonts.medium,
    lineHeight: 24,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fonts.semiBold,
    lineHeight: 24,
    fontSize: 14,
    color: '#9C75FF',
  },
  code: {
    fontFamily: ThemeFonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});

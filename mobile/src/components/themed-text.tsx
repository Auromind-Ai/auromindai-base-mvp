import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import { scaleFont } from '../theme/responsive';

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
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    fontWeight: '400',
  },
  smallBold: {
    fontFamily: 'Poppins-Bold',
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    fontWeight: '700',
  },
  default: {
    fontFamily: 'Poppins-Regular',
    fontSize: scaleFont(16),
    lineHeight: scaleFont(24),
    fontWeight: '400',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: scaleFont(48),
    fontWeight: '700',
    lineHeight: scaleFont(52),
  },
  subtitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: scaleFont(32),
    lineHeight: scaleFont(44),
    fontWeight: '600',
  },
  link: {
    fontFamily: 'Poppins-Medium',
    lineHeight: scaleFont(30),
    fontSize: scaleFont(14),
  },
  linkPrimary: {
    fontFamily: 'Poppins-Medium',
    lineHeight: scaleFont(30),
    fontSize: scaleFont(14),
    color: '#9C75FF',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: scaleFont(12),
  },
});

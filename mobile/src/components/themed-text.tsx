import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';

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
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  smallBold: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 32,
    lineHeight: 44,
    fontWeight: '600',
  },
  link: {
    fontFamily: 'Poppins-Medium',
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: 'Poppins-Medium',
    lineHeight: 30,
    fontSize: 14,
    color: '#9C75FF',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});

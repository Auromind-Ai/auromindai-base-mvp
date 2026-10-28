export type AppearanceMode = 'System' | 'Light' | 'Dark';
export type ThemeMode = 'System' | 'Light' | 'Dark' | 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceBorder: string;
  card: string;
  cardElevated: string;
  cardBorder: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  buttonText: string;
  glowPurple: string;
  glowArc: string;
  segmentedBg: string;
  segmentedBorder: string;
  segmentedActiveTab: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;
  icon: string;
  iconMuted: string;
  btnSecondaryBg: string;
  btnSecondaryBorder: string;
  btnSecondaryText: string;
  // Compatibility with Colors in constants/theme.ts
  text: string;
  backgroundElement: string;
  backgroundSelected: string;
}

export interface ThemeContextValue {
  themeMode: AppearanceMode;
  setThemeMode: (mode: AppearanceMode) => Promise<void>;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  isLoaded: boolean;
  colors: ThemeColors;
  statusBarStyle: 'light' | 'dark';
}

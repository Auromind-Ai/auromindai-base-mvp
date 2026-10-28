import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  useColorScheme as useRNColorScheme,
  Appearance,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppearanceMode,
  ResolvedTheme,
  ThemeContextValue,
} from '../types/theme';
import { ColorTokens } from '../theme/tokens';

const THEME_STORAGE_KEY = '@orbion_theme_appearance';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const rnColorScheme = useRNColorScheme();
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(
    rnColorScheme === 'light' ? 'light' : 'dark'
  );
  const [themeMode, setThemeModeState] = useState<AppearanceMode>('Dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync with native Appearance changes
  useEffect(() => {
    const current = Appearance.getColorScheme();
    if (current) {
      setSystemScheme(current === 'light' ? 'light' : 'dark');
    }

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'light' ? 'light' : 'dark');
    });

    return () => subscription.remove();
  }, []);

  // Also react to RN useColorScheme hook changes
  useEffect(() => {
    if (rnColorScheme) {
      setSystemScheme(rnColorScheme === 'light' ? 'light' : 'dark');
    }
  }, [rnColorScheme]);

  // Load saved theme mode from storage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          stored &&
          (stored === 'System' || stored === 'Light' || stored === 'Dark')
        ) {
          if (isMounted) {
            setThemeModeState(stored);
          }
        } else if (typeof window !== 'undefined' && window.localStorage) {
          const webStored = window.localStorage.getItem(THEME_STORAGE_KEY);
          if (
            webStored &&
            (webStored === 'System' ||
              webStored === 'Light' ||
              webStored === 'Dark')
          ) {
            if (isMounted) {
              setThemeModeState(webStored as AppearanceMode);
            }
          }
        }
      } catch {
        // Fallback gracefully to default
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: AppearanceMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage error ignored
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {}
    }
  }, []);

  // Compute resolved active theme (dark or light)
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'Light') {
      return 'light';
    }
    if (themeMode === 'Dark') {
      return 'dark';
    }
    // 'System' mode follows systemScheme
    return systemScheme;
  }, [themeMode, systemScheme]);

  const isDark = resolvedTheme === 'dark';
  const statusBarStyle: 'light' | 'dark' = isDark ? 'light' : 'dark';
  const colors = ColorTokens[resolvedTheme];

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      setThemeMode,
      resolvedTheme,
      isDark,
      isLoaded,
      colors,
      statusBarStyle,
    }),
    [themeMode, setThemeMode, resolvedTheme, isDark, isLoaded, colors, statusBarStyle]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider
    const colors = ColorTokens.dark;
    return {
      themeMode: 'Dark',
      setThemeMode: async () => {},
      resolvedTheme: 'dark',
      isDark: true,
      isLoaded: true,
      colors,
      statusBarStyle: 'light',
    };
  }
  return context;
}

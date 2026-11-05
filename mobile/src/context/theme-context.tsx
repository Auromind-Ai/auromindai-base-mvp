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
  const [nativeScheme, setNativeScheme] = useState<'light' | 'dark'>(() => {
    const current = Appearance.getColorScheme();
    if (current === 'light' || current === 'dark') return current;
    return rnColorScheme === 'dark' ? 'dark' : 'light';
  });
  const [themeMode, setThemeModeState] = useState<AppearanceMode>('System');
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync with native Appearance listener
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === 'light' || colorScheme === 'dark') {
        setNativeScheme(colorScheme);
      }
    });

    return () => subscription.remove();
  }, []);

  const systemScheme =
    rnColorScheme === 'light' || rnColorScheme === 'dark'
      ? rnColorScheme
      : nativeScheme;

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
    const nativeScheme = Appearance.getColorScheme();
    const fallbackResolved: ResolvedTheme = nativeScheme === 'light' ? 'light' : 'dark';
    const colors = ColorTokens[fallbackResolved];
    return {
      themeMode: 'System',
      setThemeMode: async () => {},
      resolvedTheme: fallbackResolved,
      isDark: fallbackResolved === 'dark',
      isLoaded: true,
      colors,
      statusBarStyle: fallbackResolved === 'dark' ? 'light' : 'dark',
    };
  }
  return context;
}

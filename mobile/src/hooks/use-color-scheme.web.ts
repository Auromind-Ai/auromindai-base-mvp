import { useAppTheme } from '../context/theme-context';

export function useColorScheme() {
  try {
    const { resolvedTheme } = useAppTheme();
    return resolvedTheme;
  } catch {
    return 'dark';
  }
}

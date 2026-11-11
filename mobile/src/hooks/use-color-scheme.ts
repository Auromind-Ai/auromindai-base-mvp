import { useAppTheme } from '../context/theme-context';

export function useColorScheme() {
  const { resolvedTheme } = useAppTheme();
  return resolvedTheme;
}

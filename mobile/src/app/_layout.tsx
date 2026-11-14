import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

LogBox.ignoreLogs([
  "The action 'GO_BACK' was not handled by any navigator",
]);
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { ThemeProvider, useAppTheme } from '../context/theme-context';
import { BiometricLockProvider, useBiometricLock } from '../context/biometric-lock-context';
import { BiometricLockOverlay } from '../components/BiometricLockOverlay';
import { usePushNotificationListeners } from '../hooks/use-push-notifications';
import { useAuth } from '../store/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationRoot({
  fontsLoaded,
  fontsError,
  timedOut,
}: {
  fontsLoaded: boolean;
  fontsError: any;
  timedOut: boolean;
}) {
  const { colors, statusBarStyle, isLoaded: themeLoaded } = useAppTheme();
  const { isReady: biometricReady } = useBiometricLock();
  const auth = useAuth();
  usePushNotificationListeners();

  useEffect(() => {
    // Only dismiss splash screen once fonts, theme, biometric preferences, AND auth are ready
    if (
      (fontsLoaded || fontsError || timedOut) &&
      (themeLoaded || timedOut) &&
      (biometricReady || timedOut) &&
      (auth.isInitialized || timedOut)
    ) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError, themeLoaded, biometricReady, auth.isInitialized, timedOut]);

  if (
    (!themeLoaded && !timedOut) ||
    (!fontsLoaded && !fontsError && !timedOut) ||
    (!biometricReady && !timedOut) ||
    (!auth.isInitialized && !timedOut)
  ) {
    return null;
  }

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workspace-selection" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="customer/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="connected-channels" options={{ headerShown: false }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false }} />
      </Stack>
      <BiometricLockOverlay />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Poppins-Light': Poppins_300Light,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,
    Poppins: Poppins_400Regular,
    // Aliases to seamlessly maintain backwards compatibility
    'Inter-Regular': Poppins_400Regular,
    'Inter-Medium': Poppins_500Medium,
    'Inter-SemiBold': Poppins_600SemiBold,
    'Inter-Bold': Poppins_700Bold,
  });

  const [timedOut, setTimedOut] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <BiometricLockProvider>
          <NavigationRoot fontsLoaded={loaded} fontsError={error} timedOut={timedOut} />
        </BiometricLockProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

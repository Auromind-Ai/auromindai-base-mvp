import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
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

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontsError || timedOut) && (themeLoaded || timedOut)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError, themeLoaded, timedOut]);

  if ((!themeLoaded && !timedOut) || (!fontsLoaded && !fontsError && !timedOut)) {
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
      </Stack>
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
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationRoot fontsLoaded={loaded} fontsError={error} timedOut={timedOut} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

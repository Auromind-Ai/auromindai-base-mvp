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
}: {
  fontsLoaded: boolean;
  fontsError: any;
}) {
  const { colors, statusBarStyle, isLoaded: themeLoaded } = useAppTheme();

  useEffect(() => {
    if ((fontsLoaded || fontsError) && themeLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError, themeLoaded]);

  if (!themeLoaded || (!fontsLoaded && !fontsError)) {
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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationRoot fontsLoaded={loaded} fontsError={error} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

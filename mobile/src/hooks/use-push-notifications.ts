import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, unregisterPushToken } from '../api/notifications';
import { PushNotificationData, PlatformType } from '../types/notifications';

const STORAGE_KEY_TOKEN = '@orbion_push_token';
const STORAGE_KEY_ENABLED = '@orbion_push_enabled';

// Configure foreground notification behavior for iOS & Android
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  /**
   * Configure Android Notification Channel
   * Android 8.0+ (API 26+) strictly requires a notification channel to display notifications.
   */
  const setupAndroidChannel = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Alerts',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6F5BFF',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Chat & Lead Messages',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 150, 150, 150],
        lightColor: '#8060E8',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }
  };

  /**
   * Request push notification permissions and generate Expo Push Token
   */
  const registerForPushNotificationsAsync = useCallback(async (): Promise<string | null> => {
    // Web platform guard
    if (Platform.OS === 'web') {
      console.log('[Push] Web push notifications not enabled via expo-notifications');
      return null;
    }

    // Emulator / Simulator guard: Physical device required for remote notifications
    if (!Device.isDevice) {
      console.warn('[Push] Remote push notifications require a physical device (iOS/Android)');
      return null;
    }

    try {
      await setupAndroidChannel();

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Ask user for permission if not granted yet
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setIsPermissionGranted(false);
        console.warn('[Push] Notification permission was denied by user');
        return null;
      }

      setIsPermissionGranted(true);

      // Resolve Project ID safely from Expo Constants
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const token = tokenResponse.data;
      setExpoPushToken(token);
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);

      // Sync token to backend
      const platform: PlatformType = Platform.OS === 'ios' ? 'ios' : 'android';
      const deviceName = Device.modelName || Device.deviceName || `${Platform.OS} device`;

      await registerPushToken({
        push_token: token,
        platform,
        device_name: deviceName,
      }).catch((err) => {
        // Backend endpoint might not be deployed yet; fail gracefully
        console.warn('[Push] Token sync to backend failed (will retry on next launch):', err?.message || err);
      });

      return token;
    } catch (error) {
      console.error('[Push] Error registering for push notifications:', error);
      return null;
    }
  }, []);

  /**
   * Unregister token (called on user logout or toggle off in settings)
   */
  const unregisterDeviceToken = useCallback(async () => {
    try {
      const storedToken = expoPushToken || (await AsyncStorage.getItem(STORAGE_KEY_TOKEN));
      if (storedToken) {
        await unregisterPushToken(storedToken).catch(() => {});
        await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
      }
      setExpoPushToken(null);
    } catch (err) {
      console.error('[Push] Error unregistering token:', err);
    }
  }, [expoPushToken]);

  /**
   * Toggle push notifications on/off from Settings screen
   */
  const togglePushNotifications = useCallback(
    async (enable: boolean): Promise<boolean> => {
      setIsLoading(true);
      try {
        if (enable) {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            setIsEnabled(true);
            await AsyncStorage.setItem(STORAGE_KEY_ENABLED, 'true');
            setIsLoading(false);
            return true;
          } else {
            setIsEnabled(false);
            await AsyncStorage.setItem(STORAGE_KEY_ENABLED, 'false');
            setIsLoading(false);
            return false;
          }
        } else {
          await unregisterDeviceToken();
          setIsEnabled(false);
          await AsyncStorage.setItem(STORAGE_KEY_ENABLED, 'false');
          setIsLoading(false);
          return true;
        }
      } catch (err) {
        console.error('[Push] Error toggling notifications:', err);
        setIsLoading(false);
        return false;
      }
    },
    [registerForPushNotificationsAsync, unregisterDeviceToken]
  );

  // Initialize listeners and check status on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const savedPref = await AsyncStorage.getItem(STORAGE_KEY_ENABLED);
        const shouldEnable = savedPref !== 'false'; // Default to true if not set
        if (isMounted) setIsEnabled(shouldEnable);

        if (shouldEnable) {
          await registerForPushNotificationsAsync();
        }
      } catch (err) {
        console.error('[Push] Init error:', err);
      }
    })();

    // 1. Foreground notification received listener
    notificationListener.current = Notifications.addNotificationReceivedListener((incoming) => {
      setNotification(incoming);
    });

    // 2. Notification response (user tapped notification) listener -> Deep Linking
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as PushNotificationData;

        // Custom route navigation
        if (data?.route) {
          router.push(data.route as any);
        } else if (data?.conversation_id) {
          router.push(`/chat/${data.conversation_id}` as any);
        } else if (data?.lead_id) {
          router.push(`/customer/${data.lead_id}` as any);
        } else {
          router.push('/(tabs)/inbox' as any);
        }
      } catch (err) {
        console.error('[Push] Error navigating from notification tap:', err);
      }
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [registerForPushNotificationsAsync, router]);

  return {
    expoPushToken,
    notification,
    isPermissionGranted,
    isEnabled,
    isLoading,
    registerForPushNotificationsAsync,
    unregisterDeviceToken,
    togglePushNotifications,
  };
}

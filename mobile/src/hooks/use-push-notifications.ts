import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchUserPreferences,
  registerPushToken,
  unregisterPushToken,
  updatePushPreferences,
} from '../api/notifications';
import { PushNotificationData, PlatformType, PushPreferences } from '../types/notifications';
import { useAuth } from '../store/auth';

const STORAGE_KEY_TOKEN = '@orbion_push_token';
const STORAGE_KEY_PREFS = '@orbion_push_prefs';

// Configure foreground notification behavior for iOS & Android
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface PushStoreState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isPermissionGranted: boolean;
  isEnabled: boolean;
  showPreview: boolean;
  mutePushes: PushPreferences['mute_pushes'];
  muteUntil: string | null;
  isLoading: boolean;
}

type Listener = () => void;

class PushNotificationStore {
  private state: PushStoreState = {
    expoPushToken: null,
    notification: null,
    isPermissionGranted: false,
    isEnabled: true,
    showPreview: true,
    mutePushes: 'Off',
    muteUntil: null,
    isLoading: false,
  };

  private listeners = new Set<Listener>();
  private initializedLocal = false;
  private lastSyncedTokenUserId: string | null = null;

  constructor() {
    this.loadLocalPrefs();
  }

  private setState(partial: Partial<PushStoreState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l());
  }

  private async loadLocalPrefs() {
    if (this.initializedLocal) return;
    this.initializedLocal = true;
    try {
      const [savedToken, savedPrefsRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_TOKEN),
        AsyncStorage.getItem(STORAGE_KEY_PREFS),
      ]);
      const parsed = savedPrefsRaw ? JSON.parse(savedPrefsRaw) : {};
      const validMute = computeActiveMute(parsed?.mutePushes, parsed?.muteUntil);
      this.setState({
        expoPushToken: savedToken || null,
        isEnabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : true,
        showPreview: typeof parsed?.showPreview === 'boolean' ? parsed.showPreview : true,
        mutePushes: validMute.duration,
        muteUntil: validMute.until,
      });
    } catch {}
  }

  private async saveLocalPrefs() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_PREFS,
        JSON.stringify({
          enabled: this.state.isEnabled,
          showPreview: this.state.showPreview,
          mutePushes: this.state.mutePushes,
          muteUntil: this.state.muteUntil,
        })
      );
    } catch {}
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PushStoreState => this.state;

  setNotification(notification: Notifications.Notification | null) {
    this.setState({ notification });
  }

  async syncFromBackend(userId: string) {
    if (this.lastSyncedTokenUserId === userId) return;
    this.lastSyncedTokenUserId = userId;
    try {
      const prefs = await fetchUserPreferences();
      const validMute = computeActiveMute(
        prefs.mute_pushes_duration,
        prefs.mute_pushes_until || null
      );
      this.setState({
        isEnabled: typeof prefs.push_enabled === 'boolean' ? prefs.push_enabled : this.state.isEnabled,
        showPreview:
          typeof prefs.show_message_preview === 'boolean'
            ? prefs.show_message_preview
            : this.state.showPreview,
        mutePushes: validMute.duration,
        muteUntil: validMute.until,
        expoPushToken: prefs.expo_push_token || this.state.expoPushToken,
      });
      await this.saveLocalPrefs();

      if (this.state.isEnabled) {
        await this.registerForPushNotificationsAsync();
      }
    } catch {
      // Keep local cached preferences if offline
    }
  }

  resetSyncState() {
    this.lastSyncedTokenUserId = null;
  }

  private async setupAndroidChannel() {
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
  }

  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web' || !Device.isDevice) {
      return null;
    }

    try {
      await this.setupAndroidChannel();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

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
        this.setState({ isPermissionGranted: false });
        return null;
      }

      this.setState({ isPermissionGranted: true });

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId && !__DEV__) {
        console.warn('[Push] Missing extra.eas.projectId in app.json; standalone push registration may fail.');
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const token = tokenResponse.data;
      this.setState({ expoPushToken: token });
      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token).catch(() => {});

      await this.syncTokenWithBackend(token);

      return token;
    } catch (error) {
      console.warn('[Push] Push registration unavailable:', (error as any)?.message || error);
      return null;
    }
  }

  async syncTokenWithBackend(token: string): Promise<void> {
    if (!token || Platform.OS === 'web') return;
    const platform: PlatformType = Platform.OS === 'ios' ? 'ios' : 'android';
    const deviceName = Device.modelName || Device.deviceName || `${Platform.OS} device`;
    this.setState({ expoPushToken: token });
    await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token).catch(() => {});
    await registerPushToken({
      push_token: token,
      platform,
      device_name: deviceName,
    }).catch(() => {});
  }

  async unregisterDeviceToken(): Promise<void> {
    try {
      const storedToken =
        this.state.expoPushToken || (await AsyncStorage.getItem(STORAGE_KEY_TOKEN));
      if (storedToken) {
        await unregisterPushToken(storedToken).catch(() => {});
        await AsyncStorage.removeItem(STORAGE_KEY_TOKEN).catch(() => {});
      }
      this.setState({ expoPushToken: null });
    } catch {}
  }

  async togglePushNotifications(enable: boolean): Promise<boolean> {
    this.setState({ isLoading: true, isEnabled: enable });
    await this.saveLocalPrefs();
    try {
      if (enable) {
        await updatePushPreferences({ enabled: true }).catch(() => {});
        await this.registerForPushNotificationsAsync();
      } else {
        await this.unregisterDeviceToken();
        await updatePushPreferences({ enabled: false }).catch(() => {});
      }
      return true;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async setShowPreview(show: boolean): Promise<void> {
    this.setState({ showPreview: show });
    await this.saveLocalPrefs();
    await updatePushPreferences({ show_preview: show }).catch(() => {});
  }

  async setMuteDuration(duration: PushPreferences['mute_pushes']): Promise<void> {
    const until = computeMuteUntilIso(duration);
    this.setState({ mutePushes: duration, muteUntil: until });
    await this.saveLocalPrefs();
    await updatePushPreferences({
      mute_pushes: duration,
      mute_pushes_until: until,
    }).catch(() => {});
  }
}

function computeMuteUntilIso(duration: PushPreferences['mute_pushes']): string | null {
  if (duration === 'Off') return null;
  const hours = duration === '1h' ? 1 : duration === '8h' ? 8 : 24;
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

function computeActiveMute(
  duration?: PushPreferences['mute_pushes'],
  until?: string | null
): { duration: PushPreferences['mute_pushes']; until: string | null } {
  if (!duration || duration === 'Off' || !until) {
    return { duration: 'Off', until: null };
  }
  const ts = Date.parse(until);
  if (Number.isNaN(ts) || ts <= Date.now()) {
    return { duration: 'Off', until: null };
  }
  return { duration, until };
}

export const pushStore = new PushNotificationStore();

function navigateFromNotificationData(
  router: ReturnType<typeof useRouter>,
  data: PushNotificationData | undefined
) {
  if (!data) {
    router.push('/(tabs)/inbox' as any);
    return;
  }
  if (data.conversation_id) {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: String(data.conversation_id),
        ...(data.channel ? { channel: String(data.channel) } : {}),
      },
    } as any);
  } else if (data.route) {
    router.push(data.route as any);
  } else if (data.lead_id) {
    router.push(`/customer/${data.lead_id}` as any);
  } else {
    router.push('/(tabs)/inbox' as any);
  }
}

export function usePushNotificationListeners() {
  const router = useRouter();
  const auth = useAuth();
  const handledInitialRef = useRef<string | null>(null);

  useEffect(() => {
    if (auth.token && auth.user?.id) {
      pushStore.syncFromBackend(auth.user.id).catch(() => {});
    } else if (auth.isInitialized && !auth.token) {
      pushStore.resetSyncState();
    }
  }, [auth.isInitialized, auth.token, auth.user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const notifSub = Notifications.addNotificationReceivedListener((incoming) => {
      pushStore.setNotification(incoming);
    });

    const respSub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as PushNotificationData;
        navigateFromNotificationData(router, data);
      } catch (err) {
        console.error('[Push] Navigation error from notification tap:', err);
      }
    });

    const tokenSub = Notifications.addPushTokenListener(() => {
      if (auth.token && pushStore.getSnapshot().isEnabled) {
        pushStore.registerForPushNotificationsAsync().catch(() => {});
      }
    });

    let coldStartTimer: ReturnType<typeof setTimeout> | null = null;
    if (auth.isInitialized && auth.token) {
      Notifications.getLastNotificationResponseAsync()
        .then((lastResponse) => {
          if (!lastResponse) return;
          const id = lastResponse.notification.request.identifier;
          if (handledInitialRef.current === id) return;
          handledInitialRef.current = id;
          const data = lastResponse.notification.request.content.data as PushNotificationData;
          coldStartTimer = setTimeout(() => {
            navigateFromNotificationData(router, data);
          }, 150);
        })
        .catch(() => {});
    }

    return () => {
      notifSub.remove();
      respSub.remove();
      tokenSub.remove();
      if (coldStartTimer) {
        clearTimeout(coldStartTimer);
      }
    };
  }, [auth.isInitialized, auth.token, router]);
}

export function usePushNotifications() {
  const state = useSyncExternalStore(
    pushStore.subscribe,
    pushStore.getSnapshot,
    pushStore.getSnapshot
  );

  return {
    ...state,
    registerForPushNotificationsAsync: () => pushStore.registerForPushNotificationsAsync(),
    unregisterDeviceToken: () => pushStore.unregisterDeviceToken(),
    togglePushNotifications: (enable: boolean) => pushStore.togglePushNotifications(enable),
    setShowPreview: (show: boolean) => pushStore.setShowPreview(show),
    setMuteDuration: (duration: PushPreferences['mute_pushes']) =>
      pushStore.setMuteDuration(duration),
  };
}

import { apiClient } from './client';
import { PushTokenRegistrationPayload, PushPreferences } from '../types/notifications';

export interface BackendUserPreferences {
  push_enabled?: boolean;
  show_message_preview?: boolean;
  mute_pushes_duration?: 'Off' | '1h' | '8h' | '24h';
  mute_pushes_until?: string | null;
  expo_push_token?: string | null;
  push_platform?: string | null;
  push_device_name?: string | null;
  biometric_lock?: boolean;
  [key: string]: any;
}

export async function fetchUserPreferences(): Promise<BackendUserPreferences> {
  return apiClient.get<BackendUserPreferences>('/users/me/preferences');
}

export async function updateUserPreferences(
  updates: Partial<BackendUserPreferences>
): Promise<BackendUserPreferences> {
  return apiClient.patch<BackendUserPreferences>('/users/me/preferences', updates);
}

export async function registerPushToken(
  payload: PushTokenRegistrationPayload
): Promise<{ status: string }> {
  await updateUserPreferences({
    expo_push_token: payload.push_token,
    push_platform: payload.platform,
    push_device_name: payload.device_name || null,
    push_enabled: true,
  });
  return { status: 'registered' };
}

export async function unregisterPushToken(_pushToken: string): Promise<void> {
  await updateUserPreferences({
    expo_push_token: null,
  });
}

export async function updatePushPreferences(
  preferences: Partial<PushPreferences> & { mute_pushes_until?: string | null }
): Promise<{ status: string; preferences: PushPreferences }> {
  const payload: Partial<BackendUserPreferences> = {};
  if (typeof preferences.enabled === 'boolean') {
    payload.push_enabled = preferences.enabled;
  }
  if (typeof preferences.show_preview === 'boolean') {
    payload.show_message_preview = preferences.show_preview;
  }
  if (preferences.mute_pushes !== undefined) {
    payload.mute_pushes_duration = preferences.mute_pushes;
  }
  if (preferences.mute_pushes_until !== undefined) {
    payload.mute_pushes_until = preferences.mute_pushes_until;
  }

  const saved = await updateUserPreferences(payload);
  return {
    status: 'updated',
    preferences: {
      enabled: saved.push_enabled ?? preferences.enabled ?? true,
      show_preview: saved.show_message_preview ?? preferences.show_preview ?? true,
      mute_pushes:
        (saved.mute_pushes_duration as PushPreferences['mute_pushes']) ||
        preferences.mute_pushes ||
        'Off',
    },
  };
}

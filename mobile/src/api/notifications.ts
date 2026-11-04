import { apiClient } from './client';
import { PushTokenRegistrationPayload, PushPreferences } from '../types/notifications';

export async function registerPushToken(
  payload: PushTokenRegistrationPayload
): Promise<{ status: string; message: string }> {
  return apiClient.post<{ status: string; message: string }>(
    '/notifications/push-token',
    payload
  );
}

export async function unregisterPushToken(
  push_token: string
): Promise<{ status: string; message: string }> {
  return apiClient.delete<{ status: string; message: string }>(
    '/notifications/push-token',
    { params: { push_token } }
  );
}

export async function updatePushPreferences(
  preferences: Partial<PushPreferences>
): Promise<{ status: string; preferences: PushPreferences }> {
  return apiClient.patch<{ status: string; preferences: PushPreferences }>(
    '/notifications/preferences/push',
    preferences
  );
}

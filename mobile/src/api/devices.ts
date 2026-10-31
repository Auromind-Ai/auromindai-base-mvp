import { apiClient } from './client';

export interface UserSessionItem {
  id: string;
  device_info: string;
  ip_address: string;
  location?: string | null;
  is_blocked: boolean;
  created_at: string;
  last_activity_at: string;
  is_current: boolean;
}

export async function fetchUserSessions(): Promise<UserSessionItem[]> {
  return apiClient.get<UserSessionItem[]>('/user/sessions');
}

export async function revokeSession(sessionId: string): Promise<{ status: string; message: string }> {
  return apiClient.delete<{ status: string; message: string }>(`/user/sessions/${sessionId}`);
}

export async function revokeDeviceSessions(deviceInfo: string): Promise<{ status: string; message: string }> {
  return apiClient.post<{ status: string; message: string }>('/user/sessions/revoke-device', {
    device_info: deviceInfo,
  });
}

export async function revokeOtherSessions(): Promise<{ status: string; message: string }> {
  return apiClient.post<{ status: string; message: string }>('/user/sessions/revoke-others', {});
}

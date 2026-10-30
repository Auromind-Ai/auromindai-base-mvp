import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/**
 * Resolves the backend base URL dynamically depending on the execution platform:
 * - Environment variable EXPO_PUBLIC_API_URL if configured
 * - Metro bundler dev server IP when running via Expo (physical device or emulator)
 * - Android Emulator: http://10.0.2.2:8000
 * - iOS Simulator / Web / Local: http://localhost:8000
 */
export function getApiBaseUrl(): string {
  // Web platform check: if opened in web browser (localhost or local IP)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
  }

  // When running on physical device or Expo Go, extract host IP dynamically from Metro bundler
  // - On WiFi: host is PC's current LAN IP (e.g. 192.168.0.5)
  // - On USB (adb reverse): host is localhost / 127.0.0.1
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // When running on Android emulator (not physical device), 10.0.2.2 points to host machine
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:8000';
  }

  // Fallback for physical device via USB adb reverse, iOS simulator, or local
  return 'http://localhost:8000';
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class MobileApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  get baseURL(): string {
    return getApiBaseUrl();
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...restOptions } = options;

    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.baseURL}${formattedEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...restOptions,
        headers: {
          ...defaultHeaders,
          ...(headers as Record<string, string>),
        },
      });
    } catch (fetchErr: any) {
      console.warn(`[MobileApiClient] Network request failed for ${url}:`, fetchErr?.message || fetchErr);
      throw fetchErr;
    }

    const text = await response.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.detail ||
        (Array.isArray(data?.errors) && data.errors[0]?.message) ||
        `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data as T;
  }

  get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new MobileApiClient();

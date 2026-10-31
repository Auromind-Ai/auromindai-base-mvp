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
  // 1. Web platform check: if opened in web browser
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    return 'http://' + hostname + ':8000';
  }

  // 2. Explicit environment variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 3. Android emulator ALWAYS connects to host machine via 10.0.2.2 or localhost
  // (WSL/Hyper-V virtual switch IPs like 172.x.x.x fail to route from emulator)
  if (Platform.OS === 'android' && !Device.isDevice) {
    return 'http://10.0.2.2:8000';
  }

  // 4. Physical device via Metro bundler host IP (e.g. LAN 192.168.x.x)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && !host.startsWith('172.')) {
      return 'http://' + host + ':8000';
    }
  }

  // 5. Fallback for physical device via USB adb reverse, iOS simulator, or local
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
      try {
        const parts = this.token.split('.');
        if (parts.length === 3) {
          const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const base64 = base64Url.padEnd(base64Url.length + (4 - (base64Url.length % 4)) % 4, '=');
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
          let str = base64.replace(/=+$/, '');
          let output = '';
          for (
            let bc = 0, bs = 0, buffer = 0, idx = 0;
            idx < str.length;
            idx++
          ) {
            buffer = chars.indexOf(str.charAt(idx));
            if (~buffer) {
              bs = bc % 4 ? bs * 64 + buffer : buffer;
              if (bc++ % 4) {
                output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
              }
            }
          }
          const parsed = JSON.parse(output);
          if (parsed && typeof parsed.csrf_token === 'string') {
            defaultHeaders['x-csrf-token'] = parsed.csrf_token;
          }
        }
      } catch {}
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

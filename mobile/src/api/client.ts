import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

export function getApiBaseUrl(): string {
  // 1. Web platform check: if opened in web browser during local dev, use current host on port 8000
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return `${protocol}//${hostname}:8000`;
    }
    return window.location.origin;
  }

  // 2. Explicit environment variable override (highest priority for device staging/production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 3. Android emulator ALWAYS connects to host machine via 10.0.2.2
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
      return `http://${host}:8000`;
    }
  }

  // 5. Fallback for physical device via USB adb reverse, iOS simulator, or local
  return 'http://localhost:8000';
}

export function getWsBaseUrl(): string {
  const apiBase = getApiBaseUrl();
  if (apiBase.startsWith('https://')) {
    return `wss://${apiBase.slice('https://'.length)}`;
  }
  if (apiBase.startsWith('http://')) {
    return `ws://${apiBase.slice('http://'.length)}`;
  }
  return apiBase;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export interface UploadedFileResponse {
  id: string;
  url: string;
  filename: string;
  file_size: number;
  file_type: string;
  mime_type: string;
}

function parseCsrfFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const base64 = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), '=');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const str = base64.replace(/=+$/, '');
    let output = '';
    for (let bc = 0, bs = 0, buffer = 0, idx = 0; idx < str.length; idx++) {
      buffer = chars.indexOf(str.charAt(idx));
      if (~buffer) {
        bs = bc % 4 ? bs * 64 + buffer : buffer;
        if (bc++ % 4) {
          output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
      }
    }
    const parsed = JSON.parse(output);
    return typeof parsed?.csrf_token === 'string' ? parsed.csrf_token : null;
  } catch {
    return null;
  }
}

class MobileApiClient {
  private token: string | null = null;
  private unauthorizedHandler: (() => void) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  setUnauthorizedHandler(handler: (() => void) | null) {
    this.unauthorizedHandler = handler;
  }

  get baseURL(): string {
    return getApiBaseUrl();
  }

  private buildAuthHeaders(isMultipart: boolean, extraHeaders?: HeadersInit): Record<string, string> {
    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
    };
    if (!isMultipart) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
      const csrfToken = parseCsrfFromJwt(this.token);
      if (csrfToken) {
        defaultHeaders['x-csrf-token'] = csrfToken;
      }
    }
    return {
      ...defaultHeaders,
      ...(extraHeaders as Record<string, string>),
    };
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

    const isMultipart = typeof FormData !== 'undefined' && restOptions.body instanceof FormData;
    const timeoutMs = isMultipart ? 45000 : 15000;

    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      response = await fetch(url, {
        ...restOptions,
        signal: controller.signal,
        headers: this.buildAuthHeaders(isMultipart, headers),
      });
    } catch (fetchErr: any) {
      if (fetchErr?.name === 'AbortError') {
        throw new Error('Connection timed out. Please check if backend is running.');
      }
      console.warn(`[MobileApiClient] Network request failed for ${url}:`, fetchErr?.message || fetchErr);
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    const text = await response.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      if (
        response.status === 401 &&
        this.token &&
        !formattedEndpoint.startsWith('/auth/send-otp') &&
        !formattedEndpoint.startsWith('/auth/verify-otp') &&
        !formattedEndpoint.startsWith('/auth/login') &&
        !formattedEndpoint.startsWith('/auth/logout') &&
        !formattedEndpoint.startsWith('/2fa/')
      ) {
        this.unauthorizedHandler?.();
      }

      let errorMessage = `Request failed with status ${response.status}`;
      if (typeof data?.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        errorMessage = data.detail
          .map((d: any) => d?.msg || JSON.stringify(d))
          .filter(Boolean)
          .join(', ');
      } else if (typeof data?.message === 'string' && data.message) {
        errorMessage = data.message;
      } else if (Array.isArray(data?.errors) && data.errors[0]?.message) {
        errorMessage = data.errors[0].message;
      }

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

  async uploadFile(
    file: { uri: string; name?: string; mimeType?: string },
    workspaceId?: string
  ): Promise<UploadedFileResponse> {
    const formData = new FormData();
    const fallbackName = file.uri.split('/').pop() || 'upload.jpg';
    const fileName = file.name || fallbackName;
    const lowerName = fileName.toLowerCase();
    const inferredMime =
      file.mimeType ||
      (lowerName.endsWith('.png')
        ? 'image/png'
        : lowerName.endsWith('.webp')
          ? 'image/webp'
          : lowerName.endsWith('.mp4')
            ? 'video/mp4'
            : lowerName.endsWith('.pdf')
              ? 'application/pdf'
              : 'image/jpeg');

    if (Platform.OS === 'web') {
      const blobResp = await fetch(file.uri);
      const blob = await blobResp.blob();
      formData.append('file', blob, fileName);
    } else {
      formData.append('file', {
        uri: file.uri,
        name: fileName,
        type: inferredMime,
      } as any);
    }

    return this.request<UploadedFileResponse>('/upload', {
      method: 'POST',
      params: workspaceId ? { workspace_id: workspaceId } : undefined,
      body: formData,
    });
  }
}

export const apiClient = new MobileApiClient();

import { apiClient } from './client';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export interface VerifyOTPResponse {
  access_token: string;
  token_type: string;
  csrf_token?: string;
  requiresTwoFactor?: boolean;
  pending_token?: string;
  user: {
    id: string;
    email: string;
    full_name?: string | null;
    platform_role?: string;
    deletion_scheduled_at?: string | null;
  };
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
    plan_type?: string;
  }>;
}

/**
 * Sends a 6-digit OTP code to the specified email address using the backend /auth/send-otp endpoint.
 */
export async function sendOTP(
  email: string,
  authType: 'login' | 'signup' = 'login',
  turnstileToken = '1x00000000000000000000AA'
): Promise<{ status: string; message: string }> {
  return apiClient.post<{ status: string; message: string }>('/auth/send-otp', {
    email: email.trim().toLowerCase(),
    auth_type: authType,
    turnstile_token: turnstileToken,
  });
}

/**
 * Verifies the 6-digit OTP code using the backend /auth/verify-otp endpoint.
 */
export async function verifyOTP(
  email: string,
  otp: string,
  authType: 'login' | 'signup' = 'login',
  turnstileToken = '1x00000000000000000000AA'
): Promise<VerifyOTPResponse> {
  const result = await apiClient.post<VerifyOTPResponse>('/auth/verify-otp', {
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
    auth_type: authType,
    turnstile_token: turnstileToken,
  });

  if (result.access_token) {
    apiClient.setToken(result.access_token);
  }

  return result;
}

/**
 * Initiates the Google OAuth login flow using the backend /auth/google/login endpoint.
 */
export async function googleLogin(): Promise<void> {
  const loginUrl = `${apiClient.baseURL}/auth/google/login?type=login`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.href = loginUrl;
    }
  } else {
    try {
      const redirectUrl = Linking.createURL('oauth-callback');
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUrl);
      if (result.type === 'success' && result.url) {
        // Deep link returned with token parameter
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token;
        if (typeof token === 'string') {
          apiClient.setToken(token);
        }
      }
    } catch {
      // Fallback to opening external system browser
      await Linking.openURL(loginUrl);
    }
  }
}

/**
 * Retrieves the currently authenticated user's profile and active workspace.
 */
export async function getCurrentUser() {
  return apiClient.get('/auth/me');
}

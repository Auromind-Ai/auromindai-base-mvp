export type PlatformType = 'android' | 'ios' | 'web';

export interface PushTokenRegistrationPayload {
  push_token: string;
  platform: PlatformType;
  device_name?: string;
  device_id?: string;
}

export interface PushNotificationData {
  route?: string;
  type?: string;
  conversation_id?: string;
  lead_id?: string;
  title?: string;
  body?: string;
  [key: string]: any;
}

export interface PushPreferences {
  enabled: boolean;
  show_preview: boolean;
  mute_pushes: 'Off' | '1h' | '8h' | '24h';
}

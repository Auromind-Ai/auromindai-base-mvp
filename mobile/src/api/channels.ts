import { apiClient } from './client';

export interface ChannelStatusItem {
  connected: boolean;
  phone?: string | null;
  username?: string | null;
  phone_number_id?: string | null;
  waba_id?: string | null;
  account_sid?: string | null;
}

export interface WorkspaceChannelsStatus {
  whatsapp?: ChannelStatusItem;
  instagram?: ChannelStatusItem;
  twilio?: ChannelStatusItem;
}

export async function fetchChannelsStatus(workspaceId: string): Promise<WorkspaceChannelsStatus> {
  return apiClient.get<WorkspaceChannelsStatus>(`/channels/status?workspace_id=${encodeURIComponent(workspaceId)}`);
}

export async function disconnectChannel(
  workspaceId: string,
  channelType: 'whatsapp' | 'instagram' | 'twilio'
): Promise<{ status: string; message: string }> {
  return apiClient.delete<{ status: string; message: string }>(
    `/channels/disconnect/${channelType}?workspace_id=${encodeURIComponent(workspaceId)}`
  );
}


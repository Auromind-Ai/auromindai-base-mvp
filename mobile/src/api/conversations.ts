import { apiClient } from './client';

export interface BackendConversation {
  id: string;
  phone?: string | null;
  contact_name?: string | null;
  channel: 'whatsapp' | 'instagram' | 'twilio' | 'email' | 'web' | string;
  profile_pic?: string | null;
  status: 'OPEN' | 'CLOSED' | 'SNOOZED' | 'CONVERTED' | 'FOLLOW_UP' | string;
  unread_count?: number;
  message_count?: number;
  last_message?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
}

export interface ConversationCounts {
  all: number;
  open: number;
  follow_up: number;
  unread: number;
  converted: number;
  closed: number;
}

export interface BackendMessage {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'user' | 'bot' | 'agent' | 'system' | string;
  status?: string;
  timestamp: string;
  is_read?: boolean;
  media_url?: string | null;
  media_type?: string | null;
  metadata?: Record<string, any> | null;
}

export interface CustomerProfileData {
  id: string;
  name: string;
  phone: string;
  channel: string;
  system_tier: 'Cold' | 'Warm' | 'Hot' | string;
  score: number;
  labels: string[];
  first_contact: string;
  last_contact: string;
  total_messages: number;
  status: string;
  is_converted: boolean;
}

export interface FetchConversationsParams {
  workspaceId: string;
  channel?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export async function fetchConversations(params: FetchConversationsParams): Promise<BackendConversation[]> {
  const query = new URLSearchParams();
  if (params.workspaceId && !params.workspaceId.startsWith('ws-')) {
    query.append('workspace_id', params.workspaceId);
  }
  if (params.channel && params.channel !== 'all') {
    query.append('channel', params.channel.toUpperCase());
  }
  if (params.status && params.status !== 'all') {
    query.append('status', params.status.toUpperCase());
  } else {
    query.append('status', 'ALL');
  }
  if (params.skip !== undefined) {
    query.append('skip', String(params.skip));
  }
  if (params.limit !== undefined) {
    query.append('limit', String(params.limit));
  }

  const qs = query.toString();
  return apiClient.get<BackendConversation[]>(`/conversations${qs ? '?' + qs : ''}`);
}

export async function fetchConversationCounts(params: {
  workspaceId: string;
  channel?: string;
}): Promise<ConversationCounts> {
  const query = new URLSearchParams();
  if (params.workspaceId && !params.workspaceId.startsWith('ws-')) {
    query.append('workspace_id', params.workspaceId);
  }
  if (params.channel && params.channel !== 'all') {
    query.append('channel', params.channel.toUpperCase());
  }
  const qs = query.toString();
  return apiClient.get<ConversationCounts>(`/conversations/counts${qs ? '?' + qs : ''}`);
}

export async function fetchMessages(
  conversationId: string,
  params?: { skip?: number; limit?: number }
): Promise<BackendMessage[]> {
  const query = new URLSearchParams();
  if (params?.skip !== undefined) query.append('skip', String(params.skip));
  if (params?.limit !== undefined) query.append('limit', String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<BackendMessage[]>(`/messages/${encodeURIComponent(conversationId)}${qs}`);
}

export async function sendReply(payload: {
  conversation_id: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<any> {
  return apiClient.post('/send-reply', payload);
}

export async function markConversationRead(conversationId: string): Promise<any> {
  return apiClient.post(`/conversations/${encodeURIComponent(conversationId)}/read`, {});
}

export async function convertConversation(
  conversationId: string,
  payload: { amount: number; product: string; notes?: string }
): Promise<any> {
  return apiClient.post(`/conversations/${encodeURIComponent(conversationId)}/convert`, payload);
}

export async function closeConversation(conversationId: string): Promise<any> {
  return apiClient.post(`/conversations/${encodeURIComponent(conversationId)}/close`, {});
}

export async function fetchCustomerProfile(conversationId: string): Promise<CustomerProfileData> {
  return apiClient.get<CustomerProfileData>(
    `/conversations/${encodeURIComponent(conversationId)}/customer-profile`
  );
}

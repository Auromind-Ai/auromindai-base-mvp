import { apiClient } from './client';

export interface BackendConversation {
  id: string;
  workspace_id?: string;
  channel?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  external_id?: string | null;
  profile_pic?: string | null;
  status?: string | null;
  unread_count?: number;
  message_count?: number;
  last_message?: string | null;
  last_message_text?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
}

export interface ConversationCountsResponse {
  all: number;
  open: number;
  unread: number;
  follow_up?: number;
  converted?: number;
  closed?: number;
}

export interface BackendMessage {
  id: string;
  conversation_id?: string;
  sender_type?: string;
  content?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  is_read?: boolean;
  status?: string;
  media_url?: string | null;
  media_type?: string | null;
  mime_type?: string | null;
  filename?: string | null;
  file_name?: string | null;
  metadata?: Record<string, any> | null;
  [key: string]: any;
}

export interface CustomerProfileData {
  id: string;
  name?: string | null;
  phone?: string | null;
  channel?: string | null;
  system_tier?: string | null;
  score?: number;
  labels?: string[];
  first_contact?: string | null;
  last_contact?: string | null;
  total_messages?: number;
  status?: string | null;
  is_converted?: boolean;
  [key: string]: any;
}

export interface FetchConversationsParams {
  workspaceId: string;
  channel?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export interface FetchConversationCountsParams {
  workspaceId: string;
  channel?: string;
}

export interface SendReplyPayload {
  conversation_id: string;
  message: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface ConvertConversationPayload {
  amount: number;
  product: string;
  notes?: string;
}

export async function fetchConversations(
  params: FetchConversationsParams
): Promise<BackendConversation[]> {
  return apiClient.get<BackendConversation[]>('/conversations', {
    params: {
      workspace_id: params.workspaceId,
      channel: params.channel,
      status: params.status,
      skip: params.skip,
      limit: params.limit,
    },
  });
}

export async function fetchConversationCounts(
  params: FetchConversationCountsParams
): Promise<ConversationCountsResponse> {
  return apiClient.get<ConversationCountsResponse>('/conversations/counts', {
    params: {
      workspace_id: params.workspaceId,
      channel: params.channel,
    },
  });
}

export async function fetchMessages(
  conversationId: string,
  params?: {
    skip?: number;
    limit?: number;
    before_timestamp?: string;
    before_id?: string;
  }
): Promise<BackendMessage[]> {
  return apiClient.get<BackendMessage[]>(
    `/messages/${encodeURIComponent(conversationId)}`,
    { params }
  );
}

export async function sendReply(payload: SendReplyPayload): Promise<any> {
  return apiClient.post('/send-reply', payload);
}

export async function markConversationRead(
  conversationId: string
): Promise<{ status: string; conversation_id: string }> {
  return apiClient.post<{ status: string; conversation_id: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/read`,
    {}
  );
}

export async function closeConversation(
  conversationId: string
): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/close`,
    {}
  );
}

export async function fetchCustomerProfile(
  conversationId: string
): Promise<CustomerProfileData> {
  return apiClient.get<CustomerProfileData>(
    `/conversations/${encodeURIComponent(conversationId)}/customer-profile`
  );
}

export async function convertConversation(
  conversationId: string,
  payload: ConvertConversationPayload
): Promise<{ status: string; conversation_status: string; lead_id: string }> {
  return apiClient.post<{ status: string; conversation_status: string; lead_id: string }>(
    `/conversations/${encodeURIComponent(conversationId)}/convert`,
    payload
  );
}

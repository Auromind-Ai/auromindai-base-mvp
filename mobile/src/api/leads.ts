import { apiClient } from './client';

export interface CreateManualLeadPayload {
  name: string;
  phone: string;
  source?: string;
  status?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  note?: string | null;
}

export interface ManualLeadResponse {
  lead_id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  score?: number;
  lead_tier?: string;
  created_at?: string;
  conversation_id?: string;
  [key: string]: any;
}

export interface LeadItemResponse {
  id?: string;
  lead_id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  channel?: string | null;
  status: string;
  score?: number;
  lead_tier?: string;
  created_at?: string;
  last_message_at?: string;
  conversation_id?: string | null;
  [key: string]: any;
}

export interface FetchLeadsResponse {
  items: LeadItemResponse[];
  leads?: LeadItemResponse[];
  total: number;
}

export async function createManualLead(
  workspaceId: string,
  payload: CreateManualLeadPayload
): Promise<ManualLeadResponse> {
  return apiClient.post<ManualLeadResponse>(
    `/lead-scoring/leads/manual?workspace_id=${encodeURIComponent(workspaceId)}`,
    payload
  );
}

export async function fetchLeads(
  workspaceId: string,
  status?: string
): Promise<FetchLeadsResponse> {
  const query = new URLSearchParams();
  query.append('workspace_id', workspaceId);
  if (status && status !== 'All') {
    query.append('status', status.toLowerCase());
  }
  const res = await apiClient.get<{ items?: LeadItemResponse[]; leads?: LeadItemResponse[]; total?: number }>(
    `/lead-scoring/leads?${query.toString()}`
  );
  const items = Array.isArray(res?.items)
    ? res.items
    : Array.isArray(res?.leads)
      ? res.leads
      : [];
  return {
    items,
    leads: items,
    total: typeof res?.total === 'number' ? res.total : items.length,
  };
}

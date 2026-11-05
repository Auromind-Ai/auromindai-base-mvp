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

/**
 * Creates a lead manually via the lead-scoring backend endpoint.
 */
export async function createManualLead(
  workspaceId: string,
  payload: CreateManualLeadPayload
): Promise<ManualLeadResponse> {
  return apiClient.post<ManualLeadResponse>(
    `/lead-scoring/leads/manual?workspace_id=${encodeURIComponent(workspaceId)}`,
    payload
  );
}

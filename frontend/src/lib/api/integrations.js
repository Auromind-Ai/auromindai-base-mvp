import client from './client';
import { getWorkspaceIdFromToken } from '@/lib/auth';

function getActiveWorkspaceId(overrideId) {
  if (overrideId && overrideId !== 'null' && overrideId !== 'undefined') return overrideId;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('workspace_id');
    if (saved && saved !== 'null' && saved !== 'undefined') return saved;
  }
  return getWorkspaceIdFromToken();
}

export async function getIntegrationStatus(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  const query = ws ? `?workspace_id=${encodeURIComponent(ws)}` : '';
  return client.get(`/integrations/status${query}`);
}

export async function connectGoogleAuth(backendId, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  const query = ws ? `?workspace_id=${encodeURIComponent(ws)}` : '';
  return client.get(`/integrations/google/auth/${backendId}${query}`);
}

export async function disconnectGoogleIntegration(backendId, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  const query = ws ? `?workspace_id=${encodeURIComponent(ws)}` : '';
  return client.delete(`/integrations/disconnect/google_${backendId}${query}`);
}

export async function getFlows(workspaceId) {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.get(`/api/automation/flows${query}`);
}

export async function getFlowById(flow_id, workspaceId) {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.get(`/api/automation/flows/${flow_id}${query}`);
}

export async function saveFlow(flowData, workspaceId) {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.post(`/api/automation/flows${query}`, flowData);
}

export async function deleteFlow(flow_id, workspaceId) {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.delete(`/api/automation/flows/${flow_id}${query}`);
}

export async function updateFlowStatus(flow_id, status, workspaceId) {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.patch(`/api/automation/flows/${flow_id}/status${query}`, { status });
}

export async function generateAIFlow(prompt, workspaceId) {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.post(`/api/automation/generate-flow${query}`, { prompt });
}

export async function approveAutomation(decisionId, workspaceId) {
  const query = workspaceId ? `&workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.post(`/automation/approve?decision_id=${decisionId}${query}`);
}

export async function rejectAutomation(decisionId, workspaceId) {
  const query = workspaceId ? `&workspace_id=${encodeURIComponent(workspaceId)}` : '';
  return client.post(`/automation/reject?decision_id=${decisionId}${query}`);
}

export async function getEmailInbox(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  const query = ws ? `?workspace_id=${encodeURIComponent(ws)}` : '';
  return client.get(`/email/inbox${query}`);
}

export async function sendEmailReply(payload) {
  const ws = getActiveWorkspaceId(payload?.workspace_id);
  return client.post('/email/send-reply', { ...payload, ...(ws ? { workspace_id: ws } : {}) });
}

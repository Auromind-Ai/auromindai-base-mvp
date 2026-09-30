import client from './client';

export async function getIntegrationStatus() {
  return client.get('/integrations/status');
}

export async function connectGoogleAuth(backendId) {
  return client.get(`/integrations/google/auth/${backendId}`);
}

export async function disconnectGoogleIntegration(backendId) {
  return client.delete(`/integrations/disconnect/google_${backendId}`);
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

export async function getEmailInbox() {
  return client.get('/email/inbox');
}

export async function sendEmailReply(payload) {
  return client.post('/email/send-reply', payload);
}

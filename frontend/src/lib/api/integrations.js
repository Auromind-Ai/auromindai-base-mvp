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

export async function getFlows() {
  return client.get('/api/automation/flows');
}

export async function getFlowById(flow_id) {
  return client.get(`/api/automation/flows/${flow_id}`);
}

export async function saveFlow(flowData) {
  return client.post('/api/automation/flows', flowData);
}

export async function deleteFlow(flow_id) {
  return client.delete(`/api/automation/flows/${flow_id}`);
}

export async function updateFlowStatus(flow_id, status) {
  return client.patch(`/api/automation/flows/${flow_id}/status`, { status });
}

export async function generateAIFlow(prompt) {
  return client.post('/api/automation/generate-flow', { prompt });
}

export async function approveAutomation(decisionId) {
  return client.post(`/automation/approve?decision_id=${decisionId}`);
}

export async function rejectAutomation(decisionId) {
  return client.post(`/automation/reject?decision_id=${decisionId}`);
}

export async function getEmailInbox() {
  return client.get('/email/inbox');
}

export async function sendEmailReply(payload) {
  return client.post('/email/send-reply', payload);
}

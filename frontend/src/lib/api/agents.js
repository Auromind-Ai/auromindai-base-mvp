import client from './client';
import { getActiveWorkspaceId } from './channels';

export async function getAgents(workspaceId, params = {}) {
  const ws = getActiveWorkspaceId(workspaceId);
  const query = new URLSearchParams({ workspace_id: ws || '', ...params }).toString();
  return client.get(`/api/agents?${query}`);
}

export async function getAgent(agentId, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.get(`/api/agents/${agentId}?workspace_id=${encodeURIComponent(ws || '')}`);
}

export async function createAgent(payload, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.post(`/api/agents?workspace_id=${encodeURIComponent(ws || '')}`, payload);
}

export async function updateAgent(agentId, payload, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.put(`/api/agents/${agentId}?workspace_id=${encodeURIComponent(ws || '')}`, payload);
}

export async function deleteAgent(agentId, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.delete(`/api/agents/${agentId}?workspace_id=${encodeURIComponent(ws || '')}`);
}

export async function toggleAgentStatus(agentId, status, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.patch(`/api/agents/${agentId}/status?workspace_id=${encodeURIComponent(ws || '')}`, { status });
}

export async function getAgentDraft(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.get(`/api/agents/draft?workspace_id=${encodeURIComponent(ws || '')}`);
}

export async function saveAgentDraft(draftData, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.post(`/api/agents/draft?workspace_id=${encodeURIComponent(ws || '')}`, draftData);
}

export async function clearAgentDraft(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.delete(`/api/agents/draft?workspace_id=${encodeURIComponent(ws || '')}`);
}

export async function getSupportedModels(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.get(`/api/agents/meta/models?workspace_id=${encodeURIComponent(ws || '')}`);
}

export async function getAgentChannelsStatus(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.get(`/api/agents/meta/channels?workspace_id=${encodeURIComponent(ws || '')}`);
}

export async function testAgentChat(payload, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.post(`/api/agents/test-chat?workspace_id=${encodeURIComponent(ws || '')}`, payload);
}

export async function validateUserApiKey(payload, workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.post(`/api/agents/meta/validate-key?workspace_id=${encodeURIComponent(ws || '')}`, payload);
}

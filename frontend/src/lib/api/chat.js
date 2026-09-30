import client from './client';
import { getWorkspace } from '../auth';

function requireWorkspace(workspaceId) {
  const selected = workspaceId ?? getWorkspace()?.id;
  if (!selected || ['', 'null', 'undefined'].includes(String(selected).trim())) {
    throw new Error('Select a workspace before using AI chat.');
  }
  return selected;
}

export async function getChatSessions(workspace_id) {
  const wsId = requireWorkspace(workspace_id);
  const query = wsId ? `?workspace_id=${encodeURIComponent(wsId)}` : '';
  return client.get(`/chat/sessions${query}`);
}

export async function createChatSession(title, workspace_id) {
  const wsId = requireWorkspace(workspace_id);
  return client.post('/chat/sessions', { title, workspace_id: wsId });
}

export async function getSessionMessages(session_id, workspace_id) {
  const wsId = requireWorkspace(workspace_id);
  const query = wsId ? `?workspace_id=${encodeURIComponent(wsId)}` : '';
  return client.get(`/chat/sessions/${session_id}/messages${query}`);
}

export async function deleteChatSession(session_id, workspace_id) {
  const wsId = requireWorkspace(workspace_id);
  const query = wsId ? `?workspace_id=${encodeURIComponent(wsId)}` : '';
  return client.delete(`/chat/sessions/${session_id}${query}`);
}

export async function updateChatSession(session_id, title, workspace_id) {
  const wsId = requireWorkspace(workspace_id);
  return client.patch(`/chat/sessions/${session_id}`, { title, workspace_id: wsId });
}

// Streaming chat endpoint returning raw response
export async function streamChat(body, signal = null) {
  const wsId = requireWorkspace(body.workspace_id);
  const payload = {
    ...body,
    ...(wsId ? { workspace_id: wsId } : {})
  };
  return client.requestRaw('/chat/stream', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal
  });
}

export async function getChatModels(workspace_id) {
  const wsId = requireWorkspace(workspace_id);
  const query = wsId ? `?workspace_id=${encodeURIComponent(wsId)}` : '';
  return client.get(`/chat/models${query}`);
}

export async function submitFeedback(body) {
  const wsId = requireWorkspace(body.workspace_id);
  return client.post('/feedback', { ...body, ...(wsId ? { workspace_id: wsId } : {}) });
}

export async function stopChat(sessionId = null, workspace_id = null) {
  const wsId = requireWorkspace(workspace_id);
  return client.requestRaw('/chat/stop', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, ...(wsId ? { workspace_id: wsId } : {}) })
  });
}

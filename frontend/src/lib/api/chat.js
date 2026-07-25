import client from './client';

export async function getChatSessions(workspace_id) {
  return client.get('/chat/sessions');
}

export async function createChatSession(title, workspace_id) {
  return client.post('/chat/sessions', { title, workspace_id });
}

export async function getSessionMessages(session_id) {
  return client.get(`/chat/sessions/${session_id}/messages`);
}

export async function deleteChatSession(session_id) {
  return client.delete(`/chat/sessions/${session_id}`);
}

export async function updateChatSession(session_id, title) {
  return client.patch(`/chat/sessions/${session_id}`, { title });
}

// Streaming chat endpoint returning raw response
export async function streamChat(body, signal = null) {
  return client.requestRaw('/chat/stream', {
    method: 'POST',
    body: JSON.stringify(body),
    signal
  });
}

export async function getChatModels() {
  return client.get('/chat/models');
}

export async function submitFeedback(body) {
  return client.post('/feedback', body);
}

export async function stopChat(sessionId = null) {
  return client.requestRaw('/chat/stop', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId })
  });
}

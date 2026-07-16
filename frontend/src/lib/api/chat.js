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
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const url = `${client.baseURL}/chat/stream`;

  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const url = `${client.baseURL}/chat/stop`;
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ session_id: sessionId }),
  });
}

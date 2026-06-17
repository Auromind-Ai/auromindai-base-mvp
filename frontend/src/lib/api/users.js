import client from './client';

export async function getPreferences() {
  return client.get('/api/users/me/preferences');
}

export async function updatePreferences(data) {
  return client.patch('/api/users/me/preferences', data);
}

export async function getSessions() {
  return client.get('/api/user/sessions');
}

export async function revokeSession(sessionId) {
  return client.delete(`/api/user/sessions/${sessionId}`);
}

export async function blockSession(sessionId) {
  return client.post(`/api/user/sessions/${sessionId}/block`);
}

export async function getSecuritySummary() {
  return client.get('/api/user/security-summary');
}

export async function unblockSession(sessionId) {
  return client.post(`/api/user/sessions/${sessionId}/unblock`);
}

export async function getNotifications(skip = 0, limit = 50) {
  return client.get(`/api/notifications?skip=${skip}&limit=${limit}`);
}

export async function markNotificationRead(id) {
  return client.patch(`/api/notifications/${id}/read`, {});
}

export async function markAllNotificationsRead() {
  return client.post('/api/notifications/read-all', {});
}

export async function getPublicAnnouncement() {
  return client.get('/public/announcement');
}

export async function getSystemHealth() {
  return client.get('/admin/system-health');
}

export async function stopImpersonation() {
  try {
    return await client.post('/auth/stop-impersonation');
  } catch (err) {
    console.warn("stopImpersonation failed on backend, continuing...", err);
    return { status: "fallback" };
  }
}

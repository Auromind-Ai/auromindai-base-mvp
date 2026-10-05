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

export async function getCalendarStatus(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  const query = ws ? `?workspace_id=${encodeURIComponent(ws)}` : '';
  return client.get(`/calendar/status${query}`);
}

export async function getCalendarEvents(params = {}) {
  const ws = getActiveWorkspaceId(params.workspace_id);
  const cleanParams = { ...params };
  if (ws) cleanParams.workspace_id = ws;
  return client.get('/calendar/events', { params: cleanParams });
}

export async function getCalendarAvailability(params = {}) {
  const ws = getActiveWorkspaceId(params.workspace_id);
  const cleanParams = { ...params };
  if (ws) cleanParams.workspace_id = ws;
  return client.get('/calendar/availability', { params: cleanParams });
}

export async function createCalendarEvent(data, params = {}) {
  const ws = getActiveWorkspaceId(params.workspace_id || data?.workspace_id);
  const cleanParams = { ...params };
  if (ws) cleanParams.workspace_id = ws;
  return client.post('/calendar/events', data, { params: cleanParams });
}

export async function rescheduleCalendarEvent(eventId, data, params = {}) {
  const ws = getActiveWorkspaceId(params.workspace_id || data?.workspace_id);
  const cleanParams = { ...params };
  if (ws) cleanParams.workspace_id = ws;
  return client.put(`/calendar/events/${eventId}/reschedule`, data, { params: cleanParams });
}

export async function cancelCalendarEvent(eventId, params = {}) {
  const ws = getActiveWorkspaceId(params.workspace_id);
  const cleanParams = { ...params };
  if (ws) cleanParams.workspace_id = ws;
  return client.delete(`/calendar/events/${eventId}`, { params: cleanParams });
}

import client from './client';

export async function getCalendarStatus() {
  return client.get('/calendar/status');
}

export async function getCalendarEvents(params = {}) {
  return client.get('/calendar/events', { params });
}

export async function getCalendarAvailability(params = {}) {
  return client.get('/calendar/availability', { params });
}

export async function createCalendarEvent(data, params = {}) {
  return client.post('/calendar/events', data, { params });
}

export async function rescheduleCalendarEvent(eventId, data, params = {}) {
  return client.put(`/calendar/events/${eventId}/reschedule`, data, { params });
}

export async function cancelCalendarEvent(eventId, params = {}) {
  return client.delete(`/calendar/events/${eventId}`, { params });
}

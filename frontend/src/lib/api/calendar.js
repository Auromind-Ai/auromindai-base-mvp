import client from './client';

export async function getCalendarStatus() {
  return client.get('/integrations/status');
}

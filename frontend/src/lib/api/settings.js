import client from './client';

export async function getPlatformSettings() {
  return client.get('/admin/settings');
}

export async function updatePlatformSettings(payload) {
  return client.post('/admin/settings', payload);
}

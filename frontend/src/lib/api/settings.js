import client from './client';

export async function getPlatformSettings() {
  return client.get('/admin/settings');
}

export async function updatePlatformSettings(payload) {
  return client.post('/admin/settings', payload);
}

export async function testConnection(service, payload) {
  return client.post(`/admin/settings/test/${service}`, payload);
}
export async function getPublicBranding() {
  return client.get('/public/branding');
}

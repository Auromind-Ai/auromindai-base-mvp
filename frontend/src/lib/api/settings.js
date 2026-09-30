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
  try {
    return await client.get('/public/branding');
  } catch (err) {
    return {
      app_name: 'Orbion Agents',
      app_logo_url: '/logo.png',
    };
  }
}

export async function getAboutSettings() {
  try {
    return await client.get('/public/about');
  } catch (err) {
    return {
      platform_version: 'v2.4.1',
      release_date: 'June 05, 2026',
      copyright: '@2026 Orbion Agents',
      last_updated: 'June 05, 2026, 10:30 AM',
    };
  }
}

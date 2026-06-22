import client from './client';

export async function getPlatformAnalytics() {
  return client.get('/admin/analytics');
}

export async function getPlatformRAG() {
  return client.get('/admin/rag');
}

export async function getPlatformRAGAnalytics(range) {
  return client.get(`/admin/rag_analytics?range=${range}`);
}

export async function getPlatformRAGStats() {
  return client.get('/admin/stats');
}

export async function getPlatformRAGFailures(tool) {
  return client.get(`/admin/failures/${tool}`);
}

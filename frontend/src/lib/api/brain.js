import client from './client';

export async function uploadDocument(file, workspace_id, collection = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspace_id);
  if (collection) formData.append('collection', collection);

  return client.post('/brain/ingest/document', formData);
}

export async function uploadSalesDocument(file, workspace_id) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspace_id);

  return client.post('/brain/ingest/sales_document', formData);
}

export async function uploadSupportDocument(file, workspace_id) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', workspace_id);

  return client.post('/brain/ingest/support_document', formData);
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  return client.post('/upload', formData);
}

export async function syncURL(url, workspace_id) {
  return client.post('/brain/ingest/url', { url, workspace_id });
}

export async function crawlWebsite(url, workspace_id, max_pages = 50) {
  return client.post('/brain/ingest/website', { url, max_pages, workspace_id });
}

export async function addTextKnowledge(title, content, workspace_id) {
  return client.post('/brain/ingest/text', { title, content, workspace_id });
}

export async function getBrainEntries() {
  return client.get('/brain/entries');
}

export async function deleteBrainEntry(entry_id, workspace_id) {
  return client.delete(`/brain/entries/${entry_id}`);
}

export async function searchBrain(query, workspace_id, top_k = 5) {
  return client.post('/brain/search', { query, top_k, workspace_id });
}

export async function queryBrain(question, workspace_id, top_k = 5, include_sources = true) {
  return client.post('/brain/query', { question, top_k, include_sources, workspace_id });
}

export async function getBrainStats(workspace_id) {
  return client.get('/brain/stats');
}

export async function getIngestStatus(entryId) {
  return client.get(`/brain/ingest/status/${entryId}`);
}

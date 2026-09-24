import client from './client';

export async function getTemplatesStatus(workspace_id) {
  return client.get(`/api/templates/status/${workspace_id}`);
}

export async function getTemplates() {
  return client.get('/api/templates');
}

export async function uploadTemplateMedia(templateId, formData) {
  return client.post(`/api/templates/${templateId}/media`, formData);
}


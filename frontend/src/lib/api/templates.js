import client from './client';
import { getWorkspaceIdFromToken } from '@/lib/auth';

export async function getTemplatesStatus(workspace_id) {
  return client.get(`/api/templates/status/${workspace_id}`);
}

export async function getTemplates(workspaceId = getWorkspaceIdFromToken()) {
  return client.get(`/api/templates${workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : ""}`);
}

export async function uploadTemplateMedia(templateId, formData) {
  return client.post(`/api/templates/${templateId}/media`, formData);
}


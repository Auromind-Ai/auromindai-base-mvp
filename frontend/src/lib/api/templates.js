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

export async function getTemplatesStatus(workspace_id) {
  const ws = getActiveWorkspaceId(workspace_id);
  return client.get(`/api/templates/status/${ws}`);
}

export async function getTemplates(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.get(`/api/templates${ws ? `?workspace_id=${encodeURIComponent(ws)}` : ""}`);
}

export async function uploadTemplateMedia(templateId, formData) {
  return client.post(`/api/templates/${templateId}/media`, formData);
}

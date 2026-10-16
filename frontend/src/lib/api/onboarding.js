import client from './client';
import { getWorkspaceIdFromToken } from '@/lib/auth';

export function getActiveWorkspaceId(overrideId) {
  if (overrideId && overrideId !== 'null' && overrideId !== 'undefined') return overrideId;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('workspace_id');
    if (saved && saved !== 'null' && saved !== 'undefined') return saved;
  }
  return getWorkspaceIdFromToken();
}

export async function getOnboardingStatus(workspaceId) {
  const ws = getActiveWorkspaceId(workspaceId);
  const query = ws ? `?workspace_id=${encodeURIComponent(ws)}` : '';
  return client.get(`/api/workspace/onboarding${query}`);
}

export async function dismissOnboarding(workspaceId, dismissed = true) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.post('/api/workspace/onboarding/dismiss', { workspace_id: ws, dismissed });
}

export async function check2FAStatus(workspaceId, manualConfirm = false) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.post('/api/workspace/onboarding/check-2fa', { workspace_id: ws, manual_confirm: manualConfirm });
}

export async function checkBusinessVerificationStatus(workspaceId, manualStatus = null) {
  const ws = getActiveWorkspaceId(workspaceId);
  return client.post('/api/workspace/onboarding/check-business-verification', {
    workspace_id: ws,
    manual_status: manualStatus,
  });
}

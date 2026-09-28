import client from './client';

export async function getWorkspaceMembers(workspaceId) {
  return client.get(`/api/workspaces/${workspaceId}/members`);
}

export async function getMyWorkspacePermissions(workspaceId) {
  return client.get(`/api/workspaces/${workspaceId}/my-permissions`);
}

export async function inviteWorkspaceMember(workspaceId, { name, email, role = 'member', permissions = {} }) {
  return client.post(`/api/workspaces/${workspaceId}/invitations`, { name, email, role, permissions });
}

export async function resendWorkspaceInvitation(workspaceId, invitationId) {
  return client.post(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`, {});
}

export async function cancelWorkspaceInvitation(workspaceId, invitationId) {
  return client.delete(`/api/workspaces/${workspaceId}/invitations/${invitationId}`);
}

export async function updateWorkspaceMember(workspaceId, memberId, data) {
  return client.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, data);
}

export async function updateWorkspaceMemberRole(workspaceId, memberId, role) {
  return client.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, { role });
}

export async function removeWorkspaceMember(workspaceId, memberId) {
  return client.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
}

export async function getInvitationDetails(token) {
  return client.get(`/api/invitations/details/${encodeURIComponent(token)}`);
}

export async function acceptInvitation(token) {
  return client.post(`/api/invitations/accept`, { token });
}

import client from './client';

export async function getPlatformDashboard() {
  return client.get('/admin/dashboard');
}

export async function getPlatformUsers() {
  return client.get('/admin/users');
}

export async function getAdminTokens() {
  return client.get('/admin/tokens');
}

export async function updateTokenLimit(workspace_id, custom_token_limit) {
  return client.patch(`/admin/tokens/${workspace_id}/limit`, { custom_token_limit });
}

export async function getAdminLogs() {
  return client.get('/admin/logs');
}

export async function getPlatformConversations() {
  return client.get('/admin/conversations');
}

export async function getAdminWorkspaces() {
  return client.get('/admin/workspaces');
}

export async function editWorkspacePlan(workspace_id, plan_type) {
  return client.patch(`/admin/workspaces/${workspace_id}`, { plan_type });
}

export async function resetWorkspaceLimits(workspace_id) {
  return client.post(`/admin/workspaces/${workspace_id}/reset-limits`);
}

export async function toggleWorkspaceStatus(workspace_id) {
  return client.post(`/admin/workspaces/${workspace_id}/toggle-status`);
}

export async function getAIActivity() {
  return client.get('/admin/ai_actions');
}

export async function getAIGovernance() {
  return client.get('/admin/ai-governance');
}

export async function getAILearning() {
  return client.get('/admin/learning-events');
}

export async function getAIConfig() {
  return client.get('/admin/ai-config');
}

export async function saveAIConfig(config) {
  return client.put('/admin/ai-config', config);
}

export async function getModelConfigs() {
  return client.get('/admin/model-configs/');
}

export async function createModelConfig(config) {
  return client.post('/admin/model-configs/', config);
}

export async function deleteModelConfig(id) {
  return client.delete(`/admin/model-configs/${id}`);
}

export async function updateModelConfig(id, config) {
  return client.put(`/admin/model-configs/${id}`, config);
}

export async function toggleModelConfig(id) {
  return client.patch(`/admin/model-configs/${id}/toggle`);
}

export async function seedModelConfigs() {
  return client.post('/admin/model-configs/seed');
}

export async function getProviderModels(provider) {
  return client.get(`/admin/model-configs/providers/${provider}/models`);
}

export async function adminAuth(password) {
  return client.post('/admin/auth', { password });
}

export async function adminLogout() {
  return client.post('/admin/logout');
}

export async function switchUser(userId) {
  return client.post(`/admin/switch-user/${userId}`);
}

export async function switchUserSession(sessionId) {
  return client.get(`/admin/switch-user/session/${sessionId}`);
}

export async function getPlatformIntegrations() {
  return client.get('/admin/integrations');
}

export async function getSystemHealth(options = {}) {
  return client.get('/admin/system-health', options);
}

export async function getNotificationTemplates(params = {}) {
  return client.get('/admin/notification-templates', { params });
}

export async function createNotificationTemplate(data) {
  return client.post('/admin/notification-templates', data);
}

export async function updateNotificationTemplate(id, data) {
  return client.put(`/admin/notification-templates/${id}`, data);
}

export async function toggleNotificationTemplate(id) {
  return client.patch(`/admin/notification-templates/${id}/toggle`);
}

export async function deleteNotificationTemplate(id) {
  return client.delete(`/admin/notification-templates/${id}`);
}

export async function testRenderNotificationTemplate(data) {
  return client.post('/admin/notification-templates/test-render', data);
}

export async function seedDefaultNotificationTemplates() {
  return client.post('/admin/notification-templates/seed-defaults');
}


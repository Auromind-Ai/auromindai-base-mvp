import client from './client';

export async function getChannelsStatus(workspace_id) {
  return client.get(`/api/channels/status?workspace_id=${workspace_id}`);
}

export async function connectWhatsApp(payload) {
  return client.post('/api/whatsapp/connect', payload);
}

export async function connectInstagram(payload) {
  return client.post('/api/instagram/connect', payload);
}

export async function connectTwilio(payload) {
  return client.post('/twilio/connect', payload);
}

export async function disconnectChannel(channelId, workspace_id) {
  return client.delete(`/api/channels/disconnect/${channelId}?workspace_id=${workspace_id}`);
}

export async function evaluateAction(actionData) {
  return client.post('/mcp/evaluate', actionData);
}

export async function getAIActions(workspace_id, decision = null) {
  const query = decision ? `?decision=${decision}` : '';
  return client.get(`/mcp/actions?workspace_id=${workspace_id}${query}`);
}

export async function overrideDecision(action_id, approved) {
  return client.post('/mcp/override', { action_id, approved });
}

export async function getMCPRules(workspace_id) {
  return client.get(`/mcp/rules?workspace_id=${workspace_id}`);
}

export async function updateLeadLabels(leadId, label, action) {
  try {
    const newLabels = action === "add" ? [label] : [];
    return await client.post(`/lead-scoring/leads/${leadId}/labels`, { labels: newLabels });
  } catch (err) {
    return await client.post(`/lead-scoring/leads/${leadId}/labels`, { labels: action === "add" ? [label] : [] });
  }
}

export async function getLeadByConversation(conversationId) {
  try {
    const data = await client.get('/api/lead-scoring/leads?limit=100&offset=0');
    const items = data.items || data || [];
    const match = items.find(l => l.conversation_id === conversationId);
    return match || null;
  } catch {
    return null;
  }
}

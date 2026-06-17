import client from './client';

export async function getPricing() {
  return client.get('/public/pricing');
}

export async function getBillingStatus(workspace_id) {
  return client.get('/billing/status');
}

export async function getBillingPlan(workspace_id, options = {}) {
  return client.get('/billing/plan', options);
}

export async function getBillingUsage(workspace_id, options = {}) {
  return client.get('/billing/usage', options);
}

export async function getCreditSummary(workspace_id, options = {}) {
  return client.get(`/billing/credits/summary?workspace_id=${workspace_id}`, options);
}

export async function getCreditHistory(workspace_id, page = 1, options = {}) {
  return client.get(`/billing/credits/history?workspace_id=${workspace_id}&page=${page}`, options);
}

export async function createBillingSubscription(workspace_id, plan, provider = 'razorpay', options = {}) {
  return client.post('/billing/create-subscription', {
    workspace_id,
    plan,
    provider,
  }, options);
}

export async function verifyBillingPayment(payload, options = {}) {
  return client.post('/billing/verify-payment', payload, options);
}

export async function getPlatformBilling() {
  return client.get('/admin/billing');
}

export async function getPlatformPayments() {
  return client.get('/admin/payments');
}

export async function createPlatformPayment(payload) {
  return client.post('/admin/payments', payload);
}

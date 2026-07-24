import client from './client';

export async function getPricing() {
  return client.get('/public/pricing');
}

export async function getBillingStatus(workspace_id) {
  return client.get('/billing/status', {
    headers: { 'X-Workspace-Id': workspace_id }
  });
}

export async function getBillingPlan(workspace_id, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get('/billing/plan', { ...options, headers });
}

export async function getBillingUsage(workspace_id, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get('/billing/usage', { ...options, headers });
}

export async function getCreditSummary(workspace_id, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get(`/billing/credits/summary?workspace_id=${workspace_id}`, { ...options, headers });
}

export async function getCreditHistory(workspace_id, page = 1, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get(`/billing/credits/history?workspace_id=${workspace_id}&page=${page}`, { ...options, headers });
}

export async function initiateCreditPackPurchase(workspace_id, pack_id, provider = 'razorpay', options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.post('/billing/credits/purchase', {
    workspace_id,
    pack_id,
    provider,
  }, { ...options, headers });
}

export async function verifyCreditPackPayment(payload, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': payload.workspace_id };
  return client.post('/billing/credits/verify', payload, { ...options, headers });
}

export async function getCreditPacks(workspace_id, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get(`/billing/credits/packs?workspace_id=${workspace_id}`, { ...options, headers });
}

export async function getDailyCreditUsage(workspace_id, days = 30, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get(`/billing/credits/daily-usage?workspace_id=${workspace_id}&days=${days}`, { ...options, headers });
}

export async function getWorkspaceEntitlements(workspace_id, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get(`/billing/entitlements?workspace_id=${workspace_id}`, { ...options, headers });
}

export async function createBillingSubscription(workspace_id, plan, provider = 'razorpay', options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.post('/billing/create-subscription', {
    workspace_id,
    plan,
    provider,
  }, { ...options, headers });
}

export async function verifyBillingPayment(payload, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': payload.workspace_id };
  return client.post('/billing/verify-payment', payload, { ...options, headers });
}

export async function getPlatformBilling() {
  return client.get('/admin/billing');
}

export async function searchWorkspaces(query) {
  return client.post('/admin/billing/workspaces/search', { query });
}

export async function getWorkspaceBillingDetail(workspaceId) {
  return client.get(`/admin/billing/workspaces/${workspaceId}`);
}

export async function adjustCredits(workspaceId, payload) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/adjust-credits`, payload);
}

export async function adjustWallet(workspaceId, payload) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/adjust-wallet`, payload);
}

export async function overrideSubscription(workspaceId, payload) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/override-subscription`, payload);
}

export async function resetCredits(workspaceId) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/reset-credits`);
}

export async function resetWallet(workspaceId) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/reset-wallet`);
}

export async function getAdminAuditLogs(page = 1, limit = 50) {
  return client.get(`/admin/billing/audit-logs?page=${page}&limit=${limit}`);
}

export async function getAdminTransactions(page = 1, limit = 50) {
  return client.get(`/admin/billing/transactions?page=${page}&limit=${limit}`);
}

export async function getGatewayHealth() {
  return client.get('/admin/billing/gateway-health');
}

export async function runBillingManualOperation(operation, payload) {
  return client.post(`/admin/billing/operations/${operation}`, payload);
}

export async function getPlatformPayments() {
  return client.get('/admin/payments');
}

export async function createPlatformPayment(payload) {
  return client.post('/admin/payments', payload);
}

export async function getWccBalance(workspace_id) {
  return client.get('/wallet/wcc/balance', {
    headers: { 'X-Workspace-Id': workspace_id }
  });
}

export async function getWccRates(workspace_id) {
  return client.get('/wallet/wcc/rates', {
    headers: { 'X-Workspace-Id': workspace_id }
  });
}

export async function estimateWccCampaign(workspace_id, audienceSize, category) {
  return client.post('/wallet/wcc/estimate', {
    workspace_id: workspace_id,
    audience_size: audienceSize,
    category: category,
  }, {
    headers: { 'X-Workspace-Id': workspace_id }
  });
}

export async function initiateWccRecharge(workspace_id, amount) {
  return client.post('/wallet/wcc/recharge/initiate', {
    workspace_id: workspace_id,
    amount: amount,
  }, {
    headers: { 'X-Workspace-Id': workspace_id }
  });
}

export async function verifyWccRecharge(payload, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': payload.workspace_id };
  return client.post('/wallet/wcc/recharge/verify', payload, { ...options, headers });
}

export async function getWccSessions(workspace_id, page = 1, limit = 10) {
  return client.get(`/wallet/wcc/sessions?page=${page}&limit=${limit}`, {
    headers: { 'X-Workspace-Id': workspace_id }
  });
}

// Admin Billing Operations & Diagnostics
export async function getWorkspaceLedger(workspaceId, page = 1, limit = 20) {
  return client.get(`/admin/billing/workspaces/${workspaceId}/ledger?page=${page}&limit=${limit}`);
}

export async function renewPlanCredits(workspaceId) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/renew-plan-credits`);
}

export async function expireCredits(workspaceId) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/expire-credits`);
}

export async function recalculateCredits(workspaceId) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/recalculate-credits`);
}

export async function getWccRechargeLogs(workspaceId) {
  return client.get(`/admin/billing/workspaces/${workspaceId}/wcc-recharge-logs`);
}

export async function getWccTransactions(workspaceId) {
  return client.get(`/admin/billing/workspaces/${workspaceId}/wcc-transactions`);
}

export async function recalculateWallet(workspaceId) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/recalculate-wallet`);
}

export async function verifyPaymentManually(paymentId, reason = '') {
  return client.post(`/admin/billing/operations/verify-payment-manually`, { payment_id: paymentId, reason });
}

export async function retryRecharge(rechargeLogId, reason = '') {
  return client.post(`/admin/billing/operations/retry-recharge`, { recharge_log_id: rechargeLogId, reason });
}

export async function retryCreditPurchase(paymentId, reason = '') {
  return client.post(`/admin/billing/operations/retry-credit-purchase`, { payment_id: paymentId, reason });
}

export async function getBillingDiagnostics() {
  return client.get(`/admin/billing/diagnostics`);
}

export async function runBillingRepair(issueType, workspaceId = null, metadata = {}) {
  return client.post(`/admin/billing/diagnostics/repair`, { issue_type: issueType, workspace_id: workspaceId, metadata });
}

export async function runManualProvisioning(workspaceId, action) {
  return client.post(`/admin/billing/workspaces/${workspaceId}/provision/${action}`);
}

export async function getCreditPacksAdmin() {
  return client.get(`/admin/billing/credit-packs`);
}

export async function createCreditPackAdmin(payload) {
  return client.post(`/admin/billing/credit-packs`, payload);
}

export async function updateCreditPackAdmin(id, payload) {
  return client.put(`/admin/billing/credit-packs/${id}`, payload);
}

export async function deleteCreditPackAdmin(id) {
  return client.delete(`/admin/billing/credit-packs/${id}`);
}

export async function getFlowPacksAdmin() {
  return client.get(`/admin/flow-packs`);
}

export async function createFlowPackAdmin(payload) {
  return client.post(`/admin/flow-packs`, payload);
}

export async function updateFlowPackAdmin(id, payload) {
  return client.patch(`/admin/flow-packs/${id}`, payload);
}

export async function deleteFlowPackAdmin(id) {
  return client.delete(`/admin/flow-packs/${id}`);
}

export async function getWccRateCardsAdmin() {
  return client.get(`/admin/billing/wcc/rate-cards`);
}

export async function updateWccRateCardAdmin(id, payload) {
  return client.put(`/admin/billing/wcc/rate-cards/${id}`, payload);
}

export async function getFeatureRulesAdmin() {
  return client.get('/admin/feature-rules');
}

export async function updateFeatureRuleAdmin(id, payload) {
  return client.put(`/admin/feature-rules/${id}`, payload);
}
export async function createFeatureRuleAdmin(payload) {
    return client.post("/admin/feature-rules", payload);
}

export async function getPlanEntitlementsAdmin() {
  return client.get('/admin/plan-entitlements');
}

export async function updatePlanEntitlementAdmin(planId, payload) {
  return client.put(`/admin/plan-entitlements/${planId}`, payload);
}

export async function getFlowPackOptions() {
  return client.get('/flow-packs/options');
}

export async function initiateFlowPackPurchase(workspace_id, pack_id, provider = 'razorpay', options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.post('/flow-packs/purchase/initiate', {
    workspace_id,
    pack_id,
    provider,
  }, { ...options, headers });
}

export async function verifyFlowPackPayment(payload, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': payload.workspace_id };
  return client.post('/flow-packs/purchase/verify', payload, { ...options, headers });
}

export async function getFlowQuota(workspace_id, options = {}) {
  const headers = { ...options.headers, 'X-Workspace-Id': workspace_id };
  return client.get(`/flow-packs/quota?workspace_id=${workspace_id}`, { ...options, headers });
}

let razorpayScriptPromise = null;

export function loadRazorpayScript(src = "https://checkout.razorpay.com/v1/checkout.js", timeoutMs = 15000) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay SDK cannot be loaded on the server side."));
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);

    let timer = null;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
    };

    timer = setTimeout(() => {
      razorpayScriptPromise = null;
      reject(new Error("Razorpay SDK script load timed out. Please check your network connection or AdBlocker settings."));
    }, timeoutMs);

    const onScriptLoad = () => {
      cleanup();
      if (window.Razorpay) {
        resolve(true);
      } else {
        razorpayScriptPromise = null;
        reject(new Error("Razorpay SDK script loaded, but window.Razorpay is unavailable."));
      }
    };

    const onScriptError = () => {
      cleanup();
      razorpayScriptPromise = null;
      reject(new Error("Failed to load Razorpay SDK. Please check your internet connection or disable Brave Shields / AdBlocker."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", onScriptLoad, { once: true });
      existingScript.addEventListener("error", onScriptError, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = onScriptLoad;
      script.onerror = onScriptError;
      document.body.appendChild(script);
    }
  });

  return razorpayScriptPromise;
}

export async function openRazorpayCheckout({
  orderData,
  name = "Auromind",
  description = "",
  prefill = {},
  handler,
  ondismiss
}) {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error("Razorpay SDK is unavailable.");
  }

  const options = {
    key: orderData.public_key,
    order_id: orderData.gateway_order_id,
    subscription_id: orderData.subscription_id,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    name,
    description,
    prefill,
    handler,
    modal: {
      ondismiss
    }
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
  return razorpay;
}




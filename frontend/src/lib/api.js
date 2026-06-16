console.log("API CLIENT VERSION: 1.1.21");
import { getToken, getWorkspaceIdFromToken, logout } from "@/lib/auth"

const API_BASE_URL = '/api';


class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}, isRetryAttempt = false) {
    const url = (endpoint.startsWith('/api/') || endpoint.startsWith('/backend/'))
      ? endpoint
      : `${this.baseURL}${endpoint}`;
    const isPostOrPut = options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH';
    const { signal: optSignal, ...restOptions } = options;
    const config = {
      ...restOptions,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(isPostOrPut ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    };

    // No manual Authorization header injection needed. Cookies are sent automatically.

    const controller = optSignal ? null : new AbortController();
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null; // 30s timeout
    config.signal = optSignal || controller?.signal;

    try {
      console.log(`Fetching: ${url}${isRetryAttempt ? ' (Retry Attempt)' : ''}`);
      const response = await fetch(url, config);
      if (timeoutId) clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
        let errorMessage = 'Request failed';
        if (data?.detail) {
            if (Array.isArray(data.detail)) {
                errorMessage = data.detail.map(err => `${err.loc[err.loc.length - 1]}: ${err.msg}`).join(', ');
            } else if (typeof data.detail === 'string') {
                errorMessage = data.detail;
            } else if (typeof data.detail === 'object') {
                if (Array.isArray(data.detail.errors)) {
                    errorMessage = data.detail.errors.join(', ');
                } else {
                    errorMessage = JSON.stringify(data.detail);
                }
            }
        } else {
            errorMessage = data?.message || data?.error?.message || 'Request failed';
        }

        const errorObj = new Error(errorMessage);
        errorObj.status = response.status;

        const isClientError = response.status >= 400 && response.status < 500;
        if (isClientError) {
            console.warn("CLIENT ERROR:", response.status, JSON.stringify(data, null, 2));
        } else {
            console.error("SERVER ERROR:", response.status, JSON.stringify(data, null, 2));
        }

        throw errorObj;
      }
        return data;
      } else {
        // For non-JSON success responses (e.g. 204 No Content), return empty
        if (response.ok) {
          return {};
        }
        const text = await response.text();
        console.error("Non-JSON response:", text);
        const errorObj = new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
        errorObj.status = response.status;
        throw errorObj;
      }

    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      // Suppress AbortError console noise from StrictMode double-invoke
      if (error.name === 'AbortError') {
        throw error; // re-throw silently
      }
      const isClientError = error?.status >= 400 && error?.status < 500;
      const isFetchNetworkError = (error instanceof TypeError || error?.name === 'TypeError') && error?.message?.toLowerCase().includes('fetch');

      // Attempt automatic retry once for network errors on safe/idempotent endpoints
      if (isFetchNetworkError && !isRetryAttempt) {
        const method = (options.method || 'GET').toUpperCase();
        const isOTPOrSensitive = endpoint.includes('/auth/verify-otp') || endpoint.includes('/auth/send-otp') || endpoint.includes('/billing/');
        const isIdempotent = method === 'GET' || method === 'PUT' || method === 'DELETE';
        const canRetry = isIdempotent && !isOTPOrSensitive;

        if (canRetry) {
          console.warn(`Fetch failed (likely cold-start/Strict dev double-invoke). Retrying once in 500ms... URL: ${url}`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return this.request(endpoint, options, true);
        }
      }

      if (isClientError || isFetchNetworkError) {
        const isExpectedAuthMeError = (error?.status === 401 || error?.status === 403) && endpoint.includes('/auth/me');
        if (!isExpectedAuthMeError) {
          console.warn('API Client/Network Error:', error, 'URL:', url);
        }
      } else {
        console.error('API Error:', error, 'URL:', url);
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch(endpoint, body) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async sendOTP(email, auth_type) {
    return this.post('/auth/send-otp', { email, auth_type });
  }

  async verifyOTP(email, otp, auth_type, full_name = null, workspace_name = null) {
    return this.post('/auth/verify-otp', {
      email,
      otp,
      auth_type,
      full_name,
      workspace_name
    });
  }

  async signup(email, password, full_name, workspace_name) {
    return this.post('/auth/signup', {
      email,
      password,
      full_name,
      workspace_name,
    });
  }

  // login = OTP அனுப்பு (step 1)
  async login(email) {
    return this.post('/auth/send-otp', { email });
  }

  googleLogin(type = 'login') {
    window.location.href = `${this.baseURL}/auth/google/login?type=${type}`;
  }

  async getCurrentUser(options = {}) {
    return this.get('/auth/me', options);
  }

  async getWorkspaces() {
    return this.get('/auth/workspaces');
  }

  // ============== OTP & Auth Methods ==============

  // OTP அனுப்பு (login-ஓட alias — நேரடியாவும் call பண்ணலாம்)
  async sendOTP(email, auth_type = 'login') {
    return this.post('/auth/send-otp', { email, auth_type });
  }

  // OTP verify + access token பெறு (step 2)
  async verifyOTP(email, otp, auth_type = 'login', full_name = null, workspace_name = null) {
    return this.post('/auth/verify-otp', { email, otp, auth_type, full_name, workspace_name });
  }

  googleLogin(auth_type = 'login') {
    window.location.href = `${this.baseURL}/auth/google/login?type=${auth_type}`;
  }

  // Refresh token cookie வழியா புதுசா access token பெறு
  async refreshToken() {
    return this.post('/auth/refresh', {});
  }

  // Logout — cookie clear
  async logout() {
    return this.post('/auth/logout', {});
  }

  // ============== Pricing Methods ==============

  async getPricing() {
    return this.get("/public/pricing");
  }

  // ============== Dashboard Methods ==============

  async getDashboardOverview(workspace_id, start_date = null, end_date = null, options = {}) {
    let url = `/dashboard/overview?workspace_id=${workspace_id}`;
    if (start_date) url += `&start_date=${start_date}`;
    if (end_date) url += `&end_date=${end_date}`;
    return this.get(url, options);
  }

  async getDashboardMetrics(workspace_id, options = {}) {
    return this.get(`/dashboard/metrics?workspace_id=${workspace_id}`, options);
  }

  async getDashboardRevenue(workspace_id, options = {}) {
    return this.get(`/dashboard/revenue?workspace_id=${workspace_id}`, options);
  }

  async getDashboardActivities(workspace_id, options = {}) {
    return this.get(`/dashboard/activities?workspace_id=${workspace_id}`, options);
  }

  async getDashboardInsights(workspace_id, options = {}) {
    return this.get(`/dashboard/insights?workspace_id=${workspace_id}`, options);
  }

  // ============== Billing Methods ==============

  async getBillingStatus(workspace_id) {
    return this.get('/billing/status');
  }

  async getBillingPlan(workspace_id, options = {}) {
    return this.get('/billing/plan', options);
  }

  async getBillingUsage(workspace_id, options = {}) {
    return this.get('/billing/usage', options);
  }

  async getCreditSummary(workspace_id, options = {}) {
    return this.get(`/billing/credits/summary?workspace_id=${workspace_id}`, options);
  }

  async getCreditHistory(workspace_id, page = 1, options = {}) {
    return this.get(`/billing/credits/history?workspace_id=${workspace_id}&page=${page}`, options);
  }

  async createBillingSubscription(workspace_id, plan, provider = "razorpay", options = {}) {
    return this.post('/billing/create-subscription', {
      workspace_id,
      plan,
      provider,
    }, options);
  }

  async getPlatformSettings() {
    return this.get('/api/admin/settings');
  }

  async verifyBillingPayment(payload, options = {}) {
    return this.post('/billing/verify-payment', payload, options);
  }

  // ============== Automation Methods ==============

  async getFlows() {
    return this.get('/api/automation/flows');
  }

  async getFlowById(flow_id) {
    return this.get(`/api/automation/flows/${flow_id}`);
  }

  async saveFlow(flowData) {
    return this.post('/api/automation/flows', flowData);
  }

  async deleteFlow(flow_id) {
    return this.delete(`/api/automation/flows/${flow_id}`);
  }

  async updateFlowStatus(flow_id, status) {
    return this.patch(`/api/automation/flows/${flow_id}/status`, { status });
  }

  async generateAIFlow(prompt) {
    return this.post('/api/automation/generate-flow', {
      prompt: prompt,
    });
  }

  // ============== MCP Methods ==============

  async evaluateAction(actionData) {
    return this.post('/mcp/evaluate', actionData);
  }

  async getAIActions(workspace_id, decision = null) {
    const query = decision ? `?decision=${decision}` : '';
    return this.get(`/mcp/actions?workspace_id=${workspace_id}${query}`);
  }

  async overrideDecision(action_id, approved) {
    return this.post('/mcp/override', { action_id, approved });
  }

  async getMCPRules(workspace_id) {
    return this.get(`/mcp/rules?workspace_id=${workspace_id}`);
  }

  // ============== Chat History Methods ==============

  async getChatSessions(workspace_id) {
    return this.get('/chat/sessions');
  }

  async createChatSession(title, workspace_id) {
    return this.post('/chat/sessions', { title, workspace_id });
  }

  async getSessionMessages(session_id) {
    return this.get(`/chat/sessions/${session_id}/messages`);
  }

  async deleteChatSession(session_id) {
    return this.delete(`/chat/sessions/${session_id}`);
  }

  async updateChatSession(session_id, title) {
    return this.request(`/chat/sessions/${session_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  // ============== Admin AI Activity ==============

  async getAIActivity() {
    return this.get('/api/admin/ai_actions');
  }

  // ============== Admin Token Methods ==============

  async getAdminTokens() {
    return this.get('/api/admin/tokens')
  }

  async updateTokenLimit(workspace_id, custom_token_limit) {
    return this.request(`/api/admin/tokens/${workspace_id}/limit`, {
      method: "PATCH",
      body: JSON.stringify({ custom_token_limit }),
    });
  }

  async getAdminLogs() {
    return this.get('/api/admin/logs')
  }

  // ==== Brain / RAG Methods ====
  /**
   * Upload a document to the Brain (PDF, DOCX, TXT)
   */
  async uploadDocument(file, workspace_id, collection = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspace_id);
    if (collection) formData.append('collection', collection);

    const token = typeof window !== 'undefined' ? getToken() : null;

    const response = await fetch(`${this.baseURL}/brain/ingest/document`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Upload failed');
    }
    return data;
  }

  async uploadSalesDocument(file, workspace_id) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/brain/ingest/sales_document`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Upload failed');
    }
    return data;
  }

  async uploadSupportDocument(file, workspace_id) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspace_id);

    const token = typeof window !== 'undefined' ? getToken() : null;

    const response = await fetch(`${this.baseURL}/brain/ingest/support_document`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Upload failed');
    }
    return data;
  }
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Upload failed');
    }
    return data;
  }

  // ============== Admin Workspace Methods ==============

  async getAdminWorkspaces() {
    return this.get('/api/admin/workspaces');
  }

  async editWorkspacePlan(workspace_id, plan_type) {
    return this.request(`/api/admin/workspaces/${workspace_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_type }),
    });
  }

  async resetWorkspaceLimits(workspace_id) {
    return this.post(`/api/admin/workspaces/${workspace_id}/reset-limits`);
  }

  async toggleWorkspaceStatus(workspace_id) {
    return this.post(`/api/admin/workspaces/${workspace_id}/toggle-status`);
  }

  
  async syncURL(url, workspace_id) {
    return this.post('/brain/ingest/url', { url });
  }

  async crawlWebsite(url, workspace_id, max_pages = 50) {
    return this.post('/brain/ingest/website', { url, max_pages });
  }

 
  async addTextKnowledge(title, content, workspace_id) {
    return this.post('/brain/ingest/text', { title, content });
  }


 
  async getBrainEntries() {
    return this.get('/brain/entries');
  }

  async deleteBrainEntry(entry_id, workspace_id) {
    return this.delete(`/brain/entries/${entry_id}`);
  }

  async searchBrain(query, workspace_id, top_k = 5) {
    return this.post('/brain/search', { query, top_k });
  }

  async queryBrain(question, workspace_id, top_k = 5, include_sources = true) {
    return this.post('/brain/query', { question, top_k, include_sources });
  }

  async getBrainStats(workspace_id) {
    return this.get('/brain/stats');
  }

  // ============== Dashboard Analytics Methods ==============

  /**
   * Full dashboard bundle — metrics + revenue + activities + insights
   * Single round-trip, cached 60s on backend.
   */
  async getDashboardOverview(workspace_id, startDate, endDate) {
    let url = '/dashboard/overview';
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    return this.get(params.size ? `${url}?${params.toString()}` : url);
  }

  /**
   * 4 KPI metric cards (revenue, leads, conversion, response time)
   */
  async getDashboardMetrics(workspace_id) {
    return this.get('/dashboard/metrics');
  }

  /**
   * Monthly revenue chart — current year vs prior year
   */
  async getDashboardRevenue(workspace_id) {
    return this.get('/dashboard/revenue');
  }

  /**
   * Recent 10 activity events across messages/leads/followups/ai_actions
   */
  async getDashboardActivities(workspace_id) {
    return this.get('/dashboard/activities');
  }

  /**
   * AI-computed insights from real DB aggregations
   */
  async getDashboardInsights(workspace_id) {
    return this.get('/dashboard/insights');
  }

  // Update lead labels and trigger score recalculation (CHANGE 1)
  async updateLeadLabels(leadId, label, action) {
    try {
      const leadDetail = await this.get(`/lead-scoring/leads/${leadId}/detail`);
      const currentLabels = leadDetail.labels || [];
      let newLabels = [...currentLabels];
      if (action === "add") {
        if (!newLabels.includes(label)) {
          newLabels.push(label);
        }
      } else if (action === "remove") {
        newLabels = newLabels.filter(l => l !== label);
      }
      return await this.post(`/lead-scoring/leads/${leadId}/labels`, { labels: newLabels });
    } catch (err) {
      // Fallback in case of failure or network issues
      return await this.post(`/lead-scoring/leads/${leadId}/labels`, { labels: [label] });
    }
  }

  // Get lead details by conversation ID
  async getLeadByConversation(conversationId) {
    try {
      const data = await this.get('/api/lead-scoring/leads?limit=100&offset=0');
      const items = data.items || data || [];
      const match = items.find(l => l.conversation_id === conversationId);
      return match || null;
    } catch {
      return null;
    }
  }

  // ==== User Preferences Methods ====

  async getPreferences() {
    return this.get('/api/users/me/preferences');
  }

  async updatePreferences(data) {
    return this.patch('/api/users/me/preferences', data);
  }

  // ==== Security & Sessions ====
  async getSessions() {
    return this.get('/api/user/sessions');
  }

  async revokeSession(sessionId) {
    return this.delete(`/api/user/sessions/${sessionId}`);
  }

  async blockSession(sessionId) {
    return this.post(`/api/user/sessions/${sessionId}/block`);
  }

  async getSecuritySummary() {
    return this.get('/api/user/security-summary');
  }

  async unblockSession(sessionId) {
    return this.post(`/api/user/sessions/${sessionId}/unblock`);
  }

  // ==== Notifications ====
  async getNotifications(skip = 0, limit = 50) {
    return this.get(`/api/notifications?skip=${skip}&limit=${limit}`);
  }

  async markNotificationRead(id) {
    return this.patch(`/api/notifications/${id}/read`, {});
  }

  async markAllNotificationsRead() {
    return this.post(`/api/notifications/read-all`, {});
  }
}

export const api = new APIClient();
export default api;
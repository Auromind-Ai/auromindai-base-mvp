console.log("API CLIENT VERSION: 1.1.21");

// Always use the backend URL directly. CORS is configured to allow it.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

console.log("Selected API_BASE_URL:", API_BASE_URL);

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    console.log("APIClient initialized with baseURL:", this.baseURL);
  }

  async request(endpoint, options = {}) {
    const url = (endpoint.startsWith('/api/') || endpoint.startsWith('/backend/'))
      ? endpoint
      : `${this.baseURL}${endpoint}`;
    const isPostOrPut = options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH';
    const { signal: optSignal, ...restOptions } = options;
    const config = {
      ...restOptions,
      credentials: 'include',
      headers: {
        ...(isPostOrPut ? { 'Content-Type': 'application/json' } : {}),
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
    };

    // No manual Authorization header injection needed. Cookies are sent automatically.

    const controller = optSignal ? null : new AbortController();
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null; // 30s timeout
    config.signal = optSignal || controller?.signal;

    try {
      console.log(`Fetching: ${url}`);
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

        // ← Only log if NOT 401
        if (response.status !== 401) {
            console.error("FULL ERROR:", JSON.stringify(data, null, 2));
        }

        throw errorObj;
    }
        return data;
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        const errorObj = new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
        errorObj.status = response.status;
        throw errorObj;
      }

    } catch (error) {
      // Suppress AbortError console noise from StrictMode double-invoke
      if (error.name === 'AbortError') {
        if (timeoutId) clearTimeout(timeoutId);
        throw error; // re-throw silently
      }
      if (error?.status !== 401) {
        console.error('API Error:', error, 'URL:', url);
      }
      if (timeoutId) clearTimeout(timeoutId);
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

  async login(email) {
    return this.post('/auth/login', { email });
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

  // Pricing methods
  async getPricing() {
    return this.get("/public/pricing")
  }
  // Billing methods
  async getBillingStatus(workspace_id) {
    return this.get('/billing/status');
  }

  async getBillingPlan(workspace_id, options = {}) {
    return this.get('/billing/plan', options);
  }

  async getBillingUsage(workspace_id, options = {}) {
    return this.get('/billing/usage', options);
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
// ==== Automation Methods ====



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
  // MCP methods
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

  // ==== Chat History Methods ====

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
      body: JSON.stringify({ title })
    });
  }
  //  Admin AI Activity 

  async getAIActivity() {
    return this.get('/api/admin/ai_actions');
  }

  //  Admin Token Methods 

  async getAdminTokens() {
    return this.get('/api/admin/tokens')
  }

  async updateTokenLimit(workspace_id, custom_token_limit) {
    return this.request(`/api/admin/tokens/${workspace_id}/limit`, {
      method: "PATCH",
      body: JSON.stringify({ custom_token_limit })
    })
  }

  async getAdminLogs() {
    return this.get('/api/admin/logs')
  }

  // ==== Brain / RAG Methods ====
  /**
   * Upload a document to the Brain (PDF, DOCX, TXT)
   */
  async uploadDocument(file, workspace_id) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/brain/ingest/document`, {
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


  //  Admin Workspace Methods 

  async getAdminWorkspaces() {
    return this.get('/api/admin/workspaces');
  }

  async editWorkspacePlan(workspace_id, plan_type) {
    return this.request(`/api/admin/workspaces/${workspace_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_type })
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

  /**
   * Delete a Brain entry
   */
  async deleteBrainEntry(entry_id, workspace_id) {
    return this.delete(`/brain/entries/${entry_id}`);
  }

  /**
   * Semantic search across the Brain
   */
  async searchBrain(query, workspace_id, top_k = 5) {
    return this.post('/brain/search', { query, top_k });
  }

  /**
   * Ask a question and get a RAG-powered answer
   */
  async queryBrain(question, workspace_id, top_k = 5, include_sources = true) {
    return this.post('/brain/query', { question, top_k, include_sources });
  }

  /**
   * Get Brain statistics
   */
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
}




export const api = new APIClient();
export default api;

console.log("API CLIENT VERSION: 1.1.21");
import { getToken, getWorkspaceIdFromToken } from "@/lib/auth"

// Always route through the Next.js same-origin proxy (/api/*) when running
// in the browser. This avoids all CORS issues — the browser only ever talks
// to the Next.js server (same origin), which forwards to the real backend.
// For SSR (Node.js), hit the backend directly via the env var.
const API_BASE_URL = typeof window !== 'undefined'
  ? '/api'                                        // browser  → same-origin proxy
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'); // SSR

console.log("Selected API_BASE_URL:", API_BASE_URL);

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    console.log("APIClient initialized with baseURL:", this.baseURL);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const isPostOrPut = options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH';
    const { signal: optSignal, ...restOptions } = options;
    const config = {
      ...restOptions,
      headers: {
        ...(isPostOrPut ? { 'Content-Type': 'application/json' } : {}),
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
    };

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const controller = options.signal ? null : new AbortController();
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null; // 30s timeout
    if (!config.signal && controller) {
      config.signal = controller.signal;
    }

    try {
      console.log(`Fetching: ${url}`);
      const response = await fetch(url, config);
      if (timeoutId) clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          console.error("FULL ERROR:", JSON.stringify(data, null, 2));
          
          let errorMessage = 'Request failed';
          
          if (data?.detail) {
            // Handle FastAPI's array of validation errors
            if (Array.isArray(data.detail)) {
              errorMessage = data.detail.map(err => `${err.loc[err.loc.length - 1]}: ${err.msg}`).join(', ');
            } else if (typeof data.detail === 'string') {
              // Handle standard FastAPI HTTPExceptions
              errorMessage = data.detail;
            }
          } else {
            errorMessage = data?.message || data?.error?.message || 'Request failed';
          }
          
          throw new Error(errorMessage);
        }
        return data;
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

    } catch (error) {
      console.error('API Error:', error, 'URL:', url);
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

  async getCurrentUser() {
    return this.get('/auth/me');
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
    return this.get(`/billing/status?workspace_id=${workspace_id}`);
  }

  async getBillingPlan(workspace_id, options = {}) {
    return this.get(`/billing/plan?workspace_id=${workspace_id}`, options);
  }

  async getBillingUsage(workspace_id, options = {}) {
    return this.get(`/billing/usage?workspace_id=${workspace_id}`, options);
  }

  async createBillingSubscription(workspace_id, plan, provider = "razorpay", options = {}) {
    return this.post('/billing/create-subscription', {
      workspace_id,
      plan,
      provider,
    }, options);
  }
  async getPlatformSettings() {
  return this.get("/admin/settings")
}
  async verifyBillingPayment(payload, options = {}) {
    return this.post('/billing/verify-payment', payload, options);
  }
// ============== Automation Methods ==============



  async getFlows() {
    const workspace_id = getWorkspaceIdFromToken();
    return this.get(`/automation/flows?workspace_id=${workspace_id}`);
  }

  async getFlowById(flow_id) {
    const workspace_id = getWorkspaceIdFromToken();
    return this.get(`/automation/flows/${flow_id}?workspace_id=${workspace_id}`);
  }

  async saveFlow(flowData) {
    const workspace_id = getWorkspaceIdFromToken();
    return this.post('/automation/flows', {
      ...flowData,
      workspace_id: workspace_id // Auto-inject the workspace ID here!
    });
  }

  async deleteFlow(flow_id) {
    const workspace_id = getWorkspaceIdFromToken();
    return this.delete(`/automation/flows/${flow_id}?workspace_id=${workspace_id}`);
  }

  async generateAIFlow(prompt) {
    const workspace_id = getWorkspaceIdFromToken();
    return this.post('/automation/generate-flow', { 
      prompt: prompt, 
      workspace_id: workspace_id 
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

  // ============== Chat History Methods ==============

  async getChatSessions(workspace_id) {
    return this.get(`/chat/sessions?workspace_id=${workspace_id}`);
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
  // ================= Admin AI Activity =================

  async getAIActivity() {
    return this.get("/admin/ai_actions");
  }

  // ================= Admin Token Methods =================

  async getAdminTokens() {
    return this.get("/admin/tokens")
  }

  async updateTokenLimit(workspace_id, custom_token_limit) {
    return this.request(`/admin/tokens/${workspace_id}/limit`, {
      method: "PATCH",
      body: JSON.stringify({ custom_token_limit })
    })
  }

  // ============== Brain / RAG Methods ==============
  /**
   * Upload a document to the Brain (PDF, DOCX, TXT)
   */
  async uploadDocument(file, workspace_id) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspace_id);

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
  async uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('workspace_id', getWorkspaceIdFromToken());

  const token = getToken();

  const response = await fetch(`${this.baseURL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Upload failed');
  }

  return data;
}


  // ================= Admin Workspace Methods =================

  async getAdminWorkspaces() {
    return this.get('/admin/workspaces');
  }

  async editWorkspacePlan(workspace_id, plan_type) {
    return this.request(`/admin/workspaces/${workspace_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_type })
    });
  }

  async resetWorkspaceLimits(workspace_id) {
    return this.post(`/admin/workspaces/${workspace_id}/reset-limits`);
  }

  async toggleWorkspaceStatus(workspace_id) {
    return this.post(`/admin/workspaces/${workspace_id}/toggle-status`);
  }

  /**
   * Sync a URL to the Brain
   */
  async syncURL(url, workspace_id) {
    return this.post('/brain/ingest/url', { url, workspace_id });
  }

  /**
   * Crawl entire website and index all pages
   */
  async crawlWebsite(url, workspace_id, max_pages = 50) {
    return this.post('/brain/ingest/website', { url, workspace_id, max_pages });
  }

  /**
   * Add manual text to the Brain
   */
  async addTextKnowledge(title, content, workspace_id) {
    return this.post('/brain/ingest/text', { title, content, workspace_id });
  }

  /**
   * Get all Brain entries for a workspace
   */
  async getBrainEntries() {

    const workspace_id = getWorkspaceIdFromToken()

    return this.get(`/brain/entries?workspace_id=${workspace_id}`);

  }

  /**
   * Delete a Brain entry
   */
  async deleteBrainEntry(entry_id, workspace_id) {
    return this.delete(`/brain/entries/${entry_id}?workspace_id=${workspace_id}`);
  }

  /**
   * Semantic search across the Brain
   */
  async searchBrain(query, workspace_id, top_k = 5) {
    return this.post('/brain/search', { query, workspace_id, top_k });
  }

  /**
   * Ask a question and get a RAG-powered answer
   */
  async queryBrain(question, workspace_id, top_k = 5, include_sources = true) {
    return this.post('/brain/query', { question, workspace_id, top_k, include_sources });
  }

  /**
   * Get Brain statistics
   */
  async getBrainStats(workspace_id) {
    return this.get(`/brain/stats?workspace_id=${workspace_id}`);
  }
}




export const api = new APIClient();
export default api;

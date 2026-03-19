console.log("API CLIENT VERSION: 1.1.20");
import { getWorkspaceIdFromToken } from "@/lib/auth"
const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
  (isLocal ? 'http://localhost:8000' : 'https://auromindai-base-mvp.onrender.com');

console.log("Hostname:", typeof window !== 'undefined' ? window.location.hostname : 'node');
console.log("Selected API_BASE_URL:", API_BASE_URL);

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    console.log("APIClient initialized with baseURL:", this.baseURL);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const isPostOrPut = options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH';
    
    const config = {
      ...options,
      headers: {
        ...(isPostOrPut ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    };

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    config.signal = controller.signal;

    try {
      console.log(`Fetching: ${url}`);
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Request failed');
        }
        return data;
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

    } catch (error) {
      console.error('API Error:', error, 'URL:', url);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
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

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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

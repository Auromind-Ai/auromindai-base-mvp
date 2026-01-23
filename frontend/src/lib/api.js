console.log("API CLIENT VERSION: 1.1.9");
const API_BASE_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
  ? 'https://auromindai-base-mvp.onrender.com'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
console.log("Hostname:", typeof window !== 'undefined' ? window.location.hostname : 'node');
console.log("Selected API_BASE_URL:", API_BASE_URL);

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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

    try {
      console.log(`Fetching: ${url}`);
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Request failed');
      }

      return data;
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
  async getBrainEntries(workspace_id) {
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

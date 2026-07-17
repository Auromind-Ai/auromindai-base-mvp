console.log("API INFRASTRUCTURE VERSION: 2.1.0");

// Timeout constants
const DEFAULT_TIMEOUT_MS = 30_000;   // 30s for regular API calls
const ADMIN_TIMEOUT_MS   = 15_000;   // 15s for admin panel calls
const STREAM_TIMEOUT_MS  = 120_000;  // 2min for streaming endpoints


function getCSRFToken() {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )admin_csrf_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  return window.sessionStorage?.getItem('admin_csrf_token');
}

export class APIClient {
  constructor(baseURL = '/api') {
    const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
    this.baseURL = isProd ? 'https://app.orbionagents.com' : (process.env.NEXT_PUBLIC_API_URL || baseURL);
    this.requestHooks = [];
    this.responseHooks = [];
    this.csrfTokenGetter = () => null;
  }

  setCSRFTokenGetter(fn) {
    this.csrfTokenGetter = fn;
  }

  // Hook registers for future extension points
  addRequestHook(hook) {
    this.requestHooks.push(hook);
  }

  addResponseHook(hook) {
    this.responseHooks.push(hook);
  }

  async requestRaw(endpoint, options = {}, isRetryAttempt = false) {
    const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
    const url = isProd
      ? `${this.baseURL}${endpoint.startsWith('/api/') ? endpoint.substring(4) : (endpoint.startsWith('/backend/') ? endpoint.substring(8) : endpoint)}`
      : ((endpoint.startsWith('/api/') || endpoint.startsWith('/backend/'))
        ? endpoint
        : `${this.baseURL}${endpoint}`);

    const method = (options.method || 'GET').toUpperCase();
    const isPostOrPutOrPatch = ['POST', 'PUT', 'PATCH'].includes(method);
    const { signal: optSignal, ...restOptions } = options;

    const config = {
      credentials: 'include', 
      ...restOptions,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(isPostOrPutOrPatch && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    };

    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (isMutating) {
      if (endpoint.startsWith('/admin') || url.includes('/admin')) {
        const csrfToken = getCSRFToken();
        if (csrfToken) {
          config.headers['X-Admin-CSRF-Token'] = csrfToken;
        }
      } else if (this.csrfTokenGetter) {
        const csrfToken = this.csrfTokenGetter();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
    }

    // Request Hooks
    for (const hook of this.requestHooks) {
      try {
        hook(url, config);
      } catch (err) {
        console.error("API Client request hook error:", err);
      }
    }

    // Handle Timeout via AbortController
    let isTimeout = false;
    const controller = optSignal ? null : new AbortController();

    const isAdminEndpoint = endpoint.startsWith('/admin') || url.includes('/admin');
    const isStreamEndpoint = endpoint.includes('/stream') || endpoint.includes('/ws') || endpoint.includes('/events');
    const timeoutMs = isAdminEndpoint ? ADMIN_TIMEOUT_MS : isStreamEndpoint ? STREAM_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

    const timeoutId = controller ? setTimeout(() => { isTimeout = true; controller.abort('timeout'); }, timeoutMs) : null;
    config.signal = optSignal || controller?.signal;

    try {
      console.log(`[API Request] ${config.method || 'GET'}: ${url}${isRetryAttempt ? ' (Retry)' : ''}`);
      const response = await fetch(url, config);
      if (timeoutId) clearTimeout(timeoutId);

      // Response Hooks
      for (const hook of this.responseHooks) {
        try {
          hook(response);
        } catch (err) {
          console.error("API Client response hook error:", err);
        }
      }

      if (!response.ok) {
        let data = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          try {
            data = await response.clone().json();
          } catch (e) {}
        }

        let errorMessage = 'Request failed';
        if (data && data.detail) {
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
        } else if (data && (data.message || data.error?.message)) {
          errorMessage = data.message || data.error.message;
        } else {
          errorMessage = `HTTP error ${response.status}`;
        }

        const errorObj = new Error(errorMessage);
        errorObj.status = response.status;
        errorObj.data = data;

        if (response.status >= 400 && response.status < 500) {
          console.warn(`[API Client Error] ${response.status}:`, errorMessage);
        } else {
          console.warn(`[API Server Error] ${response.status}:`, errorMessage);
        }

        if (url.includes('/admin') && !url.includes('/admin/auth') && (response.status === 401 || response.status === 403 || response.status === 404)) {
          if (typeof window !== 'undefined') {
            window.location.href = '/admin';
          }
        }

        throw errorObj;
      }

      return response;

    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      if (isTimeout || error?.name === 'TimeoutError' || (error?.name === 'AbortError' && isTimeout)) {
        const timeoutError = new Error('Request timeout. Please try again.');
        timeoutError.name = 'TimeoutError';
        timeoutError.status = 408;
        throw timeoutError;
      }

      if (error.name === 'AbortError') {
        const timeoutErr = new Error(
          isAdminEndpoint
            ? 'Admin API timed out. The server may be restarting — please retry.'
            : 'Request timed out. Please check your connection and retry.'
        );
        timeoutErr.status = 408;
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }

      const isFetchNetworkError = (error instanceof TypeError || error?.name === 'TypeError') && error?.message?.toLowerCase().includes('fetch');

      if (isFetchNetworkError && !isRetryAttempt) {
        const method = (options.method || 'GET').toUpperCase();
        const isOTPOrSensitive = endpoint.includes('/auth/verify-otp') || endpoint.includes('/auth/send-otp') || endpoint.includes('/billing/');
        const isIdempotent = ['GET', 'PUT', 'DELETE'].includes(method);
        const canRetry = isIdempotent && !isOTPOrSensitive;

        if (canRetry) {
          console.warn(`Fetch failed (likely cold-start). Retrying in 800ms... URL: ${url}`);
          await new Promise(resolve => setTimeout(resolve, 800));
          return this.requestRaw(endpoint, options, true);
        }
      }

      if (isFetchNetworkError) {
        const networkErr = new Error('Network error — check your connection or try again.');
        networkErr.status = 0;
        networkErr.isNetworkError = true;
        throw networkErr;
      }

      throw error;
    }
  }

  async request(endpoint, options = {}) {
    const response = await this.requestRaw(endpoint, options);
    const contentType = response.headers.get("content-type");
    let data = null;

    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    }

    return data !== null ? data : {};
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

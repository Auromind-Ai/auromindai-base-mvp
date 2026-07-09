console.log("API INFRASTRUCTURE VERSION: 2.0.0");

function getCSRFToken() {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )admin_csrf_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  return window.sessionStorage?.getItem('admin_csrf_token');
}

export class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.requestHooks = [];
    this.responseHooks = [];
  }

  // Hook registers for future extension points
  addRequestHook(hook) {
    this.requestHooks.push(hook);
  }

  addResponseHook(hook) {
    this.responseHooks.push(hook);
  }

  async request(endpoint, options = {}, isRetryAttempt = false) {
    const url = (endpoint.startsWith('/api/') || endpoint.startsWith('/backend/'))
      ? endpoint
      : `${this.baseURL}${endpoint}`;

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

    const isMutatingAdmin = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && 
      (endpoint.startsWith('/admin') || url.includes('/admin'));

    if (isMutatingAdmin) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-Admin-CSRF-Token'] = csrfToken;
      }
    }

    // 3. Request Hooks
    for (const hook of this.requestHooks) {
      try {
        hook(url, config);
      } catch (err) {
        console.error("API Client request hook error:", err);
      }
    }

    // 4. Handle Timeout via AbortController
    const controller = optSignal ? null : new AbortController();
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null; // 30s timeout
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

      // 5. Parse and Handle Response
      const contentType = response.headers.get("content-type");
      let data = null;

      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      }

      if (!response.ok) {
        // Detailed error formatting
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

        // Log based on severity
        if (response.status >= 400 && response.status < 500) {
          console.warn(`[API Client Error] ${response.status}:`, errorMessage);
        } else {
          console.warn(`[API Server Error] ${response.status}:`, errorMessage);
        }

        // Check for admin console authorization issues (e.g. session expired)
        if (url.includes('/admin') && !url.includes('/admin/auth') && (response.status === 401 || response.status === 403 || response.status === 404)) {
          if (typeof window !== 'undefined') {
            window.location.href = '/admin';
          }
        }

        throw errorObj;
      }

      // Return JSON if available, otherwise empty object for success
      return data !== null ? data : {};

    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);

      // Suppress AbortError console noise from StrictMode double-invoke
      if (error.name === 'AbortError') {
        throw error;
      }

      const isFetchNetworkError = (error instanceof TypeError || error?.name === 'TypeError') && error?.message?.toLowerCase().includes('fetch');

      // Attempt automatic retry once for network errors on safe/idempotent endpoints
      if (isFetchNetworkError && !isRetryAttempt) {
        const method = (options.method || 'GET').toUpperCase();
        const isOTPOrSensitive = endpoint.includes('/auth/verify-otp') || endpoint.includes('/auth/send-otp') || endpoint.includes('/billing/');
        const isIdempotent = ['GET', 'PUT', 'DELETE'].includes(method);
        const canRetry = isIdempotent && !isOTPOrSensitive;

        if (canRetry) {
          console.warn(`Fetch failed (likely cold-start/Strict dev double-invoke). Retrying in 500ms... URL: ${url}`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return this.request(endpoint, options, true);
        }
      }

      throw error;
    }
  }

  // REST Helper Methods
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

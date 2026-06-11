const isBrowser = typeof window !== "undefined";
let memoryUser = null;
let memoryWorkspace = null;

/* ---------------- TOKEN ---------------- */

export const setToken = (token) => {
  // Cookies are set by the server. Storage writes for the JWT token are removed for security.
};

export const getToken = () => {
  // JWT tokens are inside HttpOnly cookies and not readable by JavaScript.
  return null;
};

export const removeToken = () => {
  memoryUser = null;
  memoryWorkspace = null;
};

/* ---------------- USER ---------------- */

export const setUser = (user) => {
  memoryUser = user || null;
};

export const getUser = () => {
  return isBrowser ? memoryUser : null;
};

/* ---------------- WORKSPACE ---------------- */

export const setWorkspace = (workspace) => {
  memoryWorkspace = workspace || null;
};

export const getWorkspace = () => {
  return isBrowser ? memoryWorkspace : null;
};

/* ---------------- AUTH ---------------- */

export const isAuthenticated = () => {
  if (!isBrowser) return false;
  return !!getUser();
};

export const logout = () => {
  removeToken();
  if (isBrowser) {
    // Delete cookies via api first if possible, then redirect
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .finally(() => {
        window.location.replace("/login");
      });
  }
};

/* ---------------- ADMIN ---------------- */

export const getAdminBackup = () => {
  // admin backup tokens are handled as cookies, not accessible via JS
  return null;
};

export const clearAdminBackup = () => {
  // Handled on backend
};

/* ---------------- JWT HELPERS ---------------- */

export const getWorkspaceIdFromToken = () => {
  if (!isBrowser) return null;
  return memoryWorkspace?.id || null;
};

/* ---------------- HEADERS ---------------- */

export const adminAuthHeader = () => {
  return {};
};

export const authHeader = () => {
  return {};
};

/* ---------------- IMPERSONATION ---------------- */

export const backupAdminToken = () => {
  // Handled on the backend when starting the impersonation session
};

export const restoreAdminToken = () => {
  // Handled on the backend via the /auth/stop-impersonation endpoint
  return true;
};

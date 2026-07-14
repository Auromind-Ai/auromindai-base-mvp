const isBrowser = typeof window !== "undefined";
let memoryUser = null;
let memoryWorkspace = null;

/* ---------------- TOKEN ---------------- */

export const setToken = (token) => {
  if (isBrowser && token) {
    localStorage.setItem("auth_token", token);
  }
};

export const getToken = () => {
  if (isBrowser) {
    return localStorage.getItem("auth_token");
  }
  return null;
};

export const removeToken = () => {
  if (isBrowser) {
    localStorage.removeItem("auth_token");
  }
  memoryUser = null;
  memoryWorkspace = null;
  if (isBrowser) {
    localStorage.removeItem('auromind_logged_in');
  }
};

export const setUser = (user) => {
  memoryUser = user || null;
  if (isBrowser) {
    if (user) {
      localStorage.setItem('auromind_logged_in', 'true');
    } else {
      localStorage.removeItem('auromind_logged_in');
    }
  }
};

export const getUser = () => {
  return isBrowser ? memoryUser : null;
};

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
    import('@/lib/api')
      .then((mod) => {
        const api = mod.default || mod;
        return api.logout();
      })
      .catch((err) => {
        console.error("API logout failed, performing fallback:", err);
      })
      .finally(() => {
        window.location.replace("/login");
      });
  }
};

/*Admin backup helpers*/
export const setAdminBackup = (adminToken) => {
  if (typeof window !== 'undefined' && adminToken) {
    // only set if not already present (prevent overwriting)
    if (!localStorage.getItem('admin_backup_token')) {
      localStorage.setItem('admin_backup_token', adminToken);
    }
  }
};

export const getAdminBackup = () => {
  // admin backup tokens are handled as cookies, not accessible via JS
  return null;
};

export const clearAdminBackup = () => {
  // Handled on backend
};
export const getWorkspaceIdFromToken = () => {
  if (!isBrowser) return null;
  return memoryWorkspace?.id || null;
};

/* ---------------- HEADERS ---------------- */

/* Use this for admin-only API calls (prefers admin backup token) */
export const adminAuthHeader = () => {
  return {};
};
export const authHeader = () => {
  return {};
};
/* Restore admin token as active token (exit impersonation) */
export const backupAdminToken = () => {
  // Handled on the backend when starting the impersonation session
};

export const restoreAdminToken = () => {
  // Handled on the backend via the /auth/stop-impersonation endpoint
  return true;
};

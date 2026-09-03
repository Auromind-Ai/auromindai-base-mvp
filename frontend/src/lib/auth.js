const isBrowser = typeof window !== "undefined";
let memoryUser = null;
let memoryWorkspace = null;

export const decodeToken = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = decodeToken(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  // Expired if current unix timestamp is >= exp (with 5 seconds clock-skew buffer)
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp <= (currentTime + 5);
};

export const isCurrentTokenValid = () => {
  const token = getToken();
  return Boolean(token && !isTokenExpired(token));
};

/* ---------------- TOKEN ---------------- */

export const setToken = (token) => {
  if (isBrowser) {
    if (token) {
      localStorage.setItem('auth_token', token);
      // Sync cookie so SSR and middleware can read it if needed
      document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax`;
    } else {
      localStorage.removeItem('auth_token');
      document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
    }
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
    localStorage.removeItem('orbionagents_logged_in');
    localStorage.removeItem('auromind_logged_in');
    localStorage.removeItem("orbionagents_user");
    localStorage.removeItem("auromind_user");
    localStorage.removeItem("user");
    localStorage.removeItem("workspace");
    localStorage.removeItem("workspace_id");
    localStorage.removeItem("admin_backup_token");
    localStorage.removeItem("floating_chat_session_id");
    sessionStorage.removeItem("ai_active");
    sessionStorage.removeItem("last_session_id");
    sessionStorage.removeItem("admin_session_token");
    sessionStorage.removeItem("admin_csrf_token");
    document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
  }
  memoryUser = null;
  memoryWorkspace = null;
};

export const setUser = (user) => {
  memoryUser = user || null;

  if (isBrowser) {
    if (user) {
      localStorage.setItem("orbionagents_user", JSON.stringify(user));
      localStorage.setItem("orbionagents_logged_in", "true");
      // Clean up legacy keys
      localStorage.removeItem("auromind_user");
      localStorage.removeItem("auromind_logged_in");
    } else {
      localStorage.removeItem("orbionagents_user");
      localStorage.removeItem("orbionagents_logged_in");
      localStorage.removeItem("auromind_user");
      localStorage.removeItem("auromind_logged_in");
    }
  }
};

export const getUser = () => {
  if (!isBrowser) return null;

  if (memoryUser) {
    return memoryUser;
  }

  const storedUser = localStorage.getItem("orbionagents_user") || localStorage.getItem("auromind_user");

  if (storedUser) {
    try {
      memoryUser = JSON.parse(storedUser);
      // Migrate legacy key to orbionagents_user and clean up auromind
      if (localStorage.getItem("auromind_user")) {
        localStorage.setItem("orbionagents_user", storedUser);
        localStorage.removeItem("auromind_user");
      }
      return memoryUser;
    } catch {
      localStorage.removeItem("orbionagents_user");
      localStorage.removeItem("auromind_user");
    }
  }

  return null;
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
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    return false;
  }
  return !!getUser();
};

export const logout = (options = {}) => {
  removeToken();
  if (isBrowser) {
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: options }));

    const reason = options?.reason;
    const redirectUrl = reason === 'expired'
      ? '/login?session_expired=true'
      : (reason === 'deactivated' ? '/login?deactivated=true' : '/login');

    // Delete cookies via api first if possible, then redirect
    import('@/lib/api')
      .then((mod) => {
        const api = mod.default || mod;
        return api.logout();
      })
      .catch((err) => {
        console.warn("API logout failed, performing fallback:", err?.message || err);
      })
      .finally(() => {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.replace(redirectUrl);
        }
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

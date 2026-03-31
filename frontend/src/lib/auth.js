// src/lib/auth.js
export const setToken = (token) => {
  if (typeof window !== 'undefined' && token) {
    sessionStorage.setItem('token', token);
  }
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('token');
  }
  return null;
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('workspace');
    sessionStorage.removeItem('workspace_id');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspace');
    localStorage.removeItem('workspace_id');
  }
};

export const setUser = (user) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('user', JSON.stringify(user));
  }
};

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const setWorkspace = (workspace) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('workspace', JSON.stringify(workspace));
  }
};

export const getWorkspace = () => {
  if (typeof window !== 'undefined') {
    const workspace = sessionStorage.getItem('workspace');
    return workspace ? JSON.parse(workspace) : null;
  }
  return null;
};

export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem("token");
};

export const logout = () => {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

/* ---------- Admin backup helpers ---------- */
export const setAdminBackup = (adminToken) => {
  if (typeof window !== 'undefined' && adminToken) {
    // only set if not already present (prevent overwriting)
    if (!localStorage.getItem('admin_backup_token')) {
      localStorage.setItem('admin_backup_token', adminToken);
    }
  }
};

export const getAdminBackup = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_backup_token');
};

export const clearAdminBackup = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('admin_backup_token');
};
export const getWorkspaceIdFromToken = () => {

  const token = getToken()

  if (!token) return null

  try {

    const payload = JSON.parse(atob(token.split(".")[1]))

    return payload.workspace_id

  } catch {
    return null
  }

}
/* Use this for admin-only API calls (prefers admin backup token) */
export const adminAuthHeader = () => {
  const admin = getAdminBackup();
  const headers = {};
  if (admin) headers.Authorization = `Bearer ${admin}`;
  return headers;
};
export const authHeader = () => {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};
/* Restore admin token as active token (exit impersonation) */
export const backupAdminToken = () => {
  if (typeof window !== "undefined") {
    const token = getToken()
    if (token) {
      localStorage.setItem("admin_backup_token", token)
    }
  }
}

export const restoreAdminToken = () => {
  const backup = localStorage.getItem("admin_backup_token")
  if (!backup) return false

  sessionStorage.setItem("token", backup)
  localStorage.removeItem("admin_backup_token")
  localStorage.removeItem("is_impersonating")
  // optionally clear workspace to force re-fetch or restore if backed up
  // for now, just clearing the flag is enough to stop the banner
  return true
}

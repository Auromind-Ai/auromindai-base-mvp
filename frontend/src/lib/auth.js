// src/lib/auth.js

const isBrowser = typeof window !== "undefined";

/* ---------------- TOKEN ---------------- */

export const setToken = (token) => {
  if (!isBrowser || !token) return;

  sessionStorage.setItem("token", token);
  localStorage.setItem("token", token); 
};

export const getToken = () => {
  if (!isBrowser) return null;

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );
};

export const removeToken = () => {
  if (!isBrowser) return;

  const keys = ["token", "user", "workspace", "workspace_id"];

  keys.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

/* ---------------- USER ---------------- */

export const setUser = (user) => {
  if (!isBrowser || !user) return;
  const serialized = JSON.stringify(user);
  sessionStorage.setItem("user", serialized);
  localStorage.setItem("user", serialized);
};

export const getUser = () => {
  if (!isBrowser) return null;

  const getStoredUser = (storage) => {
    try {
      const raw = storage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      storage.removeItem("user");
      return null;
    }
  };

  let user = getStoredUser(sessionStorage);
  if (user) return user;

  user = getStoredUser(localStorage);
  if (user) {
    sessionStorage.setItem("user", JSON.stringify(user));
  }

  return user;
};

/* ---------------- WORKSPACE ---------------- */

export const setWorkspace = (workspace) => {
  if (!isBrowser || !workspace) return;
  const serialized = JSON.stringify(workspace);
  sessionStorage.setItem("workspace", serialized);
  localStorage.setItem("workspace", serialized);
};

export const getWorkspace = () => {
  if (!isBrowser) return null;

  const getStoredWorkspace = (storage) => {
    try {
      const raw = storage.getItem("workspace");
      return raw ? JSON.parse(raw) : null;
    } catch {
      storage.removeItem("workspace");
      return null;
    }
  };

  let workspace = getStoredWorkspace(sessionStorage);
  if (workspace) return workspace;

  workspace = getStoredWorkspace(localStorage);
  if (workspace) {
    sessionStorage.setItem("workspace", JSON.stringify(workspace));
  }

  return workspace;
};

/* ---------------- AUTH ---------------- */

export const isAuthenticated = () => {
  if (!isBrowser) return false;
  return !!getToken(); 
};

export const logout = () => {
  removeToken();
  if (isBrowser) {
    window.location.replace("/login"); //  better than href (no history)
  }
};

/* ---------------- ADMIN ---------------- */

export const getAdminBackup = () => {
  if (!isBrowser) return null;
  return localStorage.getItem("admin_backup_token");
};

export const clearAdminBackup = () => {
  if (!isBrowser) return;
  localStorage.removeItem("admin_backup_token");
};

/* ---------------- JWT HELPERS ---------------- */

export const getWorkspaceIdFromToken = () => {
  const token = getToken();
  if (!token) return null;

  try {
    const base64 = token.split(".")[1];

    //fix: handle URL-safe base64
    const decoded = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));

    const payload = JSON.parse(decoded);

    return payload.workspace_id || null;
  } catch {
    return null;
  }
};

/* ---------------- HEADERS ---------------- */

export const adminAuthHeader = () => {
  const admin = getAdminBackup();
  return admin ? { Authorization: `Bearer ${admin}` } : {};
};

export const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ---------------- IMPERSONATION ---------------- */

export const backupAdminToken = () => {
  if (!isBrowser) return;

  const token = getToken();
  if (token) {
    localStorage.setItem("admin_backup_token", token);
    localStorage.setItem("is_impersonating", "true"); //  useful flag
  }
};

export const restoreAdminToken = () => {
  if (!isBrowser) return false;

  const backup = localStorage.getItem("admin_backup_token");
  if (!backup) return false;

  sessionStorage.setItem("token", backup);
  localStorage.setItem("token", backup); 

  localStorage.removeItem("admin_backup_token");
  localStorage.removeItem("is_impersonating");

  return true;
};

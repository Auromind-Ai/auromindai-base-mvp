// src/lib/auth.js

const isBrowser = typeof window !== "undefined";

/* ---------------- TOKEN ---------------- */

export const setToken = (token) => {
  if (!isBrowser || !token) return;

  sessionStorage.setItem("token", token);
  localStorage.setItem("token", token); // 🔥 keep both in sync
};

export const getToken = () => {
  if (!isBrowser) return null;

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") // 🔥 fallback
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
  sessionStorage.setItem("user", JSON.stringify(user));
};

export const getUser = () => {
  if (!isBrowser) return null;

  try {
    const user = sessionStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null; // 🔥 avoid crash if corrupted
  }
};

/* ---------------- WORKSPACE ---------------- */

export const setWorkspace = (workspace) => {
  if (!isBrowser || !workspace) return;
  sessionStorage.setItem("workspace", JSON.stringify(workspace));
};

export const getWorkspace = () => {
  if (!isBrowser) return null;

  try {
    const workspace = sessionStorage.getItem("workspace");
    return workspace ? JSON.parse(workspace) : null;
  } catch {
    return null;
  }
};

/* ---------------- AUTH ---------------- */

export const isAuthenticated = () => {
  if (!isBrowser) return false;
  return !!getToken(); // 🔥 use unified getter
};

export const logout = () => {
  removeToken();
  if (isBrowser) {
    window.location.replace("/login"); // 🔥 better than href (no history)
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

    // 🔥 fix: handle URL-safe base64
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
    localStorage.setItem("is_impersonating", "true"); // 🔥 useful flag
  }
};

export const restoreAdminToken = () => {
  if (!isBrowser) return false;

  const backup = localStorage.getItem("admin_backup_token");
  if (!backup) return false;

  sessionStorage.setItem("token", backup);
  localStorage.setItem("token", backup); // 🔥 sync

  localStorage.removeItem("admin_backup_token");
  localStorage.removeItem("is_impersonating");

  return true;
};
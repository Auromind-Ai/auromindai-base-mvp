"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { setUser, setWorkspace, removeToken } from '@/lib/auth';

const AuthContext = createContext({
  user: null,
  workspaceId: null,
  workspaces: [],
  loading: true,
  setUser: () => {},
  setWorkspaceId: () => {},
  logout: async () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [workspaces, setWorkspacesState] = useState([]);
  const [workspaceId, setWorkspaceIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const refreshUser = async (signal) => {
    setLoading(true);
    try {
      const userData = await api.getCurrentUser({ signal });
      const profile = userData?.user || userData;
      
      if (!profile || !profile.email) {
        throw new Error("No user profile returned");
      }
      
      setUserState(profile);
      setUser(profile);
      
      // Fetch workspaces list
      const wsData = await api.getWorkspaces({ signal });
      const wsList = wsData?.workspaces || [];
      setWorkspacesState(wsList);
      
      // Determine active workspace_id
      let activeWs = null;

      if (workspaceId) {
        activeWs = wsList.find(w => w.id === workspaceId);
      }
      if (!activeWs && profile.workspace_id) {
        activeWs = wsList.find(w => w.id === profile.workspace_id);
      }
      if (!activeWs && wsList.length > 0) {
        activeWs = wsList[0];
      }

      let actId = null;
      if (activeWs) {
        actId = activeWs.id;
        setWorkspaceIdState(activeWs.id);
        setWorkspace(activeWs);
      }

    } catch (err) {
      // StrictMode cleanup — ignore AbortError gracefully, do NOT set unauthenticated
      if (err.name === 'AbortError') return;
      
      const isAuthError = err?.status === 401 || err?.status === 403;
      if (isAuthError) {
        setUserState(null);
        setWorkspacesState([]);
        setWorkspaceIdState(null);
        setUser(null);
        setWorkspace(null);
      } else {
        console.warn('Auth check failed (non-auth error):', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const isMarketingPage = (pathname) => {
      if (pathname === '/') return true;
      if (pathname.startsWith('/solutions/')) return true;
      if (pathname.startsWith('/product/')) return true;
      if (pathname.startsWith('/resources/')) return true;
      return false;
    };

    const checkAuth = async () => {
      const isLogged = typeof window !== 'undefined' && localStorage.getItem('auromind_logged_in') === 'true';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

      if (isMarketingPage(pathname) && !isLogged) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser(controller.signal);
      } catch (err) {
        // Errors already handled in refreshUser
      }
    };

    checkAuth();
    return () => controller.abort(); // cleanup on unmount
  }, []);

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Logout API call failed:", err?.message || err);
    } finally {
      removeToken();
      localStorage.removeItem('auromind_logged_in');
      setUserState(null);
      setWorkspaceIdState(null);
      setWorkspacesState([]);
      setUser(null);
      setWorkspace(null);
      window.location.replace('/login');
    }
  };

  const setWorkspaceId = (id) => {
    setWorkspaceIdState(id);
    const matchedWs = workspaces.find(w => w.id === id);
    if (matchedWs) {
      setWorkspace(matchedWs);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      workspaceId,
      workspaces,
      loading,
      setUser: setUserState,
      setWorkspaceId,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

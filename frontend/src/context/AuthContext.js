"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { setUser, setWorkspace, removeToken, setToken } from '@/lib/auth';

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
  const [csrfToken, setCsrfTokenState] = useState(null);
  const csrfTokenRef = useRef(null);
  const workspaceIdRef = useRef(workspaceId);
  const inFlightRefreshRef = useRef(null);

  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  useEffect(() => {
    api.setCSRFTokenGetter(() => csrfTokenRef.current);
  }, []);

  const refreshUser = useCallback(async (signal) => {
    // Deduplicate concurrent in-flight refresh calls
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const fetchPromise = (async () => {
      setLoading(true);
      try {
        const userData = await api.getCurrentUser({ signal });
        const profile = userData?.user || userData;
        const csrf = userData?.csrf_token || profile?.csrf_token;
        
        if (csrf) {
          setCsrfTokenState(csrf);
          csrfTokenRef.current = csrf;
        }
        
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
        const currentWsId = workspaceIdRef.current;

        if (currentWsId) {
          activeWs = wsList.find(w => w.id === currentWsId);
        }
        if (!activeWs && profile.workspace_id) {
          activeWs = wsList.find(w => w.id === profile.workspace_id);
        }
        if (!activeWs && wsList.length > 0) {
          activeWs = wsList[0];
        }

        if (activeWs) {
          setWorkspaceIdState(activeWs.id);
          workspaceIdRef.current = activeWs.id;
          setWorkspace(activeWs);
        }

        return profile;
      } catch (err) {
        // StrictMode cleanup — ignore AbortError gracefully, do NOT set unauthenticated
        if (err.name === 'AbortError') return null;
        
        const isDeactivated = err?.message?.toLowerCase()?.includes('deactivat') || (err?.status === 403 && String(err?.data?.detail || '').toLowerCase().includes('deactivat'));
        if (isDeactivated) {
          removeToken();
          localStorage.removeItem('auromind_logged_in');
          setUserState(null);
          setWorkspacesState([]);
          setWorkspaceIdState(null);
          workspaceIdRef.current = null;
          setUser(null);
          setWorkspace(null);
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.replace('/login?deactivated=true');
          }
        } else if (isAuthError) {
          setUserState(null);
          setWorkspacesState([]);
          setWorkspaceIdState(null);
          workspaceIdRef.current = null;
          setUser(null);
          setWorkspace(null);
        } else {
          console.warn('Auth check failed (non-auth error):', err?.message || err);
        }
        throw err;
      } finally {
        setLoading(false);
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = fetchPromise;
    return fetchPromise;
  }, []);

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
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        if (tokenFromUrl) {
          setToken(tokenFromUrl);
          const cleanUrl = window.location.pathname + window.location.search.replace(/[\?&]token=[^&]+/, '').replace(/^&/, '?');
          window.history.replaceState({}, document.title, cleanUrl || window.location.pathname);
        }
      }

      const isLogged = typeof window !== 'undefined' && localStorage.getItem('auromind_logged_in') === 'true';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
      const hasTokenInUrl = typeof window !== 'undefined' && Boolean(new URLSearchParams(window.location.search).get('token'));

      if ((isAuthPage && !hasTokenInUrl) || (isMarketingPage(pathname) && !isLogged)) {
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
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Logout API call failed:", err?.message || err);
    } finally {
      removeToken();
      localStorage.removeItem('auromind_logged_in');
      localStorage.removeItem('auromind_user');
      localStorage.removeItem('user');
      localStorage.removeItem('workspace');
      setUserState(null);
      setWorkspaceIdState(null);
      workspaceIdRef.current = null;
      setWorkspacesState([]);
      setCsrfTokenState(null);
      csrfTokenRef.current = null;
      setUser(null);
      setWorkspace(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
    }
  }, []);

  const setWorkspaceId = useCallback((id) => {
    setWorkspaceIdState(id);
    workspaceIdRef.current = id;
    setWorkspacesState((currentWorkspaces) => {
      const matchedWs = currentWorkspaces.find(w => w.id === id);
      if (matchedWs) {
        setWorkspace(matchedWs);
      }
      return currentWorkspaces;
    });
  }, []);

  const contextValue = useMemo(() => ({
    user,
    workspaceId,
    workspaces,
    loading,
    csrfToken,
    setUser: setUserState,
    setWorkspaceId,
    logout,
    refreshUser
  }), [user, workspaceId, workspaces, loading, csrfToken, setWorkspaceId, logout, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


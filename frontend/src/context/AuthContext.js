"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { resolveWorkspace, getVisibleWorkspaces } from '@/lib/workspaceAccess.mjs';
import { setUser, setWorkspace, removeToken, setToken, getToken, isTokenExpired } from '@/lib/auth';

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
  const [currentRole, setCurrentRole] = useState('member');
  const [isOwner, setIsOwner] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [permissionWorkspaceId, setPermissionWorkspaceId] = useState(null);
  const permissionRequestRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfTokenState] = useState(null);
  const csrfTokenRef = useRef(null);
  const workspaceIdRef = useRef(workspaceId);
  const userRef = useRef(user);
  const inFlightRefreshRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  useEffect(() => {
    api.setCSRFTokenGetter(() => csrfTokenRef.current);
  }, []);

  const refreshUser = useCallback(async (signal, force = false) => {
    // Deduplicate concurrent in-flight refresh calls unless force is true
    if (inFlightRefreshRef.current && !force) {
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
        setWorkspacesState(getVisibleWorkspaces(wsList));
        
        // Restore the selection on full reloads before checking route permissions.
        // Only IDs in the server-provided membership list can become active.
        const isDifferentUser = Boolean(userRef.current?.id && profile?.id && userRef.current.id !== profile.id);
        const currentWsIdToResolve = (isDifferentUser || force) ? null : workspaceIdRef.current;
        const savedWsId = typeof window !== 'undefined'
          ? localStorage.getItem('workspace_id')
          : null;
        const isSavedWsValid = savedWsId && (
          wsList.some(w => w.id === savedWsId) ||
          (wsData?.hidden_personal_workspace_ids || []).includes(savedWsId)
        );
        const validSavedWsId = (isDifferentUser || force) ? null : (isSavedWsValid ? savedWsId : null);
        const activeWs = resolveWorkspace(
          wsList,
          currentWsIdToResolve,
          validSavedWsId,
          profile.workspace_id,
          wsData?.hidden_personal_workspace_ids || []
        );

        let initialPerms = null;
        if (activeWs) {
          const isWsOwner = Boolean(activeWs.is_owner || ['founder', 'owner', 'admin'].includes((activeWs.role || '').toLowerCase()));
          const wsRole = isWsOwner ? (activeWs.role || 'founder') : (activeWs.role || 'member');

          setWorkspaceIdState(activeWs.id);
          workspaceIdRef.current = activeWs.id;
          setWorkspace(activeWs);

          setCurrentRole(wsRole);
          setIsOwner(isWsOwner);
          setPermissionWorkspaceId(activeWs.id);

          try {
            const permRes = await api.getMyWorkspacePermissions(activeWs.id, { signal });
            if (permRes) {
              initialPerms = permRes;
              setCurrentRole(permRes?.role || wsRole);
              setIsOwner(Boolean(permRes?.is_owner !== undefined ? permRes.is_owner : isWsOwner));
              setPermissions(permRes?.permissions || {});
              setPermissionWorkspaceId(activeWs.id);
            }
          } catch (permErr) {
            console.warn("Failed to load initial permissions in refreshUser:", permErr);
          }
        } else {
          setWorkspaceIdState(null);
          workspaceIdRef.current = null;
          setCurrentRole('member');
          setIsOwner(false);
          setPermissions(null);
          setPermissionWorkspaceId(null);
          // Keep an unavailable selection persisted until the user explicitly
          // chooses another workspace; never silently open their own workspace.
          if (!savedWsId || isDifferentUser || force) setWorkspace(null);
        }

        const isOwnerFinal = Boolean(initialPerms?.is_owner !== undefined ? initialPerms.is_owner : (activeWs?.is_owner || ['founder', 'owner', 'admin'].includes((activeWs?.role || '').toLowerCase())));
        const roleFinal = initialPerms?.role || activeWs?.role || (isOwnerFinal ? 'founder' : 'member');

        return {
          ...profile,
          active_workspace: activeWs,
          role: roleFinal,
          is_owner: isOwnerFinal,
          permissions: initialPerms?.permissions || {}
        };
      } catch (err) {
        // StrictMode cleanup — ignore AbortError gracefully, do NOT set unauthenticated
        if (err.name === 'AbortError') return null;
        
        const isDeactivated = err?.message?.toLowerCase()?.includes('deactivat') || (err?.status === 403 && String(err?.data?.detail || '').toLowerCase().includes('deactivat'));
        const isAuthError = err?.status === 401 ||
                            err?.status === 403 ||
                            err?.isSessionExpired ||
                            err?.message?.toLowerCase()?.includes('unauthorized') ||
                            err?.message?.toLowerCase()?.includes('session expired') ||
                            err?.message?.toLowerCase()?.includes('could not validate credentials') ||
                            err?.message?.toLowerCase()?.includes('credentials');

        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const isExcludedFromRedirect = pathname.startsWith('/login') ||
                                       pathname.startsWith('/signup') ||
                                       pathname.startsWith('/docs') ||
                                       pathname.startsWith('/accept-invite') ||
                                       pathname === '/';

        if (isDeactivated) {
          removeToken();
          setCurrentRole('member');
          setIsOwner(false);
          setPermissions(null);
          setPermissionWorkspaceId(null);
          permissionRequestRef.current += 1;
          setUserState(null);
          setWorkspacesState([]);
          setWorkspaceIdState(null);
          workspaceIdRef.current = null;
          setUser(null);
          setWorkspace(null);
          if (typeof window !== 'undefined' && !isExcludedFromRedirect) {
            window.location.replace('/login?deactivated=true');
          }
        } else if (isAuthError) {
          removeToken();
          setCurrentRole('member');
          setIsOwner(false);
          setPermissions(null);
          setPermissionWorkspaceId(null);
          permissionRequestRef.current += 1;
          setUserState(null);
          setWorkspacesState([]);
          setWorkspaceIdState(null);
          workspaceIdRef.current = null;
          setUser(null);
          setWorkspace(null);
          if (typeof window !== 'undefined' && !isExcludedFromRedirect) {
            window.location.replace('/login?session_expired=true');
          }
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
      if (pathname.startsWith('/docs')) return true;
      if (pathname.startsWith('/solutions/')) return true;
      if (pathname.startsWith('/product/')) return true;
      if (pathname.startsWith('/resources/')) return true;
      return false;
    };

    const checkAuth = async () => {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

      // Only strip and use URL tokens on login/callback pages, NEVER on /accept-invite
      if (typeof window !== 'undefined' && !pathname.startsWith('/accept-invite')) {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token') || urlParams.get('auth_token');
        if (tokenFromUrl) {
          setToken(tokenFromUrl);
          const cleanUrl = window.location.pathname + window.location.search.replace(/[\?&](token|auth_token)=[^&]+/, '').replace(/^&/, '?');
          window.history.replaceState({}, document.title, cleanUrl || window.location.pathname);
        }
      }

      const isLogged = typeof window !== 'undefined' && (
        localStorage.getItem('orbionagents_logged_in') === 'true' ||
        localStorage.getItem('auromind_logged_in') === 'true'
      );
      if (typeof window !== 'undefined' && localStorage.getItem('auromind_logged_in')) {
        localStorage.setItem('orbionagents_logged_in', 'true');
        localStorage.removeItem('auromind_logged_in');
      }

      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
      const hasTokenInUrl = typeof window !== 'undefined' && !pathname.startsWith('/accept-invite') && Boolean(new URLSearchParams(window.location.search).get('token'));

      if (pathname.startsWith('/accept-invite') && !isLogged && !getToken()) {
        setLoading(false);
        return;
      }

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

  const logout = useCallback(async (options = {}) => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Logout API call failed:", err?.message || err);
    } finally {
      removeToken();
      setCurrentRole('member');
      setIsOwner(false);
      setPermissions(null);
      setPermissionWorkspaceId(null);
      permissionRequestRef.current += 1;
      setUserState(null);
      setWorkspaceIdState(null);
      workspaceIdRef.current = null;
      setWorkspacesState([]);
      setCsrfTokenState(null);
      csrfTokenRef.current = null;
      setUser(null);
      setWorkspace(null);

      const reason = options?.reason;
      const redirectUrl = reason === 'expired'
        ? '/login?session_expired=true'
        : (reason === 'deactivated' ? '/login?deactivated=true' : '/login');

      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/docs')) {
        window.location.replace(redirectUrl);
      }
    }
  }, []);

  // Listen to cross-module auth:logout events
  useEffect(() => {
    const handleAuthLogout = () => {
      setCurrentRole('member');
      setIsOwner(false);
      setPermissions(null);
      setPermissionWorkspaceId(null);
      permissionRequestRef.current += 1;
      setUserState(null);
      setWorkspaceIdState(null);
      workspaceIdRef.current = null;
      setWorkspacesState([]);
      setCsrfTokenState(null);
      csrfTokenRef.current = null;
      setUser(null);
      setWorkspace(null);
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  // Periodic and Idle Token Freshness Check
  useEffect(() => {
    const checkTokenFreshness = () => {
      if (typeof window === 'undefined') return;
      const pathname = window.location.pathname || '';
      const hostname = window.location.hostname;
      const isAppSubdomain = hostname === 'app.orbionagents.com' || hostname.startsWith('app.');
      const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/docs') || pathname.startsWith('/terms') || pathname.startsWith('/privacy');
      const isProtected = isAppSubdomain
        ? !isAuthRoute
        : (pathname.startsWith('/user/admin') || pathname.startsWith('/admin') || pathname === '/dashboard' || pathname.startsWith('/dashboard/'));
      if (!isProtected) return;

      const token = getToken();
      if (token && isTokenExpired(token)) {
        console.warn("🚫 Session token expired during active session. Logging out.");
        logout({ reason: 'expired' });
      }
    };

    const interval = setInterval(checkTokenFreshness, 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTokenFreshness();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [logout]);

  const refreshPermissions = useCallback(async (wsId) => {
    const targetWsId = wsId || workspaceIdRef.current;
    if (!targetWsId) return null;
    const currentWs = getVisibleWorkspaces(workspaces).find(w => w.id === targetWsId);
    const isWsOwner = Boolean(currentWs?.is_owner || ['founder', 'owner', 'admin'].includes((currentWs?.role || '').toLowerCase()));
    const wsRole = isWsOwner ? (currentWs?.role || 'founder') : (currentWs?.role || 'member');
    const requestId = ++permissionRequestRef.current;
    try {
      const res = await api.getMyWorkspacePermissions(targetWsId);
      if (requestId !== permissionRequestRef.current || targetWsId !== workspaceIdRef.current) return null;
      setCurrentRole(res?.role || wsRole);
      setIsOwner(Boolean(res?.is_owner !== undefined ? res.is_owner : isWsOwner));
      setPermissions(res?.permissions || {});
      setPermissionWorkspaceId(targetWsId);
      return res;
    } catch (e) {
      if (requestId !== permissionRequestRef.current || targetWsId !== workspaceIdRef.current) return null;
      setCurrentRole(wsRole);
      setIsOwner(isWsOwner);
      setPermissions({});
      setPermissionWorkspaceId(targetWsId);
      if (e?.status === 403) refreshUser().catch(() => {});
      console.warn("Failed to fetch workspace permissions:", e);
      return null;
    }
  }, [workspaces, refreshUser]);

  useEffect(() => {
    if (!workspaceId) return;
    const refresh = () => { void refreshPermissions(workspaceId); };
    const onAccessChanged = (event) => {
      if (!event.detail?.workspace_id || event.detail.workspace_id === workspaceId) refresh();
    };
    refresh();
    const interval = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    window.addEventListener('workspace:access-changed', onAccessChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('workspace:access-changed', onAccessChanged);
    };
  }, [workspaceId, refreshPermissions]);

  const PERMISSION_ALIASES = useMemo(() => ({
    "leads.view": ["leads.all_leads", "leads.view", "leads.manage", "leads.*"],
    "leads.all_leads": ["leads.all_leads", "leads.view", "leads.manage", "leads.*"],
    "crm.view": ["crm.view", "crm.contacts", "crm.deals", "crm.companies", "crm.*"],
    "crm.contacts": ["crm.view", "crm.contacts", "crm.deals", "crm.companies", "crm.*"],
    "ai.chat": ["ai.chat", "ai_agents.agents", "ai_agents.agent_settings", "ai_agents.*", "ai.*"],
    "ai_agents.agents": ["ai.chat", "ai_agents.agents", "ai_agents.*", "ai.*"],
    "automation.manage": ["automation.manage", "flows.all_flows", "flows.flow_settings", "flows.manage", "flows.*", "automation.*"],
    "flows.all_flows": ["automation.manage", "flows.all_flows", "flows.flow_settings", "flows.manage", "flows.*", "automation.*"],
    "templates.manage": ["templates.manage", "marketing.templates", "templates.*"],
    "marketing.templates": ["templates.manage", "marketing.templates", "templates.*"],
    "channels.manage": ["channels.manage", "integrations.connected_accounts", "integrations.*", "channels.*"],
    "integrations.connected_accounts": ["channels.manage", "integrations.connected_accounts", "integrations.*", "channels.*"],
    "brain.manage": ["brain.manage", "knowledge_base.documents", "knowledge_base.*", "brain.*"],
    "knowledge_base.documents": ["brain.manage", "knowledge_base.documents", "knowledge_base.*", "brain.*"],
    "credits.view": ["credits.view", "analytics.reports", "credits.*", "analytics.*"],
    "analytics.reports": ["credits.view", "analytics.reports", "credits.*", "analytics.*"],
    "billing.manage": ["billing.manage", "billing.plans", "billing.invoices", "billing.*"],
    "billing.plans": ["billing.manage", "billing.plans", "billing.invoices", "billing.*"],
  }), []);

  const hasPermission = useCallback((permKey) => {
    if (!workspaceId || permissionWorkspaceId !== workspaceId || !currentRole) return false;
    const normRole = (currentRole || '').toLowerCase().trim();
    if (isOwner || ['admin', 'founder', 'owner', 'superadmin', 'platform_admin'].includes(normRole)) {
      return true;
    }
    if (!permissions) return false;

    const checkSingle = (key) => {
      if (key.includes('.')) {
        const [sec, item] = key.split('.');
        const secItems = permissions[sec];
        if (Array.isArray(secItems)) {
          return secItems.includes(item) || secItems.includes('*');
        }
        if (typeof secItems === 'boolean') return secItems;
        return false;
      } else {
        const secItems = permissions[key];
        if (Array.isArray(secItems)) return secItems.length > 0;
        if (typeof secItems === 'boolean') return secItems;
        return false;
      }
    };

    if (checkSingle(permKey)) return true;

    // Check aliases
    const aliases = PERMISSION_ALIASES[permKey] || [];
    for (const alias of aliases) {
      if (checkSingle(alias)) return true;
    }

    // Section alias fallback
    const secMap = {
      ai: ['ai_agents'],
      automation: ['flows'],
      channels: ['integrations'],
      brain: ['knowledge_base'],
      credits: ['analytics'],
    };
    if (secMap[permKey]) {
      for (const oldSec of secMap[permKey]) {
        if (checkSingle(oldSec)) return true;
      }
    }

    return false;
  }, [currentRole, isOwner, permissions, permissionWorkspaceId, workspaceId, PERMISSION_ALIASES]);

  const setWorkspaceId = useCallback((id) => {
    const matchedWs = getVisibleWorkspaces(workspaces).find(w => w.id === id);
    if (!matchedWs) return;
    permissionRequestRef.current += 1;
    setPermissionWorkspaceId(null);
    setCurrentRole('member');
    setIsOwner(false);
    setPermissions(null);
    // Persist synchronously so immediately entering a URL keeps this selection.
    setWorkspace(matchedWs);
    workspaceIdRef.current = id;
    setWorkspaceIdState(id);
  }, [workspaces]);

  const contextValue = useMemo(() => ({
    user,
    workspaceId,
    workspaces: getVisibleWorkspaces(workspaces),
    currentRole: permissionWorkspaceId === workspaceId ? currentRole : 'member',
    permissionsLoading: Boolean(workspaceId && permissionWorkspaceId !== workspaceId),
    permissions,
    hasPermission,
    refreshPermissions,
    loading,
    csrfToken,
    setUser: setUserState,
    setWorkspaceId,
    logout,
    refreshUser
  }), [user, workspaceId, workspaces, currentRole, permissionWorkspaceId, permissions, hasPermission, refreshPermissions, loading, csrfToken, setWorkspaceId, logout, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


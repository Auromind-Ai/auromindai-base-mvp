import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  platform_role?: string;
  deletion_scheduled_at?: string | null;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  role: string;
  plan_type?: string;
}

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  workspaces: WorkspaceItem[];
  selectedWorkspace: WorkspaceItem | null;
  isInitialized: boolean;
}

type Listener = () => void;

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  WORKSPACES: 'auth_workspaces',
  SELECTED_WORKSPACE: 'auth_selected_workspace',
};

function getWebLocalStorage(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {}
  }
  return null;
}

function setWebLocalStorage(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  }
}

function removeWebLocalStorage(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
}

class AuthStore {
  private state: AuthState = {
    token: null,
    user: null,
    workspaces: [],
    selectedWorkspace: null,
    isInitialized: false,
  };

  private listeners: Set<Listener> = new Set();

  constructor() {
    apiClient.setUnauthorizedHandler(() => {
      this.clearAuth().catch(() => {});
    });
    this.init();
  }

  private setState(partial: Partial<AuthState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private async init() {
    let loadedToken: string | null = null;
    let loadedUser: UserProfile | null = null;
    let loadedWorkspaces: WorkspaceItem[] = [];
    let loadedSelectedWs: WorkspaceItem | null = null;

    try {
      const [storedToken, storedUser, storedWorkspaces, storedSelectedWs] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.WORKSPACES),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_WORKSPACE),
        ]);

      loadedToken = storedToken || getWebLocalStorage(STORAGE_KEYS.TOKEN);
      const userStr = storedUser || getWebLocalStorage(STORAGE_KEYS.USER);
      const workspacesStr = storedWorkspaces || getWebLocalStorage(STORAGE_KEYS.WORKSPACES);
      const selectedWsStr = storedSelectedWs || getWebLocalStorage(STORAGE_KEYS.SELECTED_WORKSPACE);

      if (userStr) {
        try {
          loadedUser = JSON.parse(userStr);
        } catch {}
      }
      if (workspacesStr) {
        try {
          const parsedList = JSON.parse(workspacesStr);
          if (Array.isArray(parsedList)) {
            loadedWorkspaces = parsedList;
          }
        } catch {}
      }
      if (selectedWsStr) {
        try {
          const parsedWs = JSON.parse(selectedWsStr);
          if (parsedWs?.id && !String(parsedWs.id).startsWith('ws-')) {
            loadedSelectedWs = parsedWs;
          }
        } catch {}
      }
      if (!loadedSelectedWs && loadedWorkspaces.length > 0) {
        loadedSelectedWs =
          loadedWorkspaces.find((w) => w?.id && !String(w.id).startsWith('ws-')) ||
          loadedWorkspaces[0] ||
          null;
      }

      if (loadedToken) {
        apiClient.setToken(loadedToken);
      }
    } catch {
      // Ignore storage read errors
    } finally {
      this.state = {
        token: loadedToken,
        user: loadedUser,
        workspaces: loadedWorkspaces,
        selectedWorkspace: loadedSelectedWs,
        isInitialized: true,
      };
      this.notify();

      // Validate token and sync latest user + single workspace in background
      if (loadedToken) {
        this.refreshUser().catch(() => {});
        this.refreshWorkspaces().catch(() => {});
      }
    }
  }

  getState(): AuthState {
    return this.state;
  }

  async setAuth(data: {
    token: string;
    user: UserProfile;
    workspaces?: WorkspaceItem[];
    selectedWorkspace?: WorkspaceItem;
  }) {
    const workspaces = data.workspaces || [];
    const selectedWorkspace = data.selectedWorkspace || workspaces[0] || null;

    apiClient.setToken(data.token);
    this.setState({
      token: data.token,
      user: data.user,
      workspaces,
      selectedWorkspace,
      isInitialized: true,
    });

    const userJson = JSON.stringify(data.user);
    const wsJson = JSON.stringify(workspaces);
    const selWsJson = JSON.stringify(selectedWorkspace);

    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, userJson),
        AsyncStorage.setItem(STORAGE_KEYS.WORKSPACES, wsJson),
        AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, selWsJson),
      ]);
    } catch {}

    setWebLocalStorage(STORAGE_KEYS.TOKEN, data.token);
    setWebLocalStorage(STORAGE_KEYS.USER, userJson);
    setWebLocalStorage(STORAGE_KEYS.WORKSPACES, wsJson);
    setWebLocalStorage(STORAGE_KEYS.SELECTED_WORKSPACE, selWsJson);
  }

  async setSelectedWorkspace(workspace: WorkspaceItem) {
    this.setState({ selectedWorkspace: workspace });
    const json = JSON.stringify(workspace);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, json);
    } catch {}
    setWebLocalStorage(STORAGE_KEYS.SELECTED_WORKSPACE, json);
  }

  async updateUser(updates: Partial<UserProfile>) {
    if (!this.state.user) return;
    const nextUser = { ...this.state.user, ...updates };
    this.setState({ user: nextUser });
    const json = JSON.stringify(nextUser);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, json);
    } catch {}
    setWebLocalStorage(STORAGE_KEYS.USER, json);
  }

  async clearAuth() {
    apiClient.setToken(null);
    this.state = {
      token: null,
      user: null,
      workspaces: [],
      selectedWorkspace: null,
      isInitialized: true,
    };
    this.notify();

    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.WORKSPACES),
        AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_WORKSPACE),
      ]);
    } catch {}

    removeWebLocalStorage(STORAGE_KEYS.TOKEN);
    removeWebLocalStorage(STORAGE_KEYS.USER);
    removeWebLocalStorage(STORAGE_KEYS.WORKSPACES);
    removeWebLocalStorage(STORAGE_KEYS.SELECTED_WORKSPACE);
  }

  async signOut(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore network errors during logout
    } finally {
      await this.clearAuth();
    }
  }

  async refreshUser(): Promise<void> {
    if (!this.state.token) return;
    try {
      const data: any = await apiClient.get('/auth/me');
      if (data && data.id) {
        const updatedUser: UserProfile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name || null,
          phone_number: data.phone_number || null,
          avatar_url: data.avatar_url || null,
          platform_role: data.platform_role || 'user',
          deletion_scheduled_at: data.deletion_scheduled_at || null,
        };
        let nextSelected = this.state.selectedWorkspace;
        if ((!nextSelected || String(nextSelected.id).startsWith('ws-')) && data.workspace_id) {
          nextSelected = {
            id: data.workspace_id,
            name: 'Workspace',
            role: data.platform_role || 'admin',
          };
          const selJson = JSON.stringify(nextSelected);
          await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, selJson).catch(() => {});
          setWebLocalStorage(STORAGE_KEYS.SELECTED_WORKSPACE, selJson);
        }
        this.setState({ user: updatedUser, selectedWorkspace: nextSelected });
        const userJson = JSON.stringify(updatedUser);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, userJson).catch(() => {});
        setWebLocalStorage(STORAGE_KEYS.USER, userJson);
        this.refreshWorkspaces().catch(() => {});
      }
    } catch {
      // 401 is handled globally via apiClient unauthorizedHandler; ignore offline errors
    }
  }

  async refreshWorkspaces(): Promise<void> {
    if (!this.state.token) return;
    try {
      const data: any = await apiClient.get('/auth/workspaces');
      const list: WorkspaceItem[] = Array.isArray(data) ? data : data?.workspaces || [];
      if (Array.isArray(list) && list.length > 0) {
        // Keep the user's single primary workspace active
        const primary = list[0];
        const nextSelected =
          this.state.selectedWorkspace &&
          list.some((w) => w.id === this.state.selectedWorkspace?.id)
            ? list.find((w) => w.id === this.state.selectedWorkspace?.id) || primary
            : primary;

        this.setState({ workspaces: list, selectedWorkspace: nextSelected });
        const listJson = JSON.stringify(list);
        const selJson = JSON.stringify(nextSelected);
        await AsyncStorage.setItem(STORAGE_KEYS.WORKSPACES, listJson).catch(() => {});
        await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, selJson).catch(() => {});
        setWebLocalStorage(STORAGE_KEYS.WORKSPACES, listJson);
        setWebLocalStorage(STORAGE_KEYS.SELECTED_WORKSPACE, selJson);
      }
    } catch {
      // Offline fallback
    }
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): AuthState => {
    return this.state;
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const authStore = new AuthStore();

export function useAuth(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot, authStore.getSnapshot);
}

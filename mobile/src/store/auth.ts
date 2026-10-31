import { useState, useEffect } from 'react';
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
    this.init();
  }

  private async init() {
    try {
      // 1. Try AsyncStorage (Native + Web)
      const [storedToken, storedUser, storedWorkspaces, storedSelectedWs] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.WORKSPACES),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_WORKSPACE),
        ]);

      let token = storedToken;
      let userStr = storedUser;
      let workspacesStr = storedWorkspaces;
      let selectedWsStr = storedSelectedWs;

      // 2. Fallback to localStorage on Web
      if (!token && typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem(STORAGE_KEYS.TOKEN);
        userStr = window.localStorage.getItem(STORAGE_KEYS.USER);
        workspacesStr = window.localStorage.getItem(STORAGE_KEYS.WORKSPACES);
        selectedWsStr = window.localStorage.getItem(STORAGE_KEYS.SELECTED_WORKSPACE);
      }

      if (token) {
        this.state.token = token;
        apiClient.setToken(token);
      }
      if (userStr) {
        try {
          this.state.user = JSON.parse(userStr);
        } catch {}
      }
      if (workspacesStr) {
        try {
          const ws = JSON.parse(workspacesStr);
          this.state.workspaces = ws;
          if (selectedWsStr) {
            try {
              this.state.selectedWorkspace = JSON.parse(selectedWsStr);
            } catch {
              this.state.selectedWorkspace = ws[0] || null;
            }
          } else {
            this.state.selectedWorkspace = ws[0] || null;
          }
        } catch {}
      }
    } catch {
      // Ignore reading errors
    } finally {
      this.state.isInitialized = true;
      this.notify();
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

    this.state.token = data.token;
    this.state.user = data.user;
    this.state.workspaces = workspaces;
    this.state.selectedWorkspace = selectedWorkspace;

    apiClient.setToken(data.token);

    // Save to AsyncStorage
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user)),
        AsyncStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces)),
        AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, JSON.stringify(selectedWorkspace)),
      ]);
    } catch {}

    // Also sync localStorage on Web
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
        window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        window.localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));
        window.localStorage.setItem(
          STORAGE_KEYS.SELECTED_WORKSPACE,
          JSON.stringify(selectedWorkspace)
        );
      } catch {}
    }

    this.notify();
  }

  async setSelectedWorkspace(workspace: WorkspaceItem) {
    this.state.selectedWorkspace = workspace;
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SELECTED_WORKSPACE,
        JSON.stringify(workspace)
      );
    } catch {}
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.SELECTED_WORKSPACE,
          JSON.stringify(workspace)
        );
      } catch {}
    }
    this.notify();
  }

  async updateUser(updates: Partial<UserProfile>) {
    if (!this.state.user) return;
    this.state.user = { ...this.state.user, ...updates };

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(this.state.user)
      );
    } catch {}

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.USER,
          JSON.stringify(this.state.user)
        );
      } catch {}
    }

    this.notify();
  }

  async clearAuth() {
    this.state = {
      token: null,
      user: null,
      workspaces: [],
      selectedWorkspace: null,
      isInitialized: true,
    };
    apiClient.setToken(null);

    // Clear from AsyncStorage
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.WORKSPACES),
        AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_WORKSPACE),
      ]);
    } catch {}

    // Clear from localStorage on Web
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
        window.localStorage.removeItem(STORAGE_KEYS.USER);
        window.localStorage.removeItem(STORAGE_KEYS.WORKSPACES);
        window.localStorage.removeItem(STORAGE_KEYS.SELECTED_WORKSPACE);
      } catch {}
    }

    this.notify();
  }

  /**
   * Signs out the user: calls backend logout endpoint to invalidate session,
   * then removes tokens and session data locally.
   */
  async signOut(): Promise<void> {
    try {
      // Invalidate on backend
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore network errors during logout
    } finally {
      // Clear local storage regardless of backend response
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
        this.state.user = updatedUser;
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        this.notify();
      }
    } catch {
      // Offline fallback
    }
  }

  async refreshWorkspaces(): Promise<void> {
    if (!this.state.token) return;
    try {
      const data: any = await apiClient.get('/auth/workspaces');
      if (Array.isArray(data)) {
        this.state.workspaces = data;
        await AsyncStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(data));
        if (!this.state.selectedWorkspace && data.length > 0) {
          this.state.selectedWorkspace = data[0];
          await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, JSON.stringify(data[0]));
        }
        this.notify();
      }
    } catch {
      // Offline fallback
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const authStore = new AuthStore();

/**
 * React hook to listen to AuthStore updates reactively.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(authStore.getState());

  useEffect(() => {
    setState(authStore.getState());
    const unsubscribe = authStore.subscribe(() => {
      setState({ ...authStore.getState() });
    });
    return unsubscribe;
  }, []);

  return state;
}

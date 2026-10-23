import { apiClient } from '../api/client';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  platform_role?: string;
  deletion_scheduled_at?: string | null;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  role: string;
  plan_type?: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  workspaces: WorkspaceItem[];
  selectedWorkspace: WorkspaceItem | null;
}

type Listener = () => void;

class AuthStore {
  private state: AuthState = {
    token: null,
    user: null,
    workspaces: [],
    selectedWorkspace: null,
  };

  private listeners: Set<Listener> = new Set();

  constructor() {
    // Check localStorage on Web if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedToken = window.localStorage.getItem('auth_token');
        const storedUser = window.localStorage.getItem('auth_user');
        const storedWorkspaces = window.localStorage.getItem('auth_workspaces');
        if (storedToken) {
          this.state.token = storedToken;
          apiClient.setToken(storedToken);
        }
        if (storedUser) {
          this.state.user = JSON.parse(storedUser);
        }
        if (storedWorkspaces) {
          const ws = JSON.parse(storedWorkspaces);
          this.state.workspaces = ws;
          this.state.selectedWorkspace = ws[0] || null;
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  getState(): AuthState {
    return this.state;
  }

  setAuth(data: { token: string; user: UserProfile; workspaces?: WorkspaceItem[] }) {
    this.state.token = data.token;
    this.state.user = data.user;
    this.state.workspaces = data.workspaces || [];
    this.state.selectedWorkspace = data.workspaces?.[0] || null;

    apiClient.setToken(data.token);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('auth_token', data.token);
        window.localStorage.setItem('auth_user', JSON.stringify(data.user));
        window.localStorage.setItem('auth_workspaces', JSON.stringify(data.workspaces || []));
      } catch {}
    }

    this.notify();
  }

  setSelectedWorkspace(workspace: WorkspaceItem) {
    this.state.selectedWorkspace = workspace;
    this.notify();
  }

  clearAuth() {
    this.state = {
      token: null,
      user: null,
      workspaces: [],
      selectedWorkspace: null,
    };
    apiClient.setToken(null);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('auth_token');
        window.localStorage.removeItem('auth_user');
        window.localStorage.removeItem('auth_workspaces');
      } catch {}
    }

    this.notify();
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

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getWsBaseUrl } from '../api/client';
import { useAuth } from '../store/auth';

export interface WorkspaceRealtimeEvent {
  event_type?: string;
  event?: string;
  type?: string;
  payload?: Record<string, any>;
  data?: Record<string, any>;
  [key: string]: any;
}

type EventListener = (event: WorkspaceRealtimeEvent) => void;

class WorkspaceRealtimeManager {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private subscribedConversations = new Map<string, number>();
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private currentWorkspaceId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manualClose = false;

  addListener(listener: EventListener, conversationId?: string): () => void {
    this.listeners.add(listener);
    if (conversationId) {
      const nextCount = (this.subscribedConversations.get(conversationId) || 0) + 1;
      this.subscribedConversations.set(conversationId, nextCount);
      if (nextCount === 1) {
        this.sendSubscribe(conversationId);
      }
    }

    return () => {
      this.listeners.delete(listener);
      if (conversationId) {
        const count = (this.subscribedConversations.get(conversationId) || 1) - 1;
        if (count <= 0) {
          this.subscribedConversations.delete(conversationId);
          this.sendUnsubscribe(conversationId);
        } else {
          this.subscribedConversations.set(conversationId, count);
        }
      }
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  ensureConnected(userId: string | null, token: string | null, workspaceId: string | null) {
    if (!userId || !token || !workspaceId) {
      this.disconnect();
      return;
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) &&
      this.currentUserId === userId &&
      this.currentToken === token &&
      this.currentWorkspaceId === workspaceId
    ) {
      return;
    }

    this.disconnect();
    this.currentUserId = userId;
    this.currentToken = token;
    this.currentWorkspaceId = workspaceId;
    this.manualClose = false;
    this.connect();
  }

  private connect() {
    if (!this.currentUserId || !this.currentToken || !this.currentWorkspaceId || this.listeners.size === 0) {
      return;
    }
    const base = getWsBaseUrl();
    const url = `${base}/ws/${encodeURIComponent(this.currentUserId)}?token=${encodeURIComponent(this.currentToken)}&workspace_id=${encodeURIComponent(this.currentWorkspaceId)}`;

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectAttempt = 0;
        this.subscribedConversations.forEach((_count, convId) => {
          this.sendSubscribe(convId);
        });
      };

      socket.onmessage = (evt) => {
        try {
          const parsed: WorkspaceRealtimeEvent = JSON.parse(evt.data);
          const evName = parsed.event_type || parsed.event || parsed.type;
          if (evName === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          this.listeners.forEach((fn) => fn(parsed));
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onerror = () => {
        // Closed via onclose handler
      };

      socket.onclose = (closeEvt) => {
        if (this.ws === socket) {
          this.ws = null;
        }
        // Code 4001/4003 means unauthorized or workspace access revoked
        if (this.manualClose || closeEvt.code === 4001 || closeEvt.code === 4003) {
          return;
        }
        if (this.listeners.size > 0 && this.currentToken) {
          const delayMs = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 20000);
          this.reconnectAttempt += 1;
          this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
        }
      };
    } catch {
      // Fallback safely to periodic refresh
    }
  }

  private sendSubscribe(conversationId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'subscribe_conversation', conversation_id: conversationId }));
      } catch {}
    }
  }

  private sendUnsubscribe(conversationId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'unsubscribe_conversation', conversation_id: conversationId }));
      } catch {}
    }
  }

  disconnect() {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.currentUserId = null;
    this.currentToken = null;
    this.currentWorkspaceId = null;
  }
}

const realtimeManager = new WorkspaceRealtimeManager();

export function useWorkspaceRealtime(
  onEvent: (event: WorkspaceRealtimeEvent) => void,
  options?: { conversationId?: string }
) {
  const auth = useAuth();
  const callbackRef = useRef(onEvent);
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  const userId = auth.user?.id || null;
  const token = auth.token || null;
  const workspaceId =
    (auth.selectedWorkspace?.id && !auth.selectedWorkspace.id.startsWith('ws-')
      ? auth.selectedWorkspace.id
      : auth.workspaces.find((w) => !w.id.startsWith('ws-'))?.id) || null;
  const conversationId = options?.conversationId;

  useEffect(() => {
    if (!userId || !token || !workspaceId) return;

    const removeListener = realtimeManager.addListener((evt) => {
      callbackRef.current(evt);
    }, conversationId);

    realtimeManager.ensureConnected(userId, token, workspaceId);

    const appSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        realtimeManager.ensureConnected(userId, token, workspaceId);
      }
    });

    return () => {
      appSub.remove();
      removeListener();
    };
  }, [userId, token, workspaceId, conversationId]);
}

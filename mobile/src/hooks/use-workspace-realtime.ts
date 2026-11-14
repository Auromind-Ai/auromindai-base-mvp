import { useEffect, useRef } from 'react';
import { getWsBaseUrl } from '@/api/client';
import { useAuth } from '@/store/auth';

export interface WorkspaceRealtimeEvent {
  event_type?: string;
  event?: string;
  type?: string;
  payload?: Record<string, any>;
  data?: Record<string, any>;
  conversation_id?: string;
  [key: string]: any;
}

export interface UseWorkspaceRealtimeOptions {
  conversationId?: string;
  enabled?: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Subscribe to workspace and optional conversation WebSocket events with
 * automatic heartbeat pong replies and exponential-backoff reconnection.
 */
export function useWorkspaceRealtime(
  onEvent: (event: WorkspaceRealtimeEvent) => void,
  options?: UseWorkspaceRealtimeOptions
): void {
  const authState = useAuth();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const conversationId = options?.conversationId;
  const enabled = options?.enabled ?? true;

  const socketRef = useRef<WebSocket | null>(null);
  const activeConversationIdRef = useRef<string | undefined>(conversationId);

  const userId = authState.user?.id || '';
  const token = authState.token || '';
  const workspaceId =
    authState.selectedWorkspace?.id && !authState.selectedWorkspace.id.startsWith('ws-')
      ? authState.selectedWorkspace.id
      : authState.workspaces.find((w) => w?.id && !w.id.startsWith('ws-'))?.id || '';

  useEffect(() => {
    const prevConversationId = activeConversationIdRef.current;
    activeConversationIdRef.current = conversationId;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (prevConversationId && prevConversationId !== conversationId) {
      socket.send(
        JSON.stringify({
          type: 'unsubscribe_conversation',
          conversation_id: prevConversationId,
        })
      );
    }

    if (conversationId && conversationId !== prevConversationId) {
      socket.send(
        JSON.stringify({
          type: 'subscribe_conversation',
          conversation_id: conversationId,
        })
      );
    }
  }, [conversationId]);

  useEffect(() => {
    if (!enabled || !userId || !token || !workspaceId) {
      return;
    }

    const wsBase = getWsBaseUrl();
    if (!wsBase) {
      return;
    }

    let intentionalClose = false;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (intentionalClose) return;

      const query = new URLSearchParams({
        token,
        workspace_id: workspaceId,
      }).toString();
      const wsUrl = `${wsBase}/ws/${encodeURIComponent(userId)}?${query}`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts = 0;
        const targetConvId = activeConversationIdRef.current;
        if (targetConvId) {
          socket.send(
            JSON.stringify({
              type: 'subscribe_conversation',
              conversation_id: targetConvId,
            })
          );
        }
      };

      socket.onmessage = (messageEvent) => {
        let parsed: WorkspaceRealtimeEvent;
        try {
          parsed = JSON.parse(String(messageEvent.data));
        } catch {
          return;
        }

        if (!parsed || typeof parsed !== 'object') {
          return;
        }

        const eventName = parsed.event_type || parsed.event || parsed.type;
        if (eventName === 'ping') {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'pong' }));
          }
          return;
        }

        onEventRef.current(parsed);
      };

      socket.onerror = () => {
        // Reconnection is handled in onclose
      };

      socket.onclose = (closeEvent) => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        if (intentionalClose) {
          return;
        }

        // 4001/4003 indicate authentication or workspace authorization failures
        if (closeEvent?.code === 4001 || closeEvent?.code === 4003) {
          return;
        }

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          return;
        }

        reconnectAttempts += 1;
        const delay = Math.min(
          BASE_RECONNECT_DELAY_MS * 2 ** (reconnectAttempts - 1),
          MAX_RECONNECT_DELAY_MS
        );
        const jitter = Math.floor(Math.random() * 500);

        clearReconnectTimer();
        reconnectTimer = setTimeout(connect, delay + jitter);
      };
    };

    connect();

    return () => {
      intentionalClose = true;
      clearReconnectTimer();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close(1000, 'hook unmount');
      }
    };
  }, [enabled, userId, token, workspaceId]);
}

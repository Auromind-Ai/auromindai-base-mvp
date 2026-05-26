"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getToken } from "@/lib/auth";

const RealtimeContext = createContext(null);

const SOCKET_STATES = {
  idle: "idle",
  connecting: "connecting",
  connected: "connected",
  disconnected: "disconnected",
  reconnecting: "reconnecting",
  auth_error: "auth_error",
  failed: "failed",
};

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const STALE_SOCKET_MS = 120000;

function resolveWebSocketBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const source = explicit || apiBase;

  if (source) {
    return source
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:")
      .replace(/\/$/, "");
  }

  if (typeof window === "undefined") return "";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

function buildWebSocketUrl(userId, token) {
  const baseUrl = resolveWebSocketBaseUrl();
  if (!baseUrl || !userId || !token) return null;

  return `${baseUrl}/ws/${encodeURIComponent(userId)}?token=${encodeURIComponent(token)}`;
}

export function RealtimeProvider({ user, workspace, children }) {
  const socketRef = useRef(null);
  const connectRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const handlersRef = useRef(new Set());
  const conversationSubscriptionsRef = useRef(new Set());
  const lastMessageAtRef = useRef(0);

  const [status, setStatus] = useState(SOCKET_STATES.idle);
  const [lastEvent, setLastEvent] = useState(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sendJson = useCallback((payload) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const notifyHandlers = useCallback((event) => {
    setLastEvent(event);
    handlersRef.current.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("Realtime event handler failed:", error);
      }
    });
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (intentionalCloseRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus(SOCKET_STATES.disconnected);
      return;
    }

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setStatus(SOCKET_STATES.failed);
      return;
    }

    const attempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempt;

    const backoff = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** (attempt - 1),
      MAX_RECONNECT_DELAY_MS,
    );
    const jitter = Math.floor(Math.random() * 500);

    setStatus(SOCKET_STATES.reconnecting);
    clearReconnectTimer();
    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current?.();
    }, backoff + jitter);
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    const userId = user?.id;
    const token = getToken();
    const url = buildWebSocketUrl(userId, token);

    if (!url) {
      setStatus(SOCKET_STATES.idle);
      return;
    }

    const existing = socketRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.CONNECTING ||
        existing.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    intentionalCloseRef.current = false;
    clearReconnectTimer();
    setStatus(SOCKET_STATES.connecting);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      lastMessageAtRef.current = Date.now();
      setStatus(SOCKET_STATES.connected);

      conversationSubscriptionsRef.current.forEach((conversationId) => {
        sendJson({
          type: "subscribe_conversation",
          conversation_id: conversationId,
        });
      });
    };

    socket.onmessage = (message) => {
      lastMessageAtRef.current = Date.now();

      let event;
      try {
        event = JSON.parse(message.data);
      } catch (error) {
        console.warn("Ignoring malformed realtime message:", error);
        return;
      }

      if (!event || typeof event.event_type !== "string") {
        console.warn("Ignoring realtime message without event_type:", event);
        return;
      }

      if (event.event_type === "ping") {
        sendJson({ type: "pong" });
        return;
      }

      notifyHandlers(event);
    };

    socket.onerror = () => {
      setStatus(SOCKET_STATES.disconnected);
    };

    socket.onclose = (event) => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (intentionalCloseRef.current) {
        setStatus(SOCKET_STATES.idle);
        return;
      }

      if (event.code === 4001 || event.code === 4003) {
        setStatus(SOCKET_STATES.auth_error);
        return;
      }

      setStatus(SOCKET_STATES.disconnected);
      scheduleReconnect();
    };
  }, [clearReconnectTimer, notifyHandlers, scheduleReconnect, sendJson, user?.id]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnectTimer();

    const socket = socketRef.current;
    socketRef.current = null;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close(1000, "client disconnect");
    }

    setStatus(SOCKET_STATES.idle);
  }, [clearReconnectTimer]);

  const subscribe = useCallback((handler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  const subscribeConversation = useCallback((conversationId) => {
    if (!conversationId) return;

    conversationSubscriptionsRef.current.add(conversationId);
    sendJson({
      type: "subscribe_conversation",
      conversation_id: conversationId,
    });
  }, [sendJson]);

  const unsubscribeConversation = useCallback((conversationId) => {
    if (!conversationId) return;

    conversationSubscriptionsRef.current.delete(conversationId);
    sendJson({
      type: "unsubscribe_conversation",
      conversation_id: conversationId,
    });
  }, [sendJson]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user?.id) {
        disconnect();
        return;
      }

      connect();
    }, 0);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect, user?.id, workspace?.id]);

  useEffect(() => {
    const handleOnline = () => {
      reconnectAttemptsRef.current = 0;
      connect();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const socket = socketRef.current;
      const socketIsOpen = socket && socket.readyState === WebSocket.OPEN;
      const isStale =
        lastMessageAtRef.current &&
        Date.now() - lastMessageAtRef.current > STALE_SOCKET_MS;

      if (!socketIsOpen || isStale) {
        if (socket) socket.close(4000, "stale socket");
        connect();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connect]);

  const value = useMemo(() => ({
    status,
    lastEvent,
    sendJson,
    subscribe,
    subscribeConversation,
    unsubscribeConversation,
  }), [
    status,
    lastEvent,
    sendJson,
    subscribe,
    subscribeConversation,
    unsubscribeConversation,
  ]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const value = useContext(RealtimeContext);
  if (!value) {
    return {
      status: SOCKET_STATES.idle,
      lastEvent: null,
      sendJson: () => false,
      subscribe: () => () => {},
      subscribeConversation: () => {},
      unsubscribeConversation: () => {},
    };
  }
  return value;
}

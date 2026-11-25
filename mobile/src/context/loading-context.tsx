import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LoadingState } from '../components/common/SquareMorphLoader';

export interface ShowLoadingOptions {
  message?: string;
  sublabel?: string;
  cancelable?: boolean;
  onCancel?: () => void;
  timeoutMs?: number;
  /** Bypass the 300ms debounce and show immediately (ideal for explicit button actions like Logout) */
  immediate?: boolean;
  /** Custom minimum duration to hold loader visible in ms */
  minDisplayMs?: number;
}

export interface HideLoadingOptions {
  status?: 'success' | 'error' | 'dismissed';
  message?: string;
  sublabel?: string;
}

export interface LoadingContextState {
  isVisible: boolean;
  state: LoadingState;
  message?: string;
  sublabel?: string;
  canCancel: boolean;
  show: (options?: ShowLoadingOptions) => void;
  hide: (options?: HideLoadingOptions) => void;
  cancel: () => void;
}

type LoadingListener = (state: {
  isVisible: boolean;
  state: LoadingState;
  message?: string;
  sublabel?: string;
  canCancel: boolean;
}) => void;

// Timing constants based on UX specifications
const SHOW_DELAY_MS = 300;     // 300ms debounce: fast calls won't flash
const MIN_DISPLAY_MS = 600;    // 600ms min-display: once shown, no micro-glitches
const DEFAULT_TIMEOUT_MS = 20000; // 20s safety timeout to prevent app freeze
const CANCEL_APPEAR_MS = 4000; // After 4s of waiting, allow user cancellation

/**
 * Decoupled event manager so API clients (outside React tree) can trigger loading cleanly.
 */
class GlobalLoadingManager {
  private activeCount = 0;
  private listeners: Set<LoadingListener> = new Set();
  private isVisible = false;
  private state: LoadingState = 'idle';
  private message?: string;
  private sublabel?: string;
  private canCancel = false;

  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private minDisplayTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelTimer: ReturnType<typeof setTimeout> | null = null;
  private shownTimestamp = 0;
  private minDisplayDuration = MIN_DISPLAY_MS;
  private onCancelCallback?: () => void;

  subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener);
    listener({
      isVisible: this.isVisible,
      state: this.state,
      message: this.message,
      sublabel: this.sublabel,
      canCancel: this.canCancel,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => {
      listener({
        isVisible: this.isVisible,
        state: this.state,
        message: this.message,
        sublabel: this.sublabel,
        canCancel: this.canCancel,
      });
    });
  }

  show(options: ShowLoadingOptions = {}) {
    this.activeCount++;
    this.message = options.message || 'Processing...';
    this.sublabel = options.sublabel;
    this.onCancelCallback = options.onCancel;
    this.minDisplayDuration = options.minDisplayMs ?? MIN_DISPLAY_MS;

    // Clear existing show timer if any
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    const startVisible = () => {
      this.isVisible = true;
      this.state = 'loading';
      this.shownTimestamp = Date.now();
      this.canCancel = false;
      this.emit();

      // Show cancel button after 4 seconds of waiting if cancelable
      if (options.cancelable !== false) {
        this.cancelTimer = setTimeout(() => {
          if (this.isVisible && this.state === 'loading') {
            this.canCancel = true;
            this.emit();
          }
        }, CANCEL_APPEAR_MS);
      }

      // Safety timeout (20s)
      const timeoutLimit = options.timeoutMs || DEFAULT_TIMEOUT_MS;
      this.timeoutTimer = setTimeout(() => {
        if (this.isVisible) {
          this.state = 'error';
          this.message = 'Request timed out';
          this.sublabel = 'Please check your connection and try again';
          this.emit();

          setTimeout(() => {
            this.forceHide();
          }, 1800);
        }
      }, timeoutLimit);
    };

    // If already visible, just update message
    if (this.isVisible) {
      this.state = 'loading';
      this.emit();
      return;
    }

    // If immediate is requested (explicit user actions like Logout, Workspace switch)
    if (options.immediate) {
      startVisible();
    } else {
      // 300ms debounce for API calls
      this.showTimer = setTimeout(() => {
        startVisible();
      }, SHOW_DELAY_MS);
    }
  }

  hide(options: HideLoadingOptions = {}) {
    this.activeCount = Math.max(0, this.activeCount - 1);

    if (this.activeCount > 0) {
      return; // Still waiting for other concurrent calls
    }

    // If showTimer was running and hasn't fired yet, cancel it completely (request finished within debounce)
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    if (!this.isVisible) {
      this.resetState();
      return;
    }

    // If visible, guarantee minDisplayDuration to prevent visual jumps
    const elapsed = Date.now() - this.shownTimestamp;
    const remainingTime = Math.max(0, this.minDisplayDuration - elapsed);

    if (this.minDisplayTimer) {
      clearTimeout(this.minDisplayTimer);
    }

    this.minDisplayTimer = setTimeout(() => {
      if (options.status === 'success' || options.status === 'error') {
        this.state = options.status;
        if (options.message) this.message = options.message;
        if (options.sublabel) this.sublabel = options.sublabel;
        this.emit();

        setTimeout(() => {
          this.forceHide();
        }, 1200);
      } else {
        this.forceHide();
      }
    }, remainingTime);
  }

  cancel() {
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
    this.forceHide();
  }

  private forceHide() {
    this.cleanupTimers();
    this.state = 'dismissed';
    this.emit();

    setTimeout(() => {
      this.resetState();
    }, 250);
  }

  private resetState() {
    this.cleanupTimers();
    this.activeCount = 0;
    this.isVisible = false;
    this.state = 'idle';
    this.message = undefined;
    this.sublabel = undefined;
    this.canCancel = false;
    this.onCancelCallback = undefined;
    this.emit();
  }

  private cleanupTimers() {
    if (this.showTimer) clearTimeout(this.showTimer);
    if (this.minDisplayTimer) clearTimeout(this.minDisplayTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    if (this.cancelTimer) clearTimeout(this.cancelTimer);
    this.showTimer = null;
    this.minDisplayTimer = null;
    this.timeoutTimer = null;
    this.cancelTimer = null;
  }
}

export const loadingManager = new GlobalLoadingManager();

const LoadingContext = createContext<LoadingContextState | null>(null);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<{
    isVisible: boolean;
    state: LoadingState;
    message?: string;
    sublabel?: string;
    canCancel: boolean;
  }>({
    isVisible: false,
    state: 'idle' as LoadingState,
    message: undefined,
    sublabel: undefined,
    canCancel: false,
  });

  useEffect(() => {
    const unsubscribe = loadingManager.subscribe((next) => {
      setLoadingState(next);
    });
    return unsubscribe;
  }, []);

  const show = useCallback((options?: ShowLoadingOptions) => {
    loadingManager.show(options);
  }, []);

  const hide = useCallback((options?: HideLoadingOptions) => {
    loadingManager.hide(options);
  }, []);

  const cancel = useCallback(() => {
    loadingManager.cancel();
  }, []);

  const value: LoadingContextState = {
    isVisible: loadingState.isVisible,
    state: loadingState.state,
    message: loadingState.message,
    sublabel: loadingState.sublabel,
    canCancel: loadingState.canCancel,
    show,
    hide,
    cancel,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export function useGlobalLoading(): LoadingContextState {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    return {
      isVisible: false,
      state: 'idle',
      canCancel: false,
      show: (opt) => loadingManager.show(opt),
      hide: (opt) => loadingManager.hide(opt),
      cancel: () => loadingManager.cancel(),
    };
  }
  return ctx;
}

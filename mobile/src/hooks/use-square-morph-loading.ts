import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadingState } from '../components/common/SquareMorphLoader';

export interface UseSquareMorphLoadingOptions {
  initialState?: LoadingState;
  initialLabel?: string;
  initialSublabel?: string;
  autoDismissDelay?: number;
}

export interface RunAsyncOptions<T = unknown> {
  loadingMessage?: string;
  loadingSublabel?: string;
  successMessage?: string;
  successSublabel?: string;
  errorMessage?: string;
  errorSublabel?: string;
  autoDismiss?: boolean;
  onSuccess?: (result: T) => void;
  onError?: (error: unknown) => void;
}

export function useSquareMorphLoading(options: UseSquareMorphLoadingOptions = {}) {
  const {
    initialState = 'idle',
    initialLabel,
    initialSublabel,
    autoDismissDelay = 1600,
  } = options;

  const [state, setState] = useState<LoadingState>(initialState);
  const [label, setLabel] = useState<string | undefined>(initialLabel);
  const [sublabel, setSublabel] = useState<string | undefined>(initialSublabel);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const startLoading = useCallback((newLabel?: string, newSublabel?: string) => {
    clearTimer();
    if (newLabel !== undefined) setLabel(newLabel);
    if (newSublabel !== undefined) setSublabel(newSublabel);
    setState('loading');
  }, [clearTimer]);

  const showSuccess = useCallback(
    (newLabel?: string, newSublabel?: string, autoDismiss = true) => {
      clearTimer();
      if (newLabel !== undefined) setLabel(newLabel);
      if (newSublabel !== undefined) setSublabel(newSublabel);
      setState('success');

      if (autoDismiss && autoDismissDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          setState('dismissed');
        }, autoDismissDelay);
      }
    },
    [autoDismissDelay, clearTimer]
  );

  const showError = useCallback(
    (newLabel?: string, newSublabel?: string, autoDismiss = true) => {
      clearTimer();
      if (newLabel !== undefined) setLabel(newLabel);
      if (newSublabel !== undefined) setSublabel(newSublabel);
      setState('error');

      if (autoDismiss && autoDismissDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          setState('dismissed');
        }, autoDismissDelay);
      }
    },
    [autoDismissDelay, clearTimer]
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setState('dismissed');
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState('idle');
    setLabel(initialLabel);
    setSublabel(initialSublabel);
  }, [clearTimer, initialLabel, initialSublabel]);

  /**
   * Automatically orchestrates loading -> success or error around an async operation.
   */
  const runAsync = useCallback(
    async <T>(
      promise: Promise<T> | (() => Promise<T>),
      asyncOptions: RunAsyncOptions<T> = {}
    ): Promise<T> => {
      const {
        loadingMessage = 'Loading...',
        loadingSublabel,
        successMessage = 'Completed!',
        successSublabel,
        errorMessage = 'Something went wrong',
        errorSublabel,
        autoDismiss = true,
        onSuccess,
        onError,
      } = asyncOptions;

      startLoading(loadingMessage, loadingSublabel);

      try {
        const executor = typeof promise === 'function' ? promise() : promise;
        const result = await executor;
        showSuccess(successMessage, successSublabel, autoDismiss);
        onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const customErr =
          typeof err === 'object' && err !== null && 'message' in err
            ? (err as { message: string }).message
            : errorMessage;
        showError(customErr || errorMessage, errorSublabel, autoDismiss);
        onError?.(err);
        throw err;
      }
    },
    [startLoading, showSuccess, showError]
  );

  return {
    state,
    setState,
    label,
    setLabel,
    sublabel,
    setSublabel,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle',
    isDismissed: state === 'dismissed',
    startLoading,
    showSuccess,
    showError,
    dismiss,
    reset,
    runAsync,
  };
}

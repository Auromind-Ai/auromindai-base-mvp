import { useEffect, useState, useRef, useCallback } from 'react';

export function useTurnstile() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const widgetIdRef = useRef(null);
  const containerRef = useRef(null);
  const resolveCallbackRef = useRef(null);
  const rejectCallbackRef = useRef(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const siteKeyMissing = !siteKey;

  // Function to load the Turnstile script dynamically
  const loadScript = useCallback(() => {
    if (typeof window === 'undefined') return Promise.reject(new Error('Window undefined'));

    if (window.turnstile) {
      return Promise.resolve(window.turnstile);
    }

    // Check if script is already injected in the DOM
    const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (existingScript) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            resolve(window.turnstile);
          }
        }, 100);
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.turnstile) {
          resolve(window.turnstile);
        } else {
          reject(new Error('Turnstile script loaded but window.turnstile not found'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Turnstile script'));
      document.body.appendChild(script);
    });
  }, []);

  // Initialize/render the Turnstile widget
  const initWidget = useCallback(async () => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    try {
      if (siteKeyMissing) {
        console.error('[Turnstile] Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY env variable.');
        setError('Verification config error');
        return;
      }

      const turnstile = await loadScript();

      if (widgetIdRef.current) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore
        }
      }

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: 'invisible',
        execution: 'render', // Wait for manual execution
        callback: (newToken) => {
          setToken(newToken);
          setLoading(false);
          if (resolveCallbackRef.current) {
            resolveCallbackRef.current(newToken);
            resolveCallbackRef.current = null;
            rejectCallbackRef.current = null;
          }
        },
        'error-callback': (err) => {
          console.error('[Turnstile] Error resolving challenge:', err);
          setError('Verification failed');
          setLoading(false);
          setToken(null);
          if (rejectCallbackRef.current) {
            rejectCallbackRef.current(new Error('Verification failed'));
            resolveCallbackRef.current = null;
            rejectCallbackRef.current = null;
          }
          // Reset widget so it can be retried on next user click
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
        'expired-callback': () => {
          console.warn('[Turnstile] Token expired, resetting for a fresh challenge');
          setToken(null);
          setLoading(false);
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        }
      });
    } catch (err) {
      console.error('[Turnstile] Initialization failed:', err);
      setError('Failed to initialize verification');
    }
  }, [loadScript, siteKey, siteKeyMissing]);

  // Execute verification on-demand. Returns a promise resolving to the token string
  const execute = useCallback(() => {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Not running in browser'));
    }

    if (siteKeyMissing) {
      return Promise.reject(new Error('Turnstile configuration sitekey is missing'));
    }

    if (!window.turnstile || !widgetIdRef.current) {
      return Promise.reject(new Error('Turnstile is not initialized'));
    }

    setLoading(true);
    setError(null);
    setToken(null);

    return new Promise((resolve, reject) => {
      resolveCallbackRef.current = resolve;
      rejectCallbackRef.current = reject;

      try {
        window.turnstile.execute(widgetIdRef.current);
      } catch (err) {
        console.error('[Turnstile] Execution failed:', err);
        setLoading(false);
        setError('Verification execution failed');
        reject(err);
      }
    });
  }, [siteKeyMissing]);

  // Clean up Turnstile instances on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  return {
    containerRef,
    token,
    loading,
    error,
    siteKeyMissing,
    execute,
    initWidget,
  };
}

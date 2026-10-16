'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export function useWhatsAppConnection({ workspaceId, onSuccess, onError } = {}) {
  const { showToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID || '990851527207522';
  const WA_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || '2100178990543175';

  // Ensure Facebook SDK is properly loaded and initialized
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.FB) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      if (window.FB) {
        window.FB.init({
          appId: FB_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0',
        });
        setIsSdkLoaded(true);
      }
    };

    const scriptId = 'facebook-jssdk';
    if (!document.getElementById(scriptId)) {
      const js = document.createElement('script');
      js.id = scriptId;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      js.async = true;
      js.defer = true;
      js.crossOrigin = 'anonymous';
      js.onload = () => {
        if (window.FB) {
          setIsSdkLoaded(true);
        }
      };
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(js, firstScript);
      } else {
        document.head.appendChild(js);
      }
    } else if (window.FB) {
      setIsSdkLoaded(true);
    }
  }, [FB_APP_ID]);

  // Listen for Meta embedded signup postMessage events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (e) => {
      if (e.origin !== 'https://www.facebook.com') return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'CANCEL') {
            setIsConnecting(false);
            showToast('WhatsApp setup was cancelled.', 'warning');
          } else if (data.event === 'ERROR') {
            setIsConnecting(false);
            const errMsg = data?.data?.error_message || data?.error?.message || 'WhatsApp signup encountered an error.';
            showToast(errMsg, 'error');
            if (onError) onError(new Error(errMsg));
          }
        }
      } catch (_) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showToast, onError]);

  const connectWhatsAppToBackend = useCallback(async (payload) => {
    try {
      const activeWs = workspaceId || (typeof window !== 'undefined' ? localStorage.getItem('workspace_id') : null);
      const data = await api.connectWhatsApp({
        ...payload,
        app_id: FB_APP_ID,
        workspace_id: activeWs,
      });

      if (data?.status === 'connected') {
        const phone = data.phone_number || data.display_number || 'Connected';
        const phoneId = data.phone_number_id || '';
        const wabaId = data.waba_id || '';
        const businessId = data.business_id || '';

        if (typeof window !== 'undefined') {
          localStorage.setItem('whatsapp_connected', 'true');
          if (phone) localStorage.setItem('whatsapp_phone', phone);
          if (phoneId) localStorage.setItem('whatsapp_phone_id', phoneId);
          if (wabaId) localStorage.setItem('whatsapp_waba_id', wabaId);
          if (businessId) localStorage.setItem('whatsapp_business_id', businessId);

          window.dispatchEvent(new CustomEvent('channel-status-changed'));
          window.dispatchEvent(new CustomEvent('onboarding-status-changed'));
        }

        showToast(`WhatsApp connected successfully: ${phone}`, 'success');
        if (onSuccess) onSuccess(data);
        return data;
      } else {
        const msg = data?.message || data?.detail || 'Failed to connect WhatsApp account.';
        showToast(msg, 'error');
        if (onError) onError(new Error(msg));
        return null;
      }
    } catch (err) {
      console.error('WhatsApp connect error:', err);
      const errorMsg =
        err?.data?.detail ||
        err?.detail ||
        err?.message ||
        'Failed to connect WhatsApp account. Please try again.';
      showToast(errorMsg, 'error');
      if (onError) onError(err);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [workspaceId, FB_APP_ID, showToast, onSuccess, onError]);

  const startWhatsAppSignup = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!window.FB) {
      showToast(
        'Facebook SDK is loading or blocked. If you are using an adblocker or private browsing mode, please disable tracking protection and try again.',
        'warning'
      );
      return;
    }

    setIsConnecting(true);

    try {
      window.FB.login(
        (response) => {
          if (response?.authResponse?.code) {
            connectWhatsAppToBackend({ code: response.authResponse.code });
          } else {
            setIsConnecting(false);
            if (response?.status === 'not_authorized') {
              showToast('WhatsApp authorization was not granted.', 'warning');
            }
          }
        },
        {
          config_id: WA_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            feature: 'whatsapp_embedded_signup',
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
            coex: true,
            version: 'v4',
            setup: {},
          },
        }
      );
    } catch (err) {
      console.error('Error invoking FB.login:', err);
      setIsConnecting(false);
      showToast('Could not open Meta Login. Please verify popup permissions.', 'error');
    }
  }, [WA_CONFIG_ID, connectWhatsAppToBackend, showToast]);

  return {
    isConnecting,
    isSdkLoaded,
    startWhatsAppSignup,
    connectWhatsAppToBackend,
  };
}

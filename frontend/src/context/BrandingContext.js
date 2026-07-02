'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const BrandingContext = createContext({
  appName: 'Orbionagents',
  appLogoUrl: '/images/orbionagents-logo.jpg',
  refreshBranding: async () => {},
});

export const BrandingProvider = ({ children }) => {
  const [appName, setAppName] = useState('Orbionagents');
  const [appLogoUrl, setAppLogoUrl] = useState('/images/orbionagents-logo.jpg');

  const refreshBranding = useCallback(async () => {
    try {
      const data = await api.getPublicBranding();
      if (data?.app_name) {
        setAppName(data.app_name);
      }
      if (data?.app_logo_url) {
        setAppLogoUrl(data.app_logo_url);
      }
    } catch (err) {
      console.error('Failed to load branding settings:', err);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ appName, appLogoUrl, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);

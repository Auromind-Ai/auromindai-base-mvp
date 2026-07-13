'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const CACHE_KEY = 'branding_cache';

/** Read cached branding synchronously from sessionStorage (safe on client only). */
function readCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Persist branding to sessionStorage so subsequent navigations are instant. */
function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota / private-mode errors
  }
}

const cached = readCache();

const BrandingContext = createContext({
  appName: cached?.appName || 'Orbionagents',
  appLogoUrl: cached?.appLogoUrl || '',
  refreshBranding: async () => {},
});

export const BrandingProvider = ({ children }) => {
  // Initialise from cache so first render already has the right values — no flash
  const [appName, setAppName] = useState(cached?.appName || 'Orbionagents');
  const [appLogoUrl, setAppLogoUrl] = useState(cached?.appLogoUrl || '');

  const refreshBranding = useCallback(async (force = false) => {
    // Skip the network call if we already have cached data and no force-refresh
    if (!force && readCache()) return;

    try {
      const data = await api.getPublicBranding();
      const nextName = data?.app_name || 'Orbionagents';
      const nextLogo = data?.app_logo_url || '';

      setAppName(nextName);
      setAppLogoUrl(nextLogo);
      writeCache({ appName: nextName, appLogoUrl: nextLogo });
    } catch (err) {
      console.error('Failed to load branding settings:', err);
    }
  }, []);

  // Fetch once on first mount; subsequent page navigations skip the call
  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  // Update browser favicon whenever the logo URL changes
  useEffect(() => {
    if (!appLogoUrl) return;

    const updateFavicons = (url) => {
      const iconLinks = document.querySelectorAll("link[rel*='icon']");
      if (iconLinks.length > 0) {
        iconLinks.forEach((link) => { link.href = url; });
      } else {
        const link = document.createElement('link');
        link.rel = 'shortcut icon';
        link.href = url;
        document.head.appendChild(link);
      }
    };

    // Load logo, auto-crop transparent edges, wrap in styled dark background
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { updateFavicons(appLogoUrl); return; }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, hasContent = false;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] > 10) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
              hasContent = true;
            }
          }
        }

        if (!hasContent) { updateFavicons(appLogoUrl); return; }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        const size = 32;
        const favCanvas = document.createElement('canvas');
        favCanvas.width = size;
        favCanvas.height = size;
        const favCtx = favCanvas.getContext('2d');
        if (!favCtx) { updateFavicons(appLogoUrl); return; }

        const radius = 6;
        favCtx.fillStyle = '#080810';
        favCtx.beginPath();
        favCtx.moveTo(radius, 0);
        favCtx.lineTo(size - radius, 0);
        favCtx.quadraticCurveTo(size, 0, size, radius);
        favCtx.lineTo(size, size - radius);
        favCtx.quadraticCurveTo(size, size, size - radius, size);
        favCtx.lineTo(radius, size);
        favCtx.quadraticCurveTo(0, size, 0, size - radius);
        favCtx.lineTo(0, radius);
        favCtx.quadraticCurveTo(0, 0, radius, 0);
        favCtx.closePath();
        favCtx.fill();

        favCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        favCtx.lineWidth = 1;
        favCtx.stroke();

        const padding = 6;
        const innerSize = size - padding;
        const maxDim = Math.max(width, height);
        const scale = innerSize / maxDim;
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const dx = (size - drawWidth) / 2;
        const dy = (size - drawHeight) / 2;

        favCtx.drawImage(img, minX, minY, width, height, dx, dy, drawWidth, drawHeight);
        updateFavicons(favCanvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Failed to crop/scale logo for favicon:', err);
        updateFavicons(appLogoUrl);
      }
    };
    img.onerror = () => updateFavicons(appLogoUrl);
    img.src = appLogoUrl;
  }, [appLogoUrl]);

  return (
    <BrandingContext.Provider value={{ appName, appLogoUrl, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);

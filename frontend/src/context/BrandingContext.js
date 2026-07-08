'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const BrandingContext = createContext({
  appName: 'Orbionagents',
  appLogoUrl: '',
  refreshBranding: async () => {},
});

export const BrandingProvider = ({ children }) => {
  const [appName, setAppName] = useState('Orbionagents');
  const [appLogoUrl, setAppLogoUrl] = useState('');

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

  useEffect(() => {
    if (appLogoUrl) {
      const updateFavicons = (url) => {
        // Find existing icon link elements
        const iconLinks = document.querySelectorAll("link[rel*='icon']");
        if (iconLinks.length > 0) {
          iconLinks.forEach((link) => {
            link.href = url;
          });
        } else {
          // If no icon link elements exist, create a default shortcut icon
          const link = document.createElement('link');
          link.rel = 'shortcut icon';
          link.href = url;
          document.head.appendChild(link);
        }
      };

      // Load logo, auto-crop transparent edges, and wrap in a styled white background container
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            updateFavicons(appLogoUrl);
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Bounding box of non-transparent content
          let minX = canvas.width;
          let minY = canvas.height;
          let maxX = 0;
          let maxY = 0;
          let hasContent = false;

          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const alpha = data[(y * canvas.width + x) * 4 + 3];
              if (alpha > 10) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                hasContent = true;
              }
            }
          }

          if (!hasContent) {
            updateFavicons(appLogoUrl);
            return;
          }

          const width = maxX - minX + 1;
          const height = maxY - minY + 1;

          // Create standard 32x32 square favicon canvas
          const size = 32;
          const favCanvas = document.createElement('canvas');
          favCanvas.width = size;
          favCanvas.height = size;
          const favCtx = favCanvas.getContext('2d');
          if (!favCtx) {
            updateFavicons(appLogoUrl);
            return;
          }

          // Draw rounded rectangle dark background
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

          // Stroke border around the background card
          favCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          favCtx.lineWidth = 1;
          favCtx.stroke();

          // Fit the cropped logo into the inner area with padding
          const padding = 6;
          const innerSize = size - padding;
          const maxDim = Math.max(width, height);
          const scale = innerSize / maxDim;
          const drawWidth = width * scale;
          const drawHeight = height * scale;
          const dx = (size - drawWidth) / 2;
          const dy = (size - drawHeight) / 2;

          favCtx.drawImage(
            img,
            minX, minY, width, height, // Source region
            dx, dy, drawWidth, drawHeight // Target region
          );

          updateFavicons(favCanvas.toDataURL('image/png'));
        } catch (err) {
          console.warn('Failed to dynamically crop/scale logo for favicon:', err);
          updateFavicons(appLogoUrl);
        }
      };

      img.onerror = () => {
        updateFavicons(appLogoUrl);
      };

      img.src = appLogoUrl;
    }
  }, [appLogoUrl]);

  return (
    <BrandingContext.Provider value={{ appName, appLogoUrl, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);

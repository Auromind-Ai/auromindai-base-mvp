"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBranding } from "@/context/BrandingContext";

/**
 * 12-Spoke Radial Purple Spinner
 * Exactly matching the classic iOS/macOS spoke loader from reference image,
 * styled in a sleek, vibrant purple with progressive trailing opacity and smooth 360° spin.
 */
export function PurpleSpokeSpinner({ size = 52, className = "" }) {
  // 12 spokes arranged radially (30° apart)
  // Opacities create a smooth trailing head-to-tail motion blur as it spins clockwise
  const spokes = [
    { angle: 0, opacity: 1.0, fill: "#e9d5ff" },    // Leading head (brightest lavender-purple)
    { angle: 30, opacity: 0.16, fill: "#a855f7" },  // Faintest tail end
    { angle: 60, opacity: 0.23, fill: "#a855f7" },
    { angle: 90, opacity: 0.31, fill: "#a855f7" },
    { angle: 120, opacity: 0.40, fill: "#a855f7" },
    { angle: 150, opacity: 0.49, fill: "#a855f7" },
    { angle: 180, opacity: 0.58, fill: "#a855f7" },
    { angle: 210, opacity: 0.67, fill: "#a855f7" },
    { angle: 240, opacity: 0.76, fill: "#a855f7" },
    { angle: 270, opacity: 0.85, fill: "#c084fc" },
    { angle: 300, opacity: 0.92, fill: "#c084fc" },
    { angle: 330, opacity: 0.97, fill: "#d8b4fe" },
  ];

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      {/* Soft Ambient Purple Glow */}
      <div
        className="absolute inset-0 rounded-full bg-purple-500/25 blur-xl pointer-events-none"
        style={{ transform: "scale(1.25)" }}
      />

      {/* Smooth 360° Continuously Rotating Spoke Wheel */}
      <motion.div
        className="w-full h-full flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      >
        <svg
          viewBox="0 0 48 48"
          className="w-full h-full overflow-visible drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {spokes.map(({ angle, opacity, fill }) => (
            <rect
              key={angle}
              x="22.1"
              y="4"
              width="3.8"
              height="10.8"
              rx="1.9"
              fill={fill}
              opacity={opacity}
              transform={`rotate(${angle} 24 24)`}
            />
          ))}
        </svg>
      </motion.div>
    </div>
  );
}

// Alias for backwards compatibility across existing components
export const RazorpaySpinner = PurpleSpokeSpinner;

/**
 * Preloader Overlay / Screen Component
 * Renders the 12-spoke purple spinner with subtle backdrop and branding text
 */
export default function Preloader({
  text = null,
  fullScreen = true,
  autoDismissMs = null,
  size = 56,
  className = "",
  show = true,
  onDismiss = null,
}) {
  const [visible, setVisible] = useState(show);
  const { appName } = useBranding();

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (autoDismissMs === null || autoDismissMs === undefined) return;
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const content = (
    <div className="flex flex-col items-center justify-center gap-5">
      <PurpleSpokeSpinner size={size} />

      {/* Label / Branding */}
      <motion.div
        className="flex flex-col items-center gap-1.5"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
      >
        {text ? (
          <span className="text-[12.5px] font-medium tracking-wide text-purple-200/85">
            {text}
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px] uppercase tracking-[0.24em] font-medium">
              {appName || "Orbion"}
            </span>
            <span className="text-purple-400 text-[11px] uppercase tracking-[0.24em] font-bold">
              AI
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );

  if (!fullScreen) {
    if (!visible) return null;
    return (
      <div
        className={`w-full h-full min-h-[220px] flex items-center justify-center bg-[#0d0e17] ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed inset-0 z-[120] flex items-center justify-center bg-[#07080f]/92 backdrop-blur-xl ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}


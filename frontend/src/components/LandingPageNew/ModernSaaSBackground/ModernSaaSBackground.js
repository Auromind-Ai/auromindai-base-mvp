'use client';

// ─── Fix 3: Pure CSS animations ──────────────────────────────────────────────
// Before: Framer Motion useScroll + useTransform ran JS on every scroll tick
// to compute parallax Y for two 1000px blurred divs. This forced the browser
// to re-composite massive blur layers every frame → GPU meltdown on mobile.
//
// After: CSS @keyframes handle the slow pulse. will-change:transform promotes
// each blob to its own GPU layer so the compositor can animate without
// involving the main thread. Scroll-based parallax removed (invisible anyway
// behind 200px blur).
// ─────────────────────────────────────────────────────────────────────────────

const ModernSaaSBackground = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#0B0B0B] overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#121212] to-[#181818]" />

      {/* Purple glow blob — top-right */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-purple-600 blur-[200px] rounded-full saas-blob-1"
        style={{ willChange: 'transform, opacity' }}
      />

      {/* Purple glow blob — bottom-left */}
      <div
        className="absolute bottom-[-10%] left-[-20%] w-[900px] h-[900px] bg-purple-900 blur-[180px] rounded-full saas-blob-2"
        style={{ willChange: 'transform, opacity' }}
      />

      <div className="absolute inset-0 tech-grid opacity-30" />
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/[0.02] blur-[250px] rounded-full" />

      {/* CSS keyframe animations — replaces Framer Motion JS-driven animation */}
      <style jsx>{`
        @keyframes saasBlobPulse1 {
          0%, 100% { transform: scale(1);   opacity: 0.03; }
          50%      { transform: scale(1.2); opacity: 0.05; }
        }
        @keyframes saasBlobPulse2 {
          0%, 100% { transform: scale(1);   opacity: 0.02; }
          50%      { transform: scale(1.3); opacity: 0.04; }
        }
        .saas-blob-1 {
          animation: saasBlobPulse1 20s linear infinite;
        }
        .saas-blob-2 {
          animation: saasBlobPulse2 25s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ModernSaaSBackground;
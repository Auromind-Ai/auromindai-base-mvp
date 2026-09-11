"use client";

import React, { useEffect, useState, useMemo } from "react";

const THEME_CONFIG = {
  lead: {
    primary: "#A855F7",
    secondary: "#C084FC",
    glow: "rgba(168, 85, 247, 0.85)",
    baseWire: "rgba(168, 85, 247, 0.28)",
    pulseStart: "#ffffff",
    pulseMid: "#c084fc",
    pulseEnd: "#a855f7",
    dotHalo: "rgba(168, 85, 247, 0.4)",
    bgGradStart: "#6730e6",
    bgGradEnd: "#221253",
    borderHighlight: "rgba(156, 117, 255, 0.35)",
  },
  sales: {
    primary: "#9353D3",
    secondary: "#A855F7",
    glow: "rgba(147, 83, 211, 0.85)",
    baseWire: "rgba(147, 83, 211, 0.28)",
    pulseStart: "#ffffff",
    pulseMid: "#c084fc",
    pulseEnd: "#814AC8",
    dotHalo: "rgba(147, 83, 211, 0.4)",
    bgGradStart: "#6730e6",
    bgGradEnd: "#221253",
    borderHighlight: "rgba(156, 117, 255, 0.35)",
  },
  support: {
    primary: "#9353D3",
    secondary: "#A855F7",
    glow: "rgba(147, 83, 211, 0.85)",
    baseWire: "rgba(147, 83, 211, 0.28)",
    pulseStart: "#ffffff",
    pulseMid: "#c084fc",
    pulseEnd: "#814AC8",
    dotHalo: "rgba(147, 83, 211, 0.4)",
    bgGradStart: "#6730e6",
    bgGradEnd: "#221253",
    borderHighlight: "rgba(156, 117, 255, 0.35)",
  },
};

export default function AgentWireFlow({
  containerRef,
  leftCardsContainerRef,
  centerAgentRef,
  featureCardRefs,
  selectedAgentKey = "sales",
}) {
  const [coords, setCoords] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const theme = THEME_CONFIG[selectedAgentKey] || THEME_CONFIG.sales;

  // Measure dynamic layout positions
  useEffect(() => {
    const measureCoords = () => {
      if (!containerRef?.current) return;

      // Responsive check: Only render in desktop horizontal layout (lg: >= 1024px)
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setIsVisible(false);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      if (containerRect.width < 300 || containerRect.height < 200) {
        setIsVisible(false);
        return;
      }

      // 1. Measure Fixed Center Anchor from Left Cards Selection Container
      let leftSourceX = null;
      if (leftCardsContainerRef?.current) {
        const leftRect = leftCardsContainerRef.current.getBoundingClientRect();
        leftSourceX = leftRect.right - containerRect.left;
      }

      // 2. Measure Feature Cards (5 cards) and sort strictly by vertical Y position
      const featureCards = (featureCardRefs?.current || [])
        .map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            left: r.left - containerRect.left,
            right: r.right - containerRect.left,
            top: r.top - containerRect.top,
            bottom: r.bottom - containerRect.top,
            width: r.width,
            height: r.height,
            centerY: r.top + r.height / 2 - containerRect.top,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.centerY - b.centerY);

      // 3. Measure Center Agent Area
      let agentCenterX = null;
      let agentLeftX = null;
      let agentRightX = null;

      if (centerAgentRef?.current) {
        const ar = centerAgentRef.current.getBoundingClientRect();
        agentCenterX = ar.left + ar.width / 2 - containerRect.left;
        agentLeftX = ar.left + ar.width * 0.16 - containerRect.left;
        agentRightX = ar.right - ar.width * 0.16 - containerRect.left;
      }

      if (featureCards.length === 5 && agentCenterX && leftSourceX) {
        const yCenter = featureCards[2].centerY;
        const branchX = agentRightX + (featureCards[2].left - agentRightX) * 0.38;

        setCoords({
          width: containerRect.width,
          height: containerRect.height,
          yCenter,
          leftSource: { x: leftSourceX, y: yCenter },
          agentLeft: { x: agentLeftX, y: yCenter },
          agentCenter: { x: agentCenterX, y: yCenter },
          agentRight: { x: agentRightX, y: yCenter },
          branchPoint: { x: branchX, y: yCenter },
          featureCards,
        });
        setIsVisible(true);
      }
    };

    let animLoopId;
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const trackLoop = (currentTime) => {
      measureCoords();
      if (currentTime - startTime < 450) {
        animLoopId = requestAnimationFrame(trackLoop);
      }
    };
    animLoopId = requestAnimationFrame(trackLoop);

    let resizeObserver;
  
    if (containerRef?.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(measureCoords);
      });
      resizeObserver.observe(containerRef.current);
    }

    const handleResize = () => {
      requestAnimationFrame(measureCoords);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animLoopId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [containerRef, leftCardsContainerRef, centerAgentRef, featureCardRefs, selectedAgentKey]);

  // Compute SVG Paths for Base Wires and Full Continuous Parallel Energy Flow with Perimeter Trace
  const paths = useMemo(() => {
    if (!coords) return null;

    const {
      leftSource,
      agentLeft,
      agentRight,
      branchPoint,
      featureCards,
      yCenter,
    } = coords;

    const { x: lx, y: ly } = leftSource;
    const { x: alx } = agentLeft;
    const { x: arx } = agentRight;
    const { x: bx, y: by } = branchPoint;

    const cornerRadius = 14;
    const cardRadius = 12;

    // 1. Left Base Static Wire (Selected Agent -> Center AI Agent)
    const leftWirePath = `M ${lx} ${ly} L ${alx} ${ly}`;

    // 2. Right Base Static Trunk (Center AI Agent -> Branch Point)
    const baseTrunkPath = `M ${arx} ${yCenter} L ${bx} ${by}`;

    // 3. Right Base Static Branches (Branch Point -> 5 Feature Cards)
    const baseBranchPaths = featureCards.map((card) => {
      const dy = card.centerY - by;
      if (Math.abs(dy) < 4) {
        return `M ${bx} ${by} L ${card.left} ${card.centerY}`;
      }
      const r = Math.min(cornerRadius, Math.abs(dy) / 2);
      if (dy < 0) {
        return `M ${bx} ${by} L ${bx} ${card.centerY + r} Q ${bx} ${card.centerY} ${bx + r} ${card.centerY} L ${card.left} ${card.centerY}`;
      } else {
        return `M ${bx} ${by} L ${bx} ${card.centerY - r} Q ${bx} ${card.centerY} ${bx + r} ${card.centerY} L ${card.left} ${card.centerY}`;
      }
    });

    // 4. Five Full Continuous Paths with Card Surrounding / Perimeter Trace:
    // Left Selected Agent -> Center AI Agent -> Trunk -> Branch Point -> Feature Card -> Clockwise Perimeter Trace
    const fullParallelPaths = featureCards.map((card) => {
      const dy = card.centerY - by;
      const r = Math.min(cornerRadius, Math.abs(dy) / 2 || cornerRadius);
      const { left, right, top, bottom, centerY } = card;
      const cr = Math.min(cardRadius, (bottom - top) / 2);

      let branchSegment = "";
      if (Math.abs(dy) < 4) {
        branchSegment = `L ${left} ${centerY}`;
      } else if (dy < 0) {
        branchSegment = `L ${bx} ${centerY + r} Q ${bx} ${centerY} ${bx + r} ${centerY} L ${left} ${centerY}`;
      } else {
        branchSegment = `L ${bx} ${centerY - r} Q ${bx} ${centerY} ${bx + r} ${centerY} L ${left} ${centerY}`;
      }

      // Perimeter trace: smoothly sweeps clockwise around top, right, bottom, and left surrounding of the card
      const perimeterSegment = `L ${left} ${top + cr} Q ${left} ${top} ${left + cr} ${top} L ${right - cr} ${top} Q ${right} ${top} ${right} ${top + cr} L ${right} ${bottom - cr} Q ${right} ${bottom} ${right - cr} ${bottom} L ${left + cr} ${bottom} Q ${left} ${bottom} ${left} ${bottom - cr} L ${left} ${centerY}`;

      return `M ${lx} ${ly} L ${alx} ${ly} L ${arx} ${ly} L ${bx} ${by} ${branchSegment} ${perimeterSegment}`;
    });

    return {
      leftWire: leftWirePath,
      leftSource,
      agentLeft,
      agentRight,
      baseTrunk: baseTrunkPath,
      baseBranches: baseBranchPaths,
      parallelFlows: fullParallelPaths,
    };
  }, [coords]);

  if (!isVisible || !coords || !paths) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-visible hidden lg:block select-none"
      aria-hidden="true"
    >
      <svg
        width={coords.width}
        height={coords.height}
        viewBox={`0 0 ${coords.width} ${coords.height}`}
        className="w-full h-full overflow-visible"
      >
        <style>{`
          @keyframes continuousEnergyWave {
            0% {
              stroke-dashoffset: 1950;
              opacity: 0;
            }
            3% {
              opacity: 1;
            }
            28% {
              stroke-dashoffset: 1400;
              opacity: 1;
            }
            82% {
              stroke-dashoffset: 0;
              opacity: 1;
            }
            90% {
              stroke-dashoffset: -30;
              opacity: 0;
            }
            100% {
              stroke-dashoffset: -30;
              opacity: 0;
            }
          }

          .continuous-energy-sparkle {
            animation: continuousEnergyWave 4.8s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
          }
        `}</style>

        <defs>
          {/* Subtle Wire Glow Filter */}
          <filter
            id={`wire-glow-${selectedAgentKey}`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense Sparkle / Node Glow Filter */}
          <filter
            id={`sparkle-glow-${selectedAgentKey}`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Linear Gradient for Sparkle Flow (White Leading Core -> Glowing Purple/Violet Tail) */}
          <linearGradient
            id={`sparkle-grad-${selectedAgentKey}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor={theme.pulseStart} stopOpacity="1" />
            <stop offset="35%" stopColor={theme.pulseMid} stopOpacity="0.95" />
            <stop offset="85%" stopColor={theme.pulseEnd} stopOpacity="0.4" />
            <stop offset="100%" stopColor={theme.pulseEnd} stopOpacity="0" />
          </linearGradient>

          {/* Linear Gradient for Top Tabs Signature Background Highlight (Matching "Omni inbox, AI Agents, Automations") */}
          <linearGradient
            id={`top-tab-active-bg-${selectedAgentKey}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#6730e6" stopOpacity="0.48" />
            <stop offset="50%" stopColor="#3d1c8c" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#221253" stopOpacity="0.20" />
          </linearGradient>

          {/* Radial Gradient for Glowing Endpoint Halos */}
          <radialGradient id={`dot-halo-${selectedAgentKey}`}>
            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.85" />
            <stop offset="45%" stopColor={theme.primary} stopOpacity="0.3" />
            <stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ========================================================================= */}
        {/* 1. CENTER AGENT CONCENTRIC ORBIT RINGS (Futuristic SaaS Visual)           */}
        {/* ========================================================================= */}
        <g className="transition-all duration-500">
          <circle
            cx={coords.agentCenter.x}
            cy={coords.agentCenter.y}
            r={102}
            fill="none"
            stroke={theme.primary}
            strokeWidth="1"
            strokeDasharray="4 6"
            className="opacity-35"
          />
          <circle
            cx={coords.agentCenter.x}
            cy={coords.agentCenter.y}
            r={132}
            fill="none"
            stroke={theme.primary}
            strokeWidth="1"
            strokeOpacity="0.22"
          />
          <circle
            cx={coords.agentCenter.x}
            cy={coords.agentCenter.y}
            r={164}
            fill="none"
            stroke={theme.primary}
            strokeWidth="1"
            strokeDasharray="3 14"
            strokeOpacity="0.16"
          />
        </g>

        {/* ========================================================================= */}
        {/* 2. BASE WIRE STRUCTURE (Left Card -> Center Agent -> Right Feature Cards) */}
        {/* ========================================================================= */}
        <g className="transition-colors duration-500">
          {/* Left Base Horizontal Line */}
          <path
            d={paths.leftWire}
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.8"
            strokeOpacity="0.35"
          />

          {/* Right Main Horizontal Base Trunk */}
          <path
            d={paths.baseTrunk}
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.8"
            strokeOpacity="0.35"
          />

          {/* 5 Feature Branch Base Lines */}
          {paths.baseBranches.map((p, idx) => (
            <path
              key={`base-branch-${idx}`}
              d={p}
              fill="none"
              stroke={theme.primary}
              strokeWidth="1.4"
              strokeOpacity="0.25"
            />
          ))}

          {/* Glowing Node Dot on Selected Agent Card Right Edge */}
          <circle
            cx={paths.leftSource.x}
            cy={paths.leftSource.y}
            r={7}
            fill={`url(#dot-halo-${selectedAgentKey})`}
            className="animate-pulse"
            style={{ animationDuration: "2.4s" }}
          />
          <circle
            cx={paths.leftSource.x}
            cy={paths.leftSource.y}
            r={2.8}
            fill="#ffffff"
            stroke={theme.primary}
            strokeWidth="1.2"
            filter={`url(#sparkle-glow-${selectedAgentKey})`}
          />

          {/* Center Agent Left Connection Node */}
          <circle
            cx={paths.agentLeft.x}
            cy={paths.agentLeft.y}
            r={6}
            fill={`url(#dot-halo-${selectedAgentKey})`}
            className="opacity-70"
          />

          {/* Center Agent Right Outflow Node */}
          <circle
            cx={paths.agentRight.x}
            cy={paths.agentRight.y}
            r={7.5}
            fill={`url(#dot-halo-${selectedAgentKey})`}
            className="animate-pulse"
            style={{ animationDuration: "2.4s" }}
          />
          <circle
            cx={paths.agentRight.x}
            cy={paths.agentRight.y}
            r={3}
            fill="#ffffff"
            stroke={theme.primary}
            strokeWidth="1.2"
            filter={`url(#sparkle-glow-${selectedAgentKey})`}
          />

          {/* Branch Point Node Dot */}
          <circle
            cx={coords.branchPoint.x}
            cy={coords.branchPoint.y}
            r={8}
            fill={`url(#dot-halo-${selectedAgentKey})`}
          />
          <circle
            cx={coords.branchPoint.x}
            cy={coords.branchPoint.y}
            r={3.2}
            fill="#ffffff"
            stroke={theme.primary}
            strokeWidth="1.4"
            filter={`url(#sparkle-glow-${selectedAgentKey})`}
          />

          {/* 5 Feature Connection Endpoint Nodes on Left Edge of Cards */}
          {coords.featureCards.map((feat, idx) => (
            <g key={`feat-dot-${idx}`}>
              <circle
                cx={feat.left}
                cy={feat.centerY}
                r={7}
                fill={`url(#dot-halo-${selectedAgentKey})`}
                className="animate-pulse"
                style={{ animationDuration: "2.4s" }}
              />
              <circle
                cx={feat.left}
                cy={feat.centerY}
                r={2.8}
                fill="#ffffff"
                stroke={theme.primary}
                strokeWidth="1.2"
                filter={`url(#sparkle-glow-${selectedAgentKey})`}
              />
            </g>
          ))}
        </g>

        {/* ========================================================================= */}
        {/* 3. CONTINUOUS ENERGY WAVE & CARDS PERIMETER SWEEP                         */}
        {/*    (Left Selected Agent -> Center Agent -> 5 Cards Surrounding Trace)    */}
        {/* ========================================================================= */}
        <g className="transition-colors duration-500">
          {paths.parallelFlows.map((flowPath, idx) => (
            <path
              key={`continuous-sparkle-${idx}`}
              d={flowPath}
              fill="none"
              stroke={`url(#sparkle-grad-${selectedAgentKey})`}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="95 1900"
              className="continuous-energy-sparkle"
              filter={`url(#sparkle-glow-${selectedAgentKey})`}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

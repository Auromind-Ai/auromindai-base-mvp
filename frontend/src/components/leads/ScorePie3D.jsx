"use client";

import { useId, useState } from "react";

const point = (angle) => [Math.cos(angle) * 150, Math.sin(angle) * 100];

function slicePath(start, end) {
  const [x1, y1] = point(start);
  const [x2, y2] = point(end);
  if (end - start >= Math.PI * 2 - 0.000001) {
    return "M 150 0 A 150 100 0 1 1 -150 0 A 150 100 0 1 1 150 0 Z";
  }
  return `M 0 0 L ${x1} ${y1} A 150 100 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
}

export default function ScorePie3D({ items, colors }) {
  const id = useId().replaceAll(":", "");
  const [active, setActive] = useState(null);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const nonzero = items.filter((item) => item.count > 0).length;
  const slices = items.flatMap((item, index) => {
    if (item.count <= 0) return [];
    const preceding = items
      .slice(0, index)
      .reduce((sum, row) => sum + row.count, 0);
    const start = -Math.PI / 2 + (preceding / total) * Math.PI * 2;
    const angle = start + (item.count / total) * Math.PI * 2;
    const middle = (start + angle) / 2;
    return [
      {
        ...item,
        index,
        middle,
        path: slicePath(start, angle),
        x: nonzero > 1 ? Math.cos(middle) * 8 : 0,
        y: nonzero > 1 ? Math.sin(middle) * 6 : 0,
      },
    ];
  });
  const selected = slices.find((slice) => slice.index === active);
  // Use the same SVG coordinates as the lifted slice, including on resize.
  const tooltipX = selected ? Math.max(8, Math.min(238,
    210 + selected.x + Math.cos(selected.middle) * 95 - 87)) : 0;
  const tooltipY = selected ? Math.max(8, Math.min(236,
    139 + selected.y - 12 + Math.sin(selected.middle) * 62 - 62)) : 0;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 420 300"
        className="w-full h-64 overflow-visible"
        role="group"
        aria-label="3D score distribution pie chart"
      >
        <defs>
          <radialGradient id={`${id}-shadow`}>
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          {colors.map((color, index) => (
            <linearGradient
              key={color}
              id={`${id}-top-${index}`}
              x1="0"
              y1="0"
              x2="0.7"
              y2="1"
            >
              <stop offset="0" stopColor={color} />
              <stop offset="1" stopColor={color} stopOpacity="0.78" />
            </linearGradient>
          ))}
        </defs>
        <ellipse
          cx="210"
          cy="181"
          rx="184"
          ry="110"
          fill={`url(#${id}-shadow)`}
        />
        {/* Stacked elliptical slices form the shaded, extruded sides. */}
        {Array.from({ length: 24 }, (_, layer) => 24 - layer).map((depth) => (
          <g key={depth} aria-hidden="true" pointerEvents="none">
            {slices.map((slice) => (
              <g
                key={slice.index}
                transform={`translate(${210 + slice.x} ${139 + slice.y + depth})`}
              >
                <g
                  className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${active === slice.index ? "-translate-y-3" : "translate-y-0"}`}
                >
                  <path
                    d={slice.path}
                    fill={colors[slice.index % colors.length]}
                  />
                  <path
                    d={slice.path}
                    fill="#000"
                    fillOpacity={0.27 + depth / 100}
                  />
                </g>
              </g>
            ))}
          </g>
        ))}
        {slices.map((slice) => {
          const description = `${slice.label}: ${slice.count.toLocaleString()} leads (${((slice.count / total) * 100).toFixed(1)}%)`;
          return (
            <g
              key={slice.index}
              transform={`translate(${210 + slice.x} ${139 + slice.y})`}
              tabIndex={0}
              role="img"
              aria-label={description}
              className="outline-none cursor-pointer"
              onMouseEnter={() => setActive(slice.index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(slice.index)}
              onBlur={() => setActive(null)}
            >
              {/* Keep the hit area stationary so lifting never causes hover flicker. */}
              <path d={slice.path} fill="transparent" pointerEvents="all" />
              <path
                d={slice.path}
                pointerEvents="none"
                className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${active === slice.index ? "-translate-y-3" : "translate-y-0"}`}
                fill={`url(#${id}-top-${slice.index % colors.length})`}
                stroke={
                  active === slice.index
                    ? "#fff"
                    : colors[slice.index % colors.length]
                }
                strokeWidth={active === slice.index ? 2 : 1}
              />
            </g>
          );
        })}
        {selected && (
          <g role="tooltip" pointerEvents="none" transform={`translate(${tooltipX} ${tooltipY})`}>
            <rect width="174" height="52" rx="10" fill="#191225" stroke="#8b5cf6" strokeOpacity="0.5" />
            <text x="87" y="20" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">{selected.label}</text>
            <text x="87" y="39" textAnchor="middle" fill="#ddd6fe" fontSize="12">
              {selected.count.toLocaleString()} leads ? {((selected.count / total) * 100).toFixed(1)}%
            </text>
          </g>
        )}
      </svg>
      <p
        aria-live="polite"
        className="min-h-5 text-center text-xs text-zinc-300"
      >
        {selected
          ? `${selected.label}: ${selected.count.toLocaleString()} leads (${((selected.count / total) * 100).toFixed(1)}%)`
          : `${total.toLocaleString()} leads · Hover or focus a slice for details`}
      </p>
    </div>
  );
}

"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import ScorePie3D from "./ScorePie3D";

const colors = ["#8b5cf6", "#38bdf8", "#34d399", "#fbbf24", "#fb7185"];
const conversionColors = ["#654BCC", "#224382", "#824926", "#1A755A"];
const bgColors = [
  "bg-[#8b5cf6]",
  "bg-[#38bdf8]",
  "bg-[#34d399]",
  "bg-[#fbbf24]",
  "bg-[#fb7185]",
];

const tooltipStyle = {
  backgroundColor: "#191225",
  border: "1px solid #49345f",
  borderRadius: 12,
  color: "#fff",
};
const axisStyle = { fill: "#a1a1aa", fontSize: 12 };

function ChartValues({ items }) {
  return (
    <ul className="sr-only">
      {items.map((item) => (
        <li key={item.label}>
          {item.label}: {item.count} leads
        </li>
      ))}
    </ul>
  );
}

export function ScorePieChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <div aria-label="Score distribution pie chart">
      {total > 0 ? (
        <ScorePie3D items={items} colors={colors} />
      ) : (
        <p className="h-64 flex items-center justify-center text-sm text-zinc-400">
          No leads in this period.
        </p>
      )}
      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-300 mt-3">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${bgColors[index % bgColors.length]}`}
            />
            {item.label}:{" "}
            <span className="text-white font-medium">
              {item.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LeadBarChart({ items, horizontal = false }) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  const dynamicHeight = Math.max(300, items.length * 40);

  return (
    <div
      aria-label={
        horizontal
          ? "Buying intent bar chart"
          : "Conversion overview column chart"
      }
    >
      <ChartValues items={items} />
      {!items.length ? (
        <p className="py-12 text-sm text-zinc-400">No data in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className={horizontal ? "w-full min-w-[460px]" : "w-full min-w-[320px]"}>
            <ResponsiveContainer width="100%" height={horizontal ? dynamicHeight : 290}>
              <BarChart
                data={items}
                layout={horizontal ? "vertical" : "horizontal"}
                margin={{ top: 24, right: 40, bottom: 8, left: 0 }}
                barCategoryGap={horizontal ? "30%" : "22%"}
              >
                <CartesianGrid
                  stroke="#ffffff10"
                  horizontal={!horizontal}
                  vertical={horizontal}
                />
                <XAxis
                  type={horizontal ? "number" : "category"}
                  dataKey={horizontal ? undefined : "label"}
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={{ stroke: "#ffffff20" }}
                  allowDecimals={false}
                  domain={horizontal ? [0, maximum] : undefined}
                  interval={0}
                />
                <YAxis
                  type={horizontal ? "category" : "number"}
                  dataKey={horizontal ? "label" : undefined}
                  width={horizontal ? 155 : 40}
                  tick={axisStyle}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={horizontal ? undefined : [0, maximum]}
                  interval={0}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#fff" }}
                  cursor={{ fill: "rgba(255, 255, 255, 0.08)" }}
                  formatter={(value) => [value, "Leads"]}
                />
                <Bar
                  dataKey="count"
                  name="Leads"
                  fill="#8b5cf6"
                  maxBarSize={horizontal ? undefined : 80}
                  radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  {!horizontal && items.map((item, index) => (
                    <Cell
                      key={item.label}
                      fill={conversionColors[index % conversionColors.length]}
                      className="transition-all duration-200 hover:brightness-125 cursor-pointer"
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position={horizontal ? "right" : "top"}
                    fill="#d4d4d8"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

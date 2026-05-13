"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const BoxesCore = ({ className = "" }) => {
  const rows = new Array(150).fill(1);
  const cols = new Array(100).fill(1);

  const colors = [
    "rgb(79 70 229)",   // indigo
    "rgb(99 102 241)",  // indigo-500
    "rgb(139 92 246)",  // violet
    "rgb(168 85 247)",  // purple
    "rgb(217 70 239)",  // fuchsia
    "rgb(59 130 246)",  // blue
  ];

  const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div
      style={{
        transform:
          "translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675)",
      }}
      className={cn(
        "pointer-events-auto absolute left-1/2 top-1/2 flex h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 opacity-100",
        className
      )}
    >
           {rows.map((_, i) => (
        <motion.div
          key={`row-${i}`}
          className="relative h-8 w-16 border-l border-indigo-400/15"
        >
          {cols.map((_, j) => {
            const id = `${i}-${j}`;
            const hoverColor = colors[(i + j) % colors.length];

            return (
              <div
                key={id}
                className="relative h-8 w-16 border-r border-t border-indigo-400/15"
                style={{
                  backgroundColor: "transparent",
                  boxShadow: "0 0 0px transparent",
                  transition:
                    "background-color 0s linear, box-shadow 0.28s ease-out",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transition =
                    "background-color 0s linear, box-shadow 0s linear";
                  e.currentTarget.style.backgroundColor = hoverColor;
                  e.currentTarget.style.boxShadow = `0 0 24px ${hoverColor}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transition =
                    "background-color 0.28s ease-out, box-shadow 0.28s ease-out";
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.boxShadow = "0 0 0px transparent";
                }}
              >
              {j % 2 === 0 && i % 2 === 0 ? (
                <div className="pointer-events-none absolute -left-[22px] -top-[14px] h-6 w-10 text-white/[0.08]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1"
                    stroke="currentColor"
                    className="h-6 w-10"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m6-6H6"
                    />
                  </svg>
                </div>
              ) : null}
            </div>
          );
          })}
        </motion.div>
      ))}
    </div>
  );
};

const Boxes = memo(BoxesCore);

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#050816] px-6 py-24 md:px-10 lg:px-16">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10" />

      <div className="absolute inset-0 z-0">
        <Boxes />

        
      </div>

      <div className="pointer-events-none relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-5 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 backdrop-blur-sm"
        >
          Limited Access Available
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl"
        >
          Start Closing more
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            {" "}Sales Today.
          </span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <button className="pointer-events-auto group inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-sm font-medium text-slate-950 transition hover:scale-[1.02] hover:bg-slate-100">
            Get Started For Free
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <button className="pointer-events-auto rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-medium text-white backdrop-blur-sm transition hover:border-violet-400/40 hover:bg-white/10">
            Book a Demooo
          </button>
        </motion.div>
      </div>
    </section>
  );
}
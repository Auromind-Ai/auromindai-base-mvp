"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import Scene from "./Scene";

const R3FCanvas = dynamic(() => import("./R3FCanvasWrapper"), {
  ssr: false,
});

export default function Hero() {
  const isActiveRef = useRef(false);

  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      
      // ADD THESE EVENTS (CRITICAL)
      onMouseEnter={() => (isActiveRef.current = true)}
      onMouseLeave={() => (isActiveRef.current = false)}
    >
      
      {/* BACKGROUND CANVAS */}
      <R3FCanvas>
        {/* PASS REF HERE */}
        <Scene isActiveRef={isActiveRef} />
      </R3FCanvas>

      {/* TEXT OVERLAY */}
      <div className="absolute inset-0 pointer-events-none">
  <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">

    {/* LEFT CONTENT */}
    <div className="max-w-2xl pointer-events-auto">
      
      <h1 className="
          text-black 
          font-black 
          tracking-tight 
          leading-[0.9] 
          text-[clamp(3rem,8vw,6.5rem)]
        ">
        Make the <br />
        out <br />
        of  single <br />
        <span className="text-purple-500">conversation.</span>
      </h1>

      <p className="
        mt-10
        max-w-xl 
        text-xl md:text-2xl 
        text-black 
        font-medium 
        leading-relaxed
      ">
        Automate Instagram, WhatsApp, and Telegram with AI that feels human.
        Close more sales while you sleep.
      </p>

      {/* BUTTONS */}
      <div className="mt-8 flex gap-4">
        <button className="bg-black text-white px-6 py-3 rounded-full font-medium">
          Get Started Free
        </button>
        <button className="bg-gray-100 px-6 py-3 rounded-full text-black font-medium shadow">
          Book a Demo
        </button>
      </div>
    </div>

    {/* RIGHT SIDE */}
    <div className="hidden lg:flex flex-col items-end gap-6 pr-10">

      {/* PURPLE CARD */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white p-6 rounded-2xl shadow-xl w-72">
        <p className="text-sm mb-4">
          Hey 👋 Here's that ebook you requested!
        </p>
        <button className="bg-white/20 px-4 py-2 rounded-lg w-full">
          Grab Your Guide
        </button>
      </div>

      {/* CHAT BUBBLE */}
      <div className="bg-black text-white px-4 py-3 rounded-xl shadow-lg text-sm">
        Do you have a website where I can see more?
      </div>

    </div>

  </div>
</div>

    </div>
  );
}
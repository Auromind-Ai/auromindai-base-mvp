"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { FeatureScroller } from "./Featurescroller";
import { IphoneMockup } from "./Iphonemockup";

export default function MessageManagementSection() {
  const sectionRef = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mouseX.set((e.clientX - cx) / rect.width);
    mouseY.set((e.clientY - cy) / rect.height);
  };

  const springX = useSpring(mouseX, {
    stiffness: 85,
    damping: 18,
    mass: 0.6,
  });

  const springY = useSpring(mouseY, {
    stiffness: 85,
    damping: 18,
    mass: 0.6,
  });

  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative bg-[#050505] min-h-screen px-[6vw] pt-[60px] pb-[80px] overflow-hidden font-sans"
    >
      {/* Heading Wrap */}
      <motion.div
        className="relative z-10 text-center max-w-[900px] mx-auto"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="m-0 text-white max-w-[896px] text-4xl md:text-[50px] font-medium leading-[1.1] tracking-[-0.04em] text-center">
          Manage all your messages in one place &amp; reply faster with automation
        </h2>

        <p className="mt-[22px] text-white/60 text-base font-normal leading-[1.65] max-w-[620px] mx-auto">
          Automate Instagram, WhatsApp with AI that feels human. Close more sales while you sleep.
        </p>
      </motion.div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8 mt-[50px] relative z-10 items-center lg:items-start justify-center">
        {/* Left Column: Feature Scroller */}
        <motion.div
          className="w-full lg:w-[38%] min-w-[280px] max-w-[400px] shrink-0 lg:mt-[110px]"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <FeatureScroller />
        </motion.div>

        {/* Right Column: iPhone Mockup */}
        <motion.div
          className="w-full lg:flex-1 flex justify-center items-start max-w-[520px]"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <IphoneMockup rotateX={rotateX} rotateY={rotateY} />
        </motion.div>
      </div>
    </section>
  );
}
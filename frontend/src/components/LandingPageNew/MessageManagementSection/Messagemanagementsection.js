"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { FeatureScroller } from "./Featurescroller";
import { IphoneMockup } from "./Iphonemockup";
import styles from "./section.module.css";

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

  const rotateY = useTransform(springX, [-0.5, 0.5], [-14, 14]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className={styles.section}
    >

      <motion.div
  className={styles.headingWrap}
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
>
  <h2 className={styles.heading}>
    Manage all your messages in one place and <br /> 
    reply faster with intelligent automation
  </h2>

  {/* <p className={styles.subheading}>
    Automate Instagram, WhatsApp with AI that feels human. Close more sales
    while you sleep.
  </p> */}
</motion.div>

      <div className={styles.cols}>
        {/* Left: Feature list container */}
        <motion.div
          className={styles.leftCol}
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <FeatureScroller />
        </motion.div>

        {/* Right: iPhone */}
        <motion.div
          className={styles.rightCol}
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
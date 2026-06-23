'use client';

import { motion } from 'framer-motion';
import { useScroll, useTransform } from 'framer-motion';

const ModernSaaSBackground = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 2000], [0, 400]);
  const y2 = useTransform(scrollY, [0, 2000], [0, -300]);

  return (
    <div className="fixed inset-0 z-0 bg-[#0B0B0B] overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#121212] to-[#181818]" />

      {/* Moving Blurs */}
      <motion.div
        style={{ y: y1 }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.03, 0.05, 0.03]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-purple-600 blur-[200px] rounded-full"
      />
      <motion.div
        style={{ y: y2 }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.02, 0.04, 0.02]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] left-[-20%] w-[900px] h-[900px] bg-purple-900 blur-[180px] rounded-full"
      />

      <div className="absolute inset-0 tech-grid opacity-30" />
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/[0.02] blur-[250px] rounded-full" />
    </div>
  );
};

export default ModernSaaSBackground;
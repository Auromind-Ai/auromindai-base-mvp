"use client";
import { motion } from "framer-motion";

export default function CTAButtons() {
  return (
    <motion.div
      className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.6 }}
    >
      <motion.a
        href="#"
        className="relative inline-flex items-center justify-center w-full sm:w-auto px-7 py-3.5 rounded-full bg-zinc-900 text-white text-sm font-bold tracking-widest uppercase overflow-hidden group shadow-lg"
        whileHover={{ scale: 1.04, boxShadow: "0 8px 32px rgba(139,92,246,0.28)" }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <span className="relative z-10">Get Started Free</span>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      </motion.a>

      <motion.a
        href="#"
        className="inline-flex items-center justify-center w-full sm:w-auto px-7 py-3.5 rounded-full border-2 border-zinc-300 text-zinc-800 text-sm font-bold tracking-widest uppercase bg-white hover:border-violet-400 hover:text-violet-700 transition-colors duration-300"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        Book a Demo
      </motion.a>
    </motion.div>
  );
}

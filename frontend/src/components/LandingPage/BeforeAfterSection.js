'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "600"],
});

const BeforeAfterSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const card2Y = useTransform(scrollYProgress, [0.1, 0.8], ["100%", "0%"]);
  const card2Rotate = useTransform(scrollYProgress, [0.1, 0.8], [5, 0]);
  const card1Scale = useTransform(scrollYProgress, [0.5, 0.9], [1, 0.9]);
  const card1Opacity = useTransform(scrollYProgress, [0.5, 0.9], [1, 0.5]);

  const beforeItems = [
    "Copy-pasting the same reply 417 times.",
    "Losing hot leads in endless DMs.",
    "Missed sales while you sleep.",
    "Every comment, follow, DM, buries you deeper."
  ];

  const afterItems = [
    "Smart replies handle FAQs instantly.",
    "Organized, tagged leads.",
    "Sales going off 24/7.",
    "Every interaction is a chance to convert."
  ];

  return (
    <section ref={containerRef} className="relative h-[150vh] md:h-[220vh] bg-black py-6 md:py-20">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-6">
        <div className="relative w-full max-w-6xl h-[600px] md:h-[700px]">

          {/* Before Card */}
          <motion.div
            style={{ scale: card1Scale, opacity: card1Opacity }}
            className="absolute left-1/2 top-1/2 w-[316px] h-[390px] -translate-x-1/2 -translate-y-1/2 bg-[#0B0B0D] rounded-[2rem] p-5 md:p-20 flex flex-col z-0 shadow-xl border border-white/10 md:w-auto md:h-auto md:inset-0 md:translate-x-0 md:translate-y-0"
          >
                      <div className="mb-auto">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-6 block text-center">
              Before Auromind
            </span>

            <h2 className={`${poppins.className} text-[22px] md:text-[clamp(2rem,4.5vw,3.75rem)] font-semibold leading-[0.95] text-white tracking-tighter max-w-xl`}>
              All work and no play
            </h2>
          </div>

            <div className="space-y-2 mb-4">
              {beforeItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-white/10">
                  <span
                    className={`${poppins.className} text-sm sm:text-[18px] md:text-[19px] lg:text-[20px] font-normal tracking-normal leading-[1.4] text-white`}
                  >
                    {item}
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              ))}
            </div>Deep insights into your Deep insights into 
          </motion.div>

          {/* After Card */}
          <motion.div
            style={{ y: card2Y, rotate: card2Rotate }}
            className="absolute left-1/2 top-1/2 w-[316px] h-[420px] -translate-x-1/2 -translate-y-1/2 bg-[#8B52D9] rounded-[2rem] p-5 md:p-20 flex flex-col z-10 md:w-auto md:h-auto md:inset-0 md:translate-x-0 md:translate-y-0 shadow-[0_-50px_100px_rgba(0,0,0,0.12)]"
          >
            <div className="mb-auto relative">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4 block text-center">After Auromind:</span>
              <div className="relative inline-block w-full text-center">
                <h2
                  className={`${poppins.className} text-[22px] md:text-[clamp(2rem,4.5vw,3.75rem)] font-semibold leading-[0.95] text-white tracking-tighter relative z-10`}
                >
                  Less grind and <br /> more pay
                </h2>
                {/* Yellow Swish SVG */}
                <motion.svg
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  viewBox="0 0 400 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full pointer-events-none z-0"
                >
                  <path
                    d="M10,50 Q100,10 200,50 T390,50"
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="opacity-20"
                  />
                  <path
                    d="M20,60 Q110,20 210,60 T400,60"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="opacity-10"
                  />
                </motion.svg>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {afterItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-white/10">
                  <span
                    className={`${poppins.className} text-sm sm:text-[18px] md:text-[19px] lg:text-[20px] font-normal tracking-normal leading-[1.4] text-white`}
                  >
                    {item}
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              ))}
            </div>

            <button
              className={`${poppins.className} w-full py-3 md:py-6 bg-white text-[#4F46E5] rounded-full font-black text-[10px] md:text-xs uppercase tracking-[0.25em] md:tracking-[0.4em] hover:scale-[0.98] transition-transform shadow-xl shadow-black/10`}
            >
              Get Started
            </button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default BeforeAfterSection;
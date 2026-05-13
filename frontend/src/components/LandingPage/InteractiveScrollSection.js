'use client';

import { useRef, useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  Instagram,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';

export default function InteractiveScrollSection() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const stage = useTransform(
    scrollYProgress,
    [0, 0.2, 0.4, 0.6, 0.8, 1],
    [0, 1, 2, 3, 3, 3]
  );

  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    return stage.on('change', (latest) => {
      setActiveStage(Math.floor(latest));
    });
  }, [stage]);

  const stages = [
    {
      title: 'Turn comments into conversations that sell',
      description:
        '"How much is this?" or "Do you ship to Mars?" Instant reply. Boom — wallets open, money lands, and you didn’t even blink.',
      chat: [
        { type: 'user', text: 'How much is this?' },
        {
          type: 'bot',
          text: "Hey! It's $49. Want a link to order?",
          button: 'Send Link',
        },
        { type: 'user', text: 'Yes please!' },
      ],
      progress: '1/3',
      tag: 'Convert audience into subscribers',
    },
    {
      title: 'Personal conversations; Profitable sales',
      description:
        'Identify high-intent leads, nurture relationships, and close sales — all through rapid, authentic, automated conversation.',
      chat: [
        { type: 'user', text: 'Do you sell black wallets?' },
        {
          type: 'bot',
          text: 'Hey! Yes we do! Want me to send you the link to order? 🚀',
          button: 'View Catalog',
        },
        { type: 'user', text: "Yes, that'd be great!" },
      ],
      progress: '2/4',
      tag: 'Drive more revenue',
    },
    {
      title: 'Scale up your best conversations',
      description:
        "Powerful automations for all the ways you engage and monetize. Your business never sleeps, and now your sales don't either.",
      chat: [
        { type: 'bot', text: 'Your order #1234 has been shipped! 📦' },
        { type: 'user', text: 'Thanks! That was fast.' },
        {
          type: 'bot',
          text: 'We aim to please! Anything else I can help with?',
        },
      ],
      progress: '3/4',
      tag: 'Automate at scale',
    },
    {
      title: 'Everywhere your audience is',
      platforms: [
        {
          id: 'insta',
          name: 'Instagram',
          desc: 'Effortlessly automate DMs and comment replies',
        },
        {
          id: 'tiktok',
          name: 'TikTok',
          desc: 'Turn viral moments into meaningful conversations',
        },
        {
          id: 'wa',
          name: 'WhatsApp',
          desc: 'Transform leads into loyal customers by engaging them 1:1',
        },
      ],
    },
  ];

  const giantTextX = useTransform(scrollYProgress, [0.6, 1], ['20%', '-40%']);
  const giantTextOpacity = useTransform(
    scrollYProgress,
    [0.6, 0.7, 0.9, 1],
    [0, 1, 1, 0]
  );

  const phoneRotateY = useTransform(scrollYProgress, [0, 0.75], [0, 15]);

  return (
    <section
      ref={containerRef}
      className="relative h-[500vh] bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#A855F7]"
    >
      <div className="sticky top-0 h-screen flex flex-col overflow-hidden">
        <motion.div
          style={{ x: giantTextX, opacity: giantTextOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden whitespace-nowrap"
        >
          <span className="text-[40vw] font-black text-white/5 leading-none select-none">
            EVERYWHERE
          </span>
        </motion.div>

        <div className="w-full py-8 px-10 flex items-center justify-between border-b border-black/5 z-10">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 w-12 rounded-full transition-colors duration-500 ${
                  i <= activeStage ? 'bg-white' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full relative z-10 px-10 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {activeStage < 3 ? (
              <motion.div
                key="chat-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center"
              >
                <div className="relative h-[300px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStage}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 flex flex-col justify-center"
                    >
                      <h2 className="text-[clamp(2rem,5vw,4rem)] font-black leading-[0.9] text-white tracking-tighter mb-8">
                        {stages[activeStage].title}
                      </h2>

                      <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed max-w-lg">
                        {stages[activeStage].description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="relative flex justify-center">
                  <motion.div
                    style={{ rotateY: phoneRotateY }}
                    className="relative w-[300px] h-[600px] bg-black rounded-[3rem] border-[8px] border-zinc-800 shadow-[0_50px_100px_rgba(0,0,0,0.2)] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[#0B0B0B] p-6 pt-12">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-full bg-zinc-800" />
                        <div className="flex-1">
                          <div className="w-24 h-2 bg-zinc-800 rounded-full mb-2" />
                          <div className="w-12 h-1.5 bg-zinc-900 rounded-full" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <AnimatePresence>
                          {stages[activeStage].chat?.map((msg, i) => (
                            <motion.div
                              key={`${activeStage}-${i}`}
                              initial={{
                                opacity: 0,
                                scale: 0.8,
                                x: msg.type === 'user' ? 20 : -20,
                              }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              transition={{ delay: i * 0.2, duration: 0.4 }}
                              className={`max-w-[85%] p-4 rounded-2xl text-[13px] ${
                                msg.type === 'user'
                                  ? 'ml-auto bg-zinc-800 text-white rounded-br-none'
                                  : 'bg-purple-600 text-white rounded-bl-none'
                              }`}
                            >
                              {msg.text}

                              {msg.button && (
                                <div className="mt-2 pt-2 border-t border-white/10">
                                  <div className="w-full py-2 bg-white/10 rounded-lg font-bold text-[10px] uppercase tracking-widest text-center">
                                    {msg.button}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl" />
                  </motion.div>

                  <motion.div className="absolute -bottom-6 right-0 left-0 lg:-right-12 lg:left-auto flex justify-center">
                    <div className="bg-[#FF00E5] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-4">
                      <span>{stages[activeStage].tag}</span>
                      <span className="opacity-50">
                        {stages[activeStage].progress}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="everywhere-view"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="w-full flex flex-col items-center text-center"
              >
                <h2 className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.8] text-white tracking-tighter mb-16 max-w-4xl">
                  Everywhere your audience is
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
                  {stages[3].platforms.map((platform, idx) => (
                    <motion.div
                      key={platform.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-10 rounded-[2.5rem] flex flex-col text-left group hover:scale-[1.02] transition-transform duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.05)]"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-10 group-hover:rotate-6 transition-transform">
                        {platform.name === 'Instagram' && (
                          <Instagram className="w-8 h-8 text-purple-600" />
                        )}
                        {platform.name === 'TikTok' && (
                          <MessageCircle className="w-8 h-8 text-purple-600" />
                        )}
                        {platform.name === 'WhatsApp' && (
                          <MessageSquare className="w-8 h-8 text-purple-600" />
                        )}
                      </div>

                      <h3 className="text-3xl font-black text-black mb-4">
                        {platform.name}
                      </h3>

                      <p className="text-black/60 font-medium mb-12 flex-1">
                        {platform.desc}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] group-hover:gap-4 transition-all">
                        Learn More <ArrowRight className="w-4 h-4" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full bg-black py-6 px-10 flex items-center justify-center gap-4">
          <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
            Ready to scale?
          </span>

          <button className="text-white text-[10px] font-black uppercase tracking-[0.3em] hover:text-purple-200 transition-colors">
            Get Started &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
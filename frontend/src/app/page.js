'use client';

import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Lenis from 'lenis';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Zap,
  MessageSquare,
  Database,
  BarChart3,
  BrainCircuit,
  Workflow,
  Sparkles,
  Rocket,
  ShieldCheck,
  Target,
  Clock,
  Smile,
  Instagram,
  MessageCircle,
  CheckCircle2,
  HelpCircle,
  Cpu,
  Globe,
  Plus,
  Users,
  RefreshCw,
  Phone,
  Video,
  Send,
  Check
} from 'lucide-react';

// --- Interactive Scroll Section (Manychat Inspired) ---
const InteractiveScrollSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Stages logic (0 to 1 mapping to 4 stages)
  const stage = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 0.8, 1], [0, 1, 2, 3, 3, 3]);

  const [activeStage, setActiveStage] = useState(0);
  useEffect(() => {
    return stage.on("change", (latest) => {
      setActiveStage(Math.floor(latest));
    });
  }, [stage]);

  const stages = [
    {
      title: "Turn comments into conversations that sell",
      description: "\"How much is this?\" or \"Do you ship to Mars?\" Instant reply. Boom — wallets open, money lands, and you didn't even blink.",
      chat: [
        { type: 'user', text: 'How much is this?' },
        { type: 'bot', text: 'Hey! It\'s $49. Want a link to order?', button: 'Send Link' },
        { type: 'user', text: 'Yes please!' }
      ],
      progress: "1/3",
      tag: "Convert audience into subscribers"
    },
    {
      title: "Personal conversations; Profitable sales",
      description: "Identify high-intent leads, nurture relationships, and close sales — all through rapid, authentic, automated conversation.",
      chat: [
        { type: 'user', text: 'Do you sell black wallets?' },
        { type: 'bot', text: 'Hey! Yes we do! Want me to send you the link to order? 🚀', button: 'View Catalog' },
        { type: 'user', text: 'Yes, that\'d be great!' }
      ],
      progress: "2/4",
      tag: "Drive more revenue"
    },
    {
      title: "Scale up your best conversations",
      description: "Powerful automations for all the ways you engage and monetize. Your business never sleeps, and now your sales don't either.",
      chat: [
        { type: 'bot', text: 'Your order #1234 has been shipped! 📦' },
        { type: 'user', text: 'Thanks! That was fast.' },
        { type: 'bot', text: 'We aim to please! Anything else I can help with?' }
      ],
      progress: "3/4",
      tag: "Automate at scale"
    },
    {
      title: "Everywhere your audience is",
      description: "Instagram, TikTok, WhatsApp. Be where they are, when they are ready to buy. No more missed opportunities or dropped leads.",
      platforms: [
        { id: 'insta', name: 'Instagram', desc: 'Effortlessly automate DMs and comment replies', icon: 'Instagram' },
        { id: 'tiktok', name: 'TikTok', desc: 'Turn viral moments into meaningful conversations', icon: 'MessageCircle' },
        { id: 'wa', name: 'WhatsApp', desc: 'Transform leads into loyal customers by engaging them 1:1', icon: 'MessageSquare' }
      ],
      progress: "4/4",
      tag: "Everywhere reach"
    }
  ];

  const giantTextX = useTransform(scrollYProgress, [0.6, 1], ["20%", "-40%"]);
  const giantTextOpacity = useTransform(scrollYProgress, [0.6, 0.7, 0.9, 1], [0, 1, 1, 0]);
  const phoneRotateY = useTransform(scrollYProgress, [0, 0.75], [0, 15]);

  return (
    <section ref={containerRef} className="relative h-[500vh] bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#A855F7]">
      <div className="sticky top-0 h-screen flex flex-col overflow-hidden">
        {/* Giant Scrolling Text */}
        <motion.div
          style={{ x: giantTextX, opacity: giantTextOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden whitespace-nowrap"
        >
          <span className="text-[40vw] font-black text-white/5 leading-none select-none">
            EVERYWHERE
          </span>
        </motion.div>

        {/* Top Progress Nav */}
        <div className="w-full py-8 px-10 flex items-center justify-between border-b border-black/5 z-10">
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 w-12 rounded-full transition-colors duration-500 ${i <= activeStage ? 'bg-white' : 'bg-white/20'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-white/40">
            <span>Product</span>
            <span>Solutions</span>
            <span>Agencies</span>
            <span>Pricing</span>
          </div>
          <button className="px-6 py-2 rounded-full border border-white text-[11px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-purple-600 transition-all">
            Get Started
          </button>
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
                {/* Left Content */}
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

                {/* Right Phone Mockup */}
                <div className="relative flex justify-center">
                  <motion.div
                    style={{ rotateY: phoneRotateY }}
                    className="relative w-[300px] h-[600px] bg-black rounded-[3rem] border-[8px] border-zinc-800 shadow-[0_50px_100px_rgba(0,0,0,0.2)] overflow-hidden"
                  >
                    {/* Phone Content */}
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
                              initial={{ opacity: 0, scale: 0.8, x: msg.type === 'user' ? 20 : -20 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              transition={{ delay: i * 0.2, duration: 0.4 }}
                              className={`max-w-[85%] p-4 rounded-2xl text-[13px] ${msg.type === 'user'
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
                      <span className="opacity-50">{stages[activeStage].progress}</span>
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
                        {platform.name === 'Instagram' && <Instagram className="w-8 h-8 text-purple-600" />}
                        {platform.name === 'TikTok' && <MessageCircle className="w-8 h-8 text-purple-600" />}
                        {platform.name === 'WhatsApp' && <MessageSquare className="w-8 h-8 text-purple-600" />}
                      </div>
                      <h3 className="text-3xl font-black text-black mb-4">{platform.name}</h3>
                      <p className="text-black/60 font-medium mb-12 flex-1">
                        {platform.desc}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] group-hover:gap-4 transition-all">
                        Learn More <ArrowRight className="w-4 h-4" />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-20 flex gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-purple-600 transition-colors cursor-pointer">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </div>
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-white text-purple-600 hover:bg-white/90 transition-colors cursor-pointer">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Bar */}
        <div className="w-full bg-black py-6 px-10 flex items-center justify-center gap-4">
          <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Ready to scale?</span>
          <button className="text-white text-[10px] font-black uppercase tracking-[0.3em] hover:text-purple-200 transition-colors">
            Get Started &rarr;
          </button>
        </div>
      </div>
    </section>
  );
};

// --- Before/After Card Section (Manychat Inspired) ---
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
    <section ref={containerRef} className="relative h-[300vh] bg-white py-20">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-6">
        <div className="relative w-full max-w-6xl h-[600px] md:h-[700px]">

          {/* Before Card */}
          <motion.div
            style={{ scale: card1Scale, opacity: card1Opacity }}
            className="absolute inset-0 bg-[#F2F4F2] rounded-[3rem] p-10 md:p-20 flex flex-col z-0 shadow-xl border border-black/5"
          >
            <div className="mb-auto">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 mb-4 block">Before Auromind:</span>
              <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.9] text-black tracking-tighter max-w-xl">
                All work and no play
              </h2>
            </div>

            <div className="space-y-6 mb-12">
              {beforeItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-black/5">
                  <span className="text-[11px] md:text-sm font-black uppercase tracking-widest text-black/60">{item}</span>
                  <CheckCircle2 className="w-5 h-5 text-black" />
                </div>
              ))}
            </div>

            <button className="w-full py-6 bg-black text-white rounded-full font-black text-xs uppercase tracking-[0.4em] hover:scale-[0.98] transition-transform">
              Get Started
            </button>
          </motion.div>

          {/* After Card */}
          <motion.div
            style={{ y: card2Y, rotate: card2Rotate }}
            className="absolute inset-0 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[3rem] p-10 md:p-20 flex flex-col z-10 shadow-[0_-50px_100px_rgba(0,0,0,0.1)]"
          >
            <div className="mb-auto relative">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4 block text-center">After Auromind:</span>
              <div className="relative inline-block w-full text-center">
                <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-[0.9] text-white tracking-tighter relative z-10">
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

            <div className="space-y-6 mb-12">
              {afterItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-white/10">
                  <span className="text-[11px] md:text-sm font-black uppercase tracking-widest text-white/80">{item}</span>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              ))}
            </div>

            <button className="w-full py-6 bg-white text-[#4F46E5] rounded-full font-black text-xs uppercase tracking-[0.4em] hover:scale-[0.98] transition-transform shadow-xl shadow-black/10">
              Get Started
            </button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

// --- Scroll Reveal Wrapper ---
const RevealOnScroll = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

// --- See It In Action (Interactive WhatsApp) ---
const SeeItInAction = () => {
  const [activeScenario, setActiveScenario] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const scenarios = [
    {
      id: 0,
      title: "Say hi to new followers",
      desc: "Turn a like into a lead instantly.",
      messages: [
        { type: 'incoming', text: "Hey! Just followed you. Love your content! 😍" },
        { type: 'outgoing', text: "Thanks for the follow! Glad you're here. Check out our latest guide on scaling sales." },
        { type: 'outgoing', text: "👉 cosmo.link/guide", isLink: true }
      ]
    },
    {
      id: 1,
      title: "Send welcome messages",
      desc: "Make a strong first impression.",
      messages: [
        { type: 'incoming', text: "Hi! How can I get started?" },
        { type: 'outgoing', text: "Welcome to Auromind! 🚀 I can help you automate your DMs in minutes. Should we start with a demo?" },
        { type: 'outgoing', text: "1. Yes, show me how\n2. Just browsing", isOptions: true }
      ]
    },
    {
      id: 2,
      title: "Automate FAQs",
      desc: "Answer common questions 24/7.",
      messages: [
        { type: 'incoming', text: "Do you offer a free trial?" },
        { type: 'outgoing', text: "Yes! We have a 14-day free trial on our Pro plan. No credit card required. 💳" },
        { type: 'outgoing', text: "Would you like the link to sign up?", isOptions: true }
      ]
    },
    {
      id: 3,
      title: "Auto-DM from comments",
      desc: "Connect public ads to private DMs.",
      messages: [
        { type: 'incoming', text: "[Comment on Post] Interested! How do I buy?" },
        { type: 'outgoing', text: "DM-ed you! Check your inbox for the product link and a 10% discount code. 🎁" },
        { type: 'outgoing', text: "Code: COSMO10", isSticker: true }
      ]
    },
    {
      id: 4,
      title: "Run giveaways",
      desc: "Automate entries and winners.",
      messages: [
        { type: 'incoming', text: "ENTER" },
        { type: 'outgoing', text: "You're in! 🎉 We'll announce the winner on Friday. Good luck!" },
        { type: 'outgoing', text: "Want to double your chances? Share this post!", isOptions: true }
      ]
    }
  ];

  useEffect(() => {
    // Reset and play animation for active scenario
    setChatMessages([]);
    setIsTyping(false);

    let currentIdx = 0;
    let timeoutId1;
    let timeoutId2;

    const playNext = () => {
      if (scenarios[activeScenario] && currentIdx < scenarios[activeScenario].messages.length) {
        setIsTyping(true);
        timeoutId1 = setTimeout(() => {
          setIsTyping(false);
          const nextMsg = scenarios[activeScenario].messages[currentIdx];
          if (nextMsg) {
            setChatMessages(prev => [...prev, nextMsg]);
            currentIdx++;
            timeoutId2 = setTimeout(playNext, 1200);
          }
        }, 800);
      }
    };

    playNext();
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [activeScenario]);

  return (
    <section className="py-32 px-6 bg-[#1A1AFF] relative overflow-hidden">
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">See it in action...</h2>
          <p className="text-white/60 text-xl font-medium">Click a scenario to see the automation magic.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Interactive Menu */}
          <div className="lg:col-span-5 space-y-4">
            {scenarios.map((scenario, i) => (
              <button
                key={scenario.id}
                onClick={() => setActiveScenario(i)}
                className={`w-full p-8 rounded-[2rem] text-left transition-all duration-500 flex flex-col gap-2 ${activeScenario === i
                  ? 'bg-white shadow-[0_20px_40px_rgba(0,0,0,0.2)] scale-[1.02]'
                  : 'bg-white/5 hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-black ${activeScenario === i ? 'text-black' : 'text-white/80'}`}>
                    {scenario.title}
                  </h3>
                  {activeScenario === i && <ArrowRight className="text-black w-5 h-5" />}
                </div>
                <p className={`text-sm font-medium ${activeScenario === i ? 'text-black/60' : 'text-white/40'}`}>
                  {scenario.desc}
                </p>
                {activeScenario === i && (
                  <motion.div
                    layoutId="active-pill"
                    className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600"
                  >
                    Check it out &rarr;
                  </motion.div>
                )}
              </button>
            ))}

            <button className="w-full mt-10 py-6 bg-black text-white rounded-full font-black text-xs uppercase tracking-[0.4em] hover:bg-zinc-900 transition-all">
              Get Started
            </button>
          </div>

          {/* Right: Phone Mockup */}
          <div className="lg:col-span-7 flex justify-center relative">
            <motion.div
              layout
              className="relative w-[340px] h-[680px] bg-black rounded-[4rem] border-[12px] border-[#0F0F0F] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* WhatsApp Header */}
              <div className="bg-[#202124] p-6 flex items-center gap-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-black text-white text-xs">CL</div>
                <div>
                  <div className="text-white font-bold text-sm">Mia Wallace</div>
                  <div className="text-green-400 text-[10px] font-bold">Online</div>
                </div>
                <div className="ml-auto flex gap-4 text-white/40">
                  <Phone size={18} />
                  <Video size={18} />
                </div>
              </div>

              {/* Chat Area */}
              <div className="p-4 h-[calc(100%-80px)] overflow-y-auto space-y-4 bg-[#0F0F0F]">
                <AnimatePresence>
                  {chatMessages.map((msg, i) => msg && (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8, y: 20, x: msg.type === 'incoming' ? -20 : 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      className={`flex ${msg.type === 'incoming' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-lg ${msg.type === 'incoming'
                        ? 'bg-[#1F1F1F] text-white rounded-bl-none'
                        : 'bg-[#007AFF] text-white rounded-br-none'
                        }`}>
                        {msg.text}
                        {msg.isOptions && (
                          <div className="mt-4 space-y-2">
                            <div className="bg-white/10 p-2 rounded-lg text-[10px] border border-white/10 text-center">Option 1</div>
                            <div className="bg-white/10 p-2 rounded-lg text-[10px] border border-white/10 text-center">Option 2</div>
                          </div>
                        )}
                        {msg.isSticker && (
                          <div className="mt-4 flex items-center justify-center">
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="text-4xl"
                            >
                              🎁
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-[#1F1F1F] p-3 rounded-2xl w-16 flex gap-1 items-center justify-center"
                    >
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce delay-200" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* WhatsApp Input */}
              <div className="absolute bottom-0 left-0 right-0 bg-[#202124] p-4 flex items-center gap-4">
                <div className="flex-1 bg-white/5 rounded-full py-2 px-6 text-white/40 text-xs">Type a message...</div>
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <Send size={18} />
                </div>
              </div>
            </motion.div>

            {/* Label in Reference */}
            <div className="absolute top-10 right-0 max-w-[200px] text-right hidden xl:block">
              <p className="text-white/40 text-xs font-black uppercase tracking-[0.2em] mb-4">
                Make a strong first impression with personalized greetings that work 24/7
              </p>
              <div className="h-0.5 w-12 bg-white/20 ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Modern SaaS Background System ---
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

// --- Modern SaaS UI Mockup Component ---
const SaaSMockup = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      while (true) {
        setStep(0);
        await new Promise(r => setTimeout(r, 1000));
        setStep(1); // Customer message
        await new Promise(r => setTimeout(r, 2000));
        setStep(2); // AI Typing
        await new Promise(r => setTimeout(r, 1500));
        setStep(3); // AI Reply
        await new Promise(r => setTimeout(r, 2500));
        setStep(4); // Dashboard / Conversion
        await new Promise(r => setTimeout(r, 4000));
      }
    };
    sequence();
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-square lg:aspect-video flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-white/5 blur-[120px] rounded-full scale-90" />

      <div className="relative w-full h-full flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {/* Main Dashboard Frame */}
          <motion.div
            key="dashboard-frame"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 glass-panel bg-black/60 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            {/* Mock Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">System Live</span>
              </div>
            </div>

            {/* Mock Content */}
            <div className="flex-1 p-10 space-y-10">
              <div className="h-4 w-1/4 bg-white/10 rounded-full" />
              <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-white/[0.03] rounded-3xl border border-white/5 p-4 flex flex-col justify-end gap-2">
                    <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                    <div className="h-4 w-full bg-white/5 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="h-40 bg-white/[0.02] rounded-3xl border border-white/5" />
            </div>
          </motion.div>

          {/* Floating Interaction Sequence */}
          <div key="interaction-sequence" className="relative z-10 w-full max-w-sm flex flex-col gap-4">
            {step >= 1 && (
              <motion.div
                key="msg-1"
                initial={{ opacity: 0, x: 30, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                className="self-end px-6 py-4 bg-purple-600 text-white rounded-[2rem] rounded-tr-sm shadow-2xl text-sm font-medium"
              >
                Hi! I need help automating my sales.
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="self-start px-6 py-4 bg-white/5 backdrop-blur-2xl rounded-[2rem] flex gap-2 border border-white/10"
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                    className="w-2 h-2 rounded-full bg-purple-400"
                  />
                ))}
              </motion.div>
            )}

            {step >= 3 && (
              <motion.div
                key="msg-2"
                initial={{ opacity: 0, x: -30, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                className="self-start px-6 py-4 bg-[#1A1A1A] border border-white/10 text-white rounded-[2rem] rounded-tl-sm shadow-2xl text-sm"
              >
                Analyzing requirements... Auromind AI is ready to scale your WhatsApp conversions.
              </motion.div>
            )}

            {step >= 4 && (
              <motion.div
                key="status-card"
                initial={{ opacity: 0, scale: 0.8, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute top-[80%] left-1/2 -translate-x-1/2 w-72 p-6 bg-white text-black rounded-[2rem] shadow-[0_20px_50px_rgba(168,85,247,0.2)] flex items-center gap-4 border border-purple-500/20"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest leading-none mb-1">Growth Status</p>
                  <p className="text-lg font-bold">Scaling Active</p>
                </div>
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const containerRef = useRef(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("http://localhost:8000/admin/settings");
        const data = await res.json();
        setSettings(data);
        console.log("Fetched settings:", data);
      } catch (err) {
        console.error("Settings fetch error:", err);
      }
    };

    fetchSettings();
  }, []);
  // --- Smooth Scroll (Lenis) ---
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      lerp: 0.1
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <main ref={containerRef} className="min-h-screen bg-white relative">
      {/* Global Texture (Premium feel) */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative z-10">
        {/* --- NAVIGATION --- */}
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-black/5 py-4 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-12">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white group-hover:scale-105 transition-all">
                  <Zap size={18} fill="currentColor" />
                </div>
                <span className="text-xl font-black tracking-tighter text-black">Auromind</span>
              </Link>

              <div className="hidden lg:flex items-center gap-8">
                {['Product', 'Solutions', 'Agencies', 'Pricing', 'Resources'].map((item) => (
                  <Link
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="text-[11px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/login" className="text-[11px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors">Sign In</Link>
              <button className="px-6 py-3 bg-black text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95">
                Get Started
              </button>
            </div>
          </div>
        </nav>

        <ModernSaaSBackground />

        {/* --- HERO SECTION --- */}
        <RevealOnScroll>
          <section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-20 px-6 overflow-hidden bg-white">
            {/* Subtle Grid Background */}
            <div className="absolute inset-x-0 top-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="max-w-7xl mx-auto w-full relative z-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-8">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.05] border border-white/10 text-white/80 text-[10px] font-bold mb-10 tracking-[0.2em] uppercase backdrop-blur-md">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>The Future of Sales is Here</span>
                    </div>

                    <h1 className="text-[clamp(3rem,8vw,6.5rem)] font-black tracking-tight mb-10 text-black leading-[0.9]">
                      Make the most out <br />
                      of every single <br />
                      <span className="text-[#A855F7]">conversation.</span>
                    </h1>

                    <p className="max-w-xl text-xl md:text-2xl text-black/60 font-medium leading-relaxed mb-14">
                      Automate Instagram, WhatsApp, and Telegram with AI that feels human. Close more sales while you sleep.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-24">
                      <button className="px-12 py-6 bg-black text-white rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-zinc-800 shadow-xl shadow-black/10">
                        Get Started Free
                      </button>
                      <button className="px-12 py-6 bg-white border border-black/10 text-black rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-black/5 shadow-lg">
                        Book a Demo
                      </button>
                    </div>

                    {/* Trust Row / Partners */}
                    <div className="pt-20 border-t border-black/5 flex flex-wrap items-center gap-12 opacity-30 grayscale items-center">
                      <div className="flex items-center gap-2">
                        <Zap size={14} fill="black" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Meta Business Partner</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black text-center">G2 Leader 2026</span>
                      </div>
                      <div className="flex items-center gap-2 text-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">4.9/5 Rating</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* --- FLOATING CHAT BUBBLES --- */}
                <div className="lg:col-span-4 relative h-[500px] hidden lg:block">
                  {/* Automation Bubble */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    whileHover={{ y: -5 }}
                    className="absolute top-20 right-0 w-[320px] p-6 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-2xl border border-white/20 z-30"
                  >
                    <p className="text-white text-sm font-medium mb-4">
                      Hey 👋 Here's that ebook you requested!
                    </p>
                    <button className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white text-xs font-bold transition-all border border-white/30">
                      Grab Your Guide
                    </button>
                  </motion.div>

                  {/* User Inquiry Bubble */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    whileHover={{ y: -5 }}
                    className="absolute bottom-20 left-0 w-[280px] p-5 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl z-20"
                  >
                    <p className="text-white/70 text-xs mb-1 font-bold uppercase tracking-widest">Prospect</p>
                    <p className="text-white text-sm">
                      Do you have a website where I can see more?
                    </p>
                    <div className="absolute -left-12 bottom-0 w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shadow-lg">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
                    </div>
                  </motion.div>

                  {/* Animated Background Glow for Bubbles */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 blur-[100px] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Scroll Down Indicator */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 opacity-30"
            >
              <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
            </motion.div>
          </section>
        </RevealOnScroll>

        <div className="relative z-10 bg-white">
          {/* --- SOCIAL PROOF --- */}
          <RevealOnScroll>
            <section className="py-24 px-6 relative bg-[#F9F9F9] border-y border-black/5 overflow-hidden">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/30">Trusted by modern brands</span>
                </div>

                {/* Infinite Logo Marquee */}
                <div className="relative mb-24 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#F9F9F9] to-transparent z-10" />
                  <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#F9F9F9] to-transparent z-10" />

                  <motion.div
                    animate={{ x: [0, -1000] }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    className="flex items-center gap-32 whitespace-nowrap"
                  >
                    {[...Array(3)].map((_, outerI) => (
                      <div key={outerI} className="flex items-center gap-32 opacity-20 grayscale">
                        {['Shopify', 'Meta', 'Wati', 'HubSpot', 'Salesforce', 'Zendesk', 'Slack', 'WhatsApp'].map((brand, i) => (
                          <span key={`${outerI}-${i}`} className="text-2xl font-black tracking-tighter text-black uppercase">
                            {brand}
                          </span>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {[
                    { val: '10M+', label: 'Monthly Conversations', icon: MessageSquare },
                    { val: '1M+', label: 'Leads Captured', icon: Users },
                    { val: '24/7', label: 'Automation Velocity', icon: Clock }
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex flex-col items-center text-center py-6"
                    >
                      <div className="text-6xl font-black mb-4 text-black tracking-tighter leading-none">
                        {stat.val}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </RevealOnScroll>

          <InteractiveScrollSection />
          <BeforeAfterSection />
          <SeeItInAction />
          {/* --- REVENUE GAP (THE PROBLEM) --- */}
          <RevealOnScroll>
            <section id="problem" className="py-40 px-6 relative bg-white overflow-hidden">
              {/* Subtle background element to fill "plain" space */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-[120px] -mr-64 -mt-64" />

              <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-center">
                  <div className="lg:col-span-5">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">The Problem</span>
                    <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1] text-black tracking-tighter mb-8">
                      Stop losing sales to manual friction.
                    </h2>
                    <p className="text-xl text-black/60 font-medium leading-relaxed mb-12">
                      Traditional WhatsApp communication fails at scale. 80% of customer interest drops after just 5 minutes of silence.
                    </p>

                    <div className="space-y-8">
                      {[
                        { title: 'Response Decay', desc: 'Leads cool down instantly without a reply.' },
                        { title: 'Leaky Funnels', desc: 'High-intent chats get lost in the noise.' },
                        { title: 'Zero Scale', desc: 'Humans can\'t close 24/7. AI can.' }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-6">
                          <div className="w-1.5 h-auto bg-black/5 rounded-full" />
                          <div>
                            <h3 className="text-lg font-black text-black tracking-tight mb-2">{item.title}</h3>
                            <p className="text-sm text-black/50 font-medium">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-7 flex justify-center">
                    <div className="relative w-full max-w-2xl aspect-[4/3] bg-[#F9F9F9] rounded-[2rem] border border-black/5 overflow-hidden shadow-2xl">
                      <div className="absolute inset-x-0 top-0 h-10 bg-black/5 flex items-center px-6 gap-2">
                        <div className="w-2 h-2 rounded-full bg-black/10" />
                        <div className="w-2 h-2 rounded-full bg-black/10" />
                        <div className="w-2 h-2 rounded-full bg-black/10" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BarChart3 size={80} className="text-black/10" />
                      </div>
                      {/* Simulated "Gap" Visual */}
                      <div className="absolute bottom-12 left-12 right-12 h-24 bg-red-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-red-200">
                        <span className="text-red-400 font-black text-xs uppercase tracking-[0.2em]">Revenue Leak Detected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </RevealOnScroll>

          {/* --- CORE FEATURES (ZIG-ZAG) --- */}
          <section id="features" className="py-40 px-6 bg-slate-50/50 relative border-y border-black/5">
            <div className="absolute inset-0 bg-dot-pattern opacity-[0.03] pointer-events-none" />
            <div className="max-w-7xl mx-auto space-y-64 relative z-10">
              {/* Feature 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-purple-500/10 rounded-[3rem] blur-2xl group-hover:bg-purple-500/20 transition-colors" />
                  <div className="relative">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">Automation Builder</span>
                    <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.9] text-black tracking-tighter mb-8 text-center lg:text-left">
                      Build human-feeling <br /> automations in minutes.
                    </h2>
                    <p className="text-xl text-black/60 font-medium leading-relaxed mb-12 text-center lg:text-left max-w-xl">
                      Our drag-and-drop builder lets you create complex sales funnels without a single line of code. It's the end of busywork.
                    </p>
                    <div className="flex justify-center lg:justify-start">
                      <button className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-[#A855F7] hover:gap-5 transition-all">
                        Explore Builder <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative p-12 bg-white rounded-[3rem] border border-black/5 shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100/50 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="relative z-10 space-y-6">
                    <div className="w-full h-16 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center px-6 gap-4">
                      <div className="w-6 h-6 rounded-full bg-purple-600 shadow-lg shadow-purple-200" />
                      <div className="h-3 w-1/2 bg-zinc-200 rounded-full" />
                    </div>
                    <div className="ml-12 w-8 h-16 border-l-2 border-dashed border-zinc-200 flex items-center px-4">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                        <Plus size={16} className="text-zinc-400" />
                      </div>
                    </div>
                    <div className="w-full h-32 bg-zinc-50 rounded-2xl border border-zinc-100 p-6 space-y-3">
                      <div className="h-3 w-3/4 bg-zinc-200 rounded-full" />
                      <div className="h-3 w-1/2 bg-zinc-200 rounded-full opacity-60" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2: Inverted */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                <div className="lg:order-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">Unified Inbox</span>
                  <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black leading-[0.9] text-black tracking-tighter mb-8 italic">
                    One inbox for <br /> every conversation.
                  </h2>
                  <p className="text-xl text-black/60 font-medium leading-relaxed mb-12 max-w-xl">
                    Whether it's WhatsApp, Instagram, or Telegram - managing your sales conversations has never been this seamless.
                  </p>
                  <div className="space-y-6">
                    {['Automated Lead Scoring', 'Smart Quick Replies', 'Team Collaboration'].map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <Check size={16} className="text-purple-600" />
                        </div>
                        <span className="text-sm font-bold text-black">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:order-1 relative group">
                  <div className="absolute -inset-8 bg-zinc-100 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
                  <div className="relative p-8 bg-black/5 rounded-[3rem] border border-black/5 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                      <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-200" />
                        <div className="space-y-1 flex-1">
                          <div className="h-3 w-24 bg-zinc-200 rounded-full" />
                          <div className="h-2 w-16 bg-zinc-100 rounded-full" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-green-500" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 w-full bg-zinc-100 rounded-lg" />
                        <div className="h-4 w-[80%] bg-zinc-100 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* --- PLATFORM TABS --- */}
          <section className="py-40 px-6 bg-white relative overflow-hidden border-b border-black/5">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-50 rounded-full blur-[160px] opacity-40 pointer-events-none" />
            <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-16 text-black">Wherever your customers are.</h2>
              <div className="flex flex-wrap justify-center gap-4 mb-20">
                {['WhatsApp', 'Instagram', 'Telegram'].map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-widest transition-all ${i === 0 ? 'bg-black text-white' : 'bg-white border border-black/5 text-black/40 hover:text-black'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="max-w-4xl mx-auto aspect-video bg-white rounded-[2.5rem] p-12 shadow-2xl border border-black/5 flex flex-col items-center justify-center">
                <span className="text-[#A855F7] font-black text-[10px] uppercase tracking-[0.5em] mb-4">Official API Integration</span>
                <p className="text-2xl text-black font-black tracking-tight max-w-lg mb-8">
                  Scale your business with the power of world's most popular messaging platforms.
                </p>
                <div className="flex gap-4">
                  <div className="px-6 py-2 bg-zinc-50 rounded-full text-[10px] font-black uppercase text-black/40">Broadcasting</div>
                  <div className="px-6 py-2 bg-zinc-50 rounded-full text-[10px] font-black uppercase text-black/40">Catalogs</div>
                  <div className="px-6 py-2 bg-zinc-50 rounded-full text-[10px] font-black uppercase text-black/40">Payments</div>
                </div>
              </div>
            </div>
          </section>

          {/* --- HOW IT WORKS --- */}
          <section id="how-it-works" className="py-32 px-6 bg-white border-t border-black/5">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">The Process</span>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 text-black">Launch in three steps.</h2>
                <p className="text-black/50 text-xl max-w-2xl mx-auto font-medium leading-relaxed">Your autonomous sales force is just a few clicks away.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
                {[
                  { step: '01', title: 'Connect Account', desc: 'Securely link your WhatsApp Business via official Cloud API.', icon: Globe },
                  { step: '02', title: 'Configure AI', desc: 'Set your rules or train AI on your unique business data.', icon: Cpu },
                  { step: '03', title: 'Start Converting', desc: 'Experience 24/7 autonomous closing on autopilot.', icon: Rocket }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="w-20 h-20 rounded-2.5xl bg-[#F9F9F9] border border-black/5 flex items-center justify-center mb-10 group-hover:scale-105 transition-all">
                      <item.icon size={32} className="text-black" />
                    </div>
                    <span className="text-[10px] font-black text-[#A855F7] uppercase tracking-widest mb-4">Step {item.step}</span>
                    <h3 className="text-2xl font-black mb-4 text-black tracking-tight">{item.title}</h3>
                    <p className="text-sm text-black/40 leading-relaxed max-w-xs font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* --- PRODUCT DEMO / DASHBOARD --- */}
          <section id="demo" className="py-32 px-6 bg-white border-t border-black/5">
            <div className="max-w-7xl mx-auto">
              <div className="bg-[#0B0B0B] rounded-[3rem] p-12 md:p-24 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-12">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 block">Command Center</span>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[1.1]">
                      Monitor every chat <br /> from one dashboard.
                    </h2>
                    <p className="text-white/50 text-xl font-medium leading-relaxed">
                      Track ROI, response velocity, and human-handoffs in real-time. Designed for teams that move fast.
                    </p>

                    <div className="space-y-6">
                      {[
                        { icon: MessageSquare, title: 'Unified Inbox', desc: 'Cross-platform chat management.' },
                        { icon: BarChart3, title: 'Live Analytics', desc: 'Real-time conversion tracking.' },
                        { icon: Workflow, title: 'Workflow Logs', desc: 'Minute-by-minute automation history.' }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-6 items-start">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                            <item.icon size={20} />
                          </div>
                          <div>
                            <h4 className="text-white font-black tracking-tight">{item.title}</h4>
                            <p className="text-white/30 text-xs mt-1 font-medium">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="px-10 py-5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all">
                      Request Dashboard Access
                    </button>
                  </div>

                  <div className="relative">
                    {/* Mock Dashboard Visual */}
                    <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-purple-600/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">Live: 1,429 active chats</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="h-40 bg-zinc-800/50 rounded-xl border border-white/5 p-4">
                          <div className="text-[10px] font-black uppercase text-white/30 mb-2">Conversion Rate</div>
                          <div className="text-3xl font-black text-white">24.8%</div>
                          <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="w-[80%] h-full bg-purple-500" />
                          </div>
                        </div>
                        <div className="h-40 bg-zinc-800/50 rounded-xl border border-white/5 p-4">
                          <div className="text-[10px] font-black uppercase text-white/30 mb-2">Avg. Response Time</div>
                          <div className="text-3xl font-black text-white">1.2s</div>
                          <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="w-[95%] h-full bg-green-500" />
                          </div>
                        </div>
                      </div>
                      <div className="h-32 bg-zinc-800/50 rounded-xl border border-white/5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* --- PRICING SECTION --- */}
          <section id="pricing" className="py-32 px-6 bg-[#F9F9F9] border-t border-black/5">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">Pricing</span>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 text-black">Ready to grow?</h2>
                <p className="text-black/40 text-xl font-medium">Simple plans for every stage of your business.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {[
                  {
                    plan: settings?.free_plan_name ?? "Free",
                    price: `₹${settings?.free_plan_price ?? 0}`,
                    desc: settings?.free_plan_desc ?? "Try Auromind for free and see the ROI yourself.",
                    features: settings?.free_plan_features ?? ["100 AI Replies", "Basic Workflows", "Meta API Included"],
                    popular: false,
                  },
                  {
                    plan: settings?.pro_plan_name ?? "Pro",
                    price: `₹${settings?.pro_plan_price ?? 2490}`,
                    desc: settings?.pro_plan_desc ?? "Everything you need to automate and scale.",
                    features: settings?.pro_plan_features ?? ["Unlimited AI Replies", "Advanced Workflows", "Priority Support", "Full Analytics"],
                    popular: true,
                  },
                  {
                    plan: settings?.enterprise_plan_name ?? "Business",
                      price: (!settings?.enterprise_plan_price || settings?.enterprise_plan_price === 0) ? "Custom": `₹${settings.enterprise_plan_price}`,
                    desc: settings?.enterprise_plan_desc ?? "Enterprise-grade scale for large teams.",
                    features: settings?.enterprise_plan_features ?? ["Dedicated Manager", "Custom API Access", "On-premise Options", "Global SLA"],
                    popular: false,
                  },
                ].map((tier, i) => (
                  <div
                    key={i}
                    className={`p-12 rounded-[2.5rem] bg-white border border-black/5 flex flex-col relative transition-all hover:shadow-2xl ${tier.popular ? "ring-2 ring-black border-transparent" : ""
                      }`}
                  >
                    {tier.popular && (
                      <div className="absolute top-0 right-10 -translate-y-1/2 bg-black text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest z-20">
                        Recommended
                      </div>
                    )}

                    <h3 className="text-2xl font-black mb-4 text-black tracking-tight">{tier.plan}</h3>
                    <p className="text-sm text-black/40 mb-10 font-medium leading-relaxed">{tier.desc}</p>

                    <div className="mb-12 flex items-baseline gap-2">
                      <span className="text-6xl font-black tracking-tighter text-black">{tier.price}</span>
                      {tier.price !== "Custom" && (
                        <span className="text-black/30 text-xs font-black uppercase tracking-widest">/mo</span>
                      )}
                    </div>

                    <ul className="space-y-6 mb-16 flex-1">
                      {tier.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-4 text-sm text-black font-medium">
                          <CheckCircle2 size={18} className="text-black/10 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`w-full py-5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${tier.popular
                          ? "bg-black text-white hover:bg-zinc-800"
                          : "bg-white border border-black/10 text-black hover:bg-black/5"
                        }`}
                    >
                      {i === 0 ? "Get Started" : i === 1 ? `Go ${tier.plan}` : "Contact Sales"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* --- TESTIMONIALS --- */}
          <section id="testimonials" className="py-32 px-6 bg-white border-t border-black/5">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-black">Joined by thousands.</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {[
                  { user: 'Sarah Jenkins', role: 'Director @ ShopEase', result: '3x ROI', content: 'Auromind transformed our customer support. We now handle 3x more inquiries with better conversion rates.' },
                  { user: 'Amit Sharma', role: 'Growth Lead @ TechFlow', result: '$20k Recovered', content: 'The AI replies are indistinguishable from my best agents. It recovered $20k in abandoned carts last month.' },
                  { user: 'Michael Chen', role: 'Founder, Zynk Media', result: '90% Automation', content: 'Simply the best WhatsApp automation tool. The workflow builder is intuitive and extremely powerful.' }
                ].map((testi, i) => (
                  <div key={i} className="p-12 rounded-[2.5rem] bg-[#F9F9F9] border border-black/5 relative flex flex-col items-start min-h-[400px]">
                    <div className="absolute top-8 right-8 px-4 py-1.5 rounded-full bg-white border border-black/5 text-[10px] font-black uppercase tracking-widest text-[#A855F7]">
                      {testi.result}
                    </div>
                    <div className="mb-10 text-black/20">
                      <MessageSquare size={40} fill="currentColor" />
                    </div>
                    <p className="text-xl text-black font-medium mb-12 flex-1 leading-relaxed italic">
                      "{testi.content}"
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-black/5" />
                      <div>
                        <h4 className="font-black text-black tracking-tight">{testi.user}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mt-1">{testi.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* --- INTEGRATIONS GRID --- */}
          <section id="integrations" className="py-40 px-6 bg-white relative border-t border-black/5">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03),transparent_100%)] pointer-events-none" />
            <div className="max-w-7xl mx-auto text-center relative z-10">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block"
              >
                Connectivity
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-black tracking-tighter text-black mb-20"
              >
                Works with your favorite tools.
              </motion.h2>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {[
                  { name: 'Shopify', color: 'hover:text-[#96BF48]' },
                  { name: 'HubSpot', color: 'hover:text-[#FF7A59]' },
                  { name: 'Salesforce', color: 'hover:text-[#00A1E0]' },
                  { name: 'Make', color: 'hover:text-[#EA1B3C]' },
                  { name: 'Zapier', color: 'hover:text-[#FF4A00]' },
                  { name: 'WooCommerce', color: 'hover:text-[#96588A]' },
                  { name: 'Mailchimp', color: 'hover:text-[#FFE01B]' },
                  { name: 'ActiveCampaign', color: 'hover:text-[#356AE6]' },
                  { name: 'Zendesk', color: 'hover:text-[#03363D]' },
                  { name: 'Slack', color: 'hover:text-[#4A154B]' },
                  { name: 'Intercom', color: 'hover:text-[#0057FF]' },
                  { name: 'Stripe', color: 'hover:text-[#635BFF]' }
                ].map((tool, i) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -8, scale: 1.05 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className={`aspect-square flex flex-col items-center justify-center bg-white rounded-[2rem] border border-black/5 shadow-sm hover:shadow-2xl hover:border-purple-500/20 transition-all duration-300 group cursor-pointer`}
                  >
                    <div className="w-12 h-12 mb-4 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                      <Zap size={20} className="text-black/10 group-hover:text-purple-500 transition-colors" />
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-widest text-black/40 group-hover:text-black transition-colors ${tool.color}`}>
                      {tool.name}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="mt-24 inline-flex items-center gap-4 px-8 py-4 bg-zinc-50 rounded-full border border-black/5 text-[11px] font-black uppercase tracking-widest text-black/40"
              >
                <span>And 100+ more via API</span>
                <div className="w-[1px] h-4 bg-black/10" />
                <button className="text-black hover:text-purple-600 transition-colors">View Directory</button>
              </motion.div>
            </div>
          </section>

          {/* --- FAQ SECTION --- */}
          <section id="faq" className="py-32 px-6 bg-white border-t border-black/5">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-24">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-black mb-8">Got questions?</h2>
                <p className="text-black/40 text-xl font-medium">Everything you need to know about Auromind.</p>
              </div>

              <div className="space-y-6">
                {[
                  { q: 'How does the AI understand customer intent?', a: 'Our AI uses advanced NLP models trained specifically on sales conversations to detect buying signals and objections.' },
                  { q: 'Is it safe to link my WhatsApp Business account?', a: 'Yes, we use the official WhatsApp Cloud API which is enterprise-grade and secure.' },
                  { q: 'Can I switch between AI and human agents?', a: 'Absolutely. You can set rules for human handoff or manually intervene anytime.' },
                  { q: 'What happens if the AI doesn\'t know the answer?', a: 'The AI can be configured to ask for clarification or hand off to your team with full context.' }
                ].map((item, i) => (
                  <div key={i} className="bg-[#F9F9F9] rounded-3xl p-10 border border-black/5 group cursor-pointer hover:bg-zinc-50 transition-all">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-black tracking-tight">{item.q}</h4>
                      <Plus size={20} className="text-black/20 group-hover:rotate-45 transition-transform" />
                    </div>
                    <p className="mt-6 text-black/50 font-medium leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* --- FINAL CTA SECTION --- */}
          <section className="py-48 px-6 bg-black relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent pointer-events-none" />
            <div className="max-w-5xl mx-auto text-center relative z-10">
              <h2 className="text-[clamp(3rem,8vw,7rem)] font-black text-white tracking-tighter leading-[0.9] mb-16">
                Start closing more <br /> sales today.
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <button className="px-12 py-6 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl">
                  Get Started For Free
                </button>
                <button className="px-12 py-6 bg-black border border-white/20 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                  Book a Demo
                </button>
              </div>
            </div>
          </section>


          {/* --- FOOTER --- */}
          < footer className="bg-white py-24 px-6 border-t border-black/5" >
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-16 mb-24">
                <div className="col-span-2">
                  <Link href="/" className="flex items-center gap-2 mb-8 group">
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white">
                      <Zap size={18} fill="currentColor" />
                    </div>
                    <span className="text-xl font-black tracking-tighter text-black uppercase">Auromind</span>
                  </Link>
                  <p className="text-black/40 text-sm font-medium max-w-xs leading-relaxed">
                    The leading AI-powered WhatsApp automation platform for sales-driven businesses.
                  </p>
                </div>

                {[
                  { title: 'Product', links: ['Automation', 'InBox', 'API', 'Pricing'] },
                  { title: 'Solutions', links: ['E-commerce', 'Real Estate', 'Agencies', 'SaaS'] },
                  { title: 'Resources', links: ['Blog', 'Docs', 'Guides', 'Support'] },
                  { title: 'Company', links: ['About', 'Contact', 'Careers', 'Legal'] }
                ].map(col => (
                  <div key={col.title}>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-black mb-10">{col.title}</h5>
                    <ul className="space-y-4">
                      {col.links.map(link => (
                        <li key={link}>
                          <Link href="#" className="text-sm text-black/40 hover:text-black font-medium transition-colors">{link}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="pt-12 border-t border-black/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-[10px] font-black uppercase tracking-widest text-black/30">
                  © 2026 Auromind. Meta Business Partner.
                </div>
                <div className="flex gap-10">
                  {['Instagram', 'WhatsApp', 'LinkedIn', 'Twitter'].map(social => (
                    <Link key={social} href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30 hover:text-black transition-colors">{social}</Link>
                  ))}
                </div>
              </div>
            </div>
          </footer >
        </div>
      </div>
    </main >
  );
}

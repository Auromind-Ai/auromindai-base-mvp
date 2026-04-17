'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, Video, Send } from 'lucide-react';

const SeeItInActionSection = () => {
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

export default SeeItInActionSection;
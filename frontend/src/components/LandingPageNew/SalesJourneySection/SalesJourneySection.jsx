'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { Poppins, Plus_Jakarta_Sans } from 'next/font/google';
import { useBranding } from '@/context/BrandingContext';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

// The exact 7-step conversational flow for Lead Qualification
const CONVERSATION_STEPS = [
  {
    id: 1,
    sender: 'customer',
    text: "Hi, I’m looking for a sofa for my living room.",
  },
  {
    id: 2,
    sender: 'ai',
    text: "Sure! What size and style are you looking for?",
  },
  {
    id: 3,
    sender: 'customer',
    text: "3-seater, modern style. My budget is around ₹25,000.",
  },
  {
    id: 4,
    sender: 'ai',
    text: "Got it. Would you prefer fabric or leather?",
  },
  {
    id: 5,
    sender: 'customer',
    text: "Fabric would be better.",
  },
  {
    id: 6,
    sender: 'ai',
    text: "Perfect. I found 3 options that match your requirements and budget. Would you like to see them?",
  },
  {
    id: 7,
    sender: 'customer',
    text: "Yes, please.",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 1: Lead Qualification & Automation (Animated Conversation)
───────────────────────────────────────────────────────────────────────────── */
function LeadQualificationAnimatedCard() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [progressStage, setProgressStage] = useState(1); // 1: New Lead, 2: Qualified, 3: Converted
  const [isResetting, setIsResetting] = useState(false);

  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const timers = [];

    const runAnimationSequence = () => {
      if (!isMounted) return;

      // STEP 1 — Customer Initial Message (0s)
      setIsResetting(false);
      setCurrentStepIndex(0);
      setIsTyping(false);
      setProgressStage(1);

      // Show typing indicator before AI Response 1
      timers.push(
        setTimeout(() => {
          if (isMounted) setIsTyping(true);
        }, 1000)
      );

      // STEP 2 — AI Response 1 (2.3s)
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            setIsTyping(false);
            setCurrentStepIndex(1);
          }
        }, 2300)
      );

      // STEP 3 — Customer Qualification Response (3.9s)
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            setCurrentStepIndex(2);
          }
        }, 3900)
      );

      // Show typing indicator before AI Response 2
      timers.push(
        setTimeout(() => {
          if (isMounted) setIsTyping(true);
        }, 4800)
      );

      // STEP 4 — AI Follow-up (6.0s)
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            setIsTyping(false);
            setCurrentStepIndex(3);
          }
        }, 6000)
      );

      // STEP 5 — Customer Response (7.5s)
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            setCurrentStepIndex(4);
            setProgressStage(2); // Progresses towards Qualified
          }
        }, 7500)
      );

      // Show typing indicator before AI Qualification Result
      timers.push(
        setTimeout(() => {
          if (isMounted) setIsTyping(true);
        }, 8400)
      );

      // STEP 6 — AI Qualification Result (9.8s)
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            setIsTyping(false);
            setCurrentStepIndex(5);
          }
        }, 9800)
      );

      // STEP 7 — Customer Confirmation (11.5s)
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            setCurrentStepIndex(6);
            setProgressStage(3); // Lead successfully qualified & converted
          }
        }, 11500)
      );

      // Hold completed state for 4.2 seconds
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            setIsResetting(true);
          }
        }, 15800)
      );

      // Smooth reset and loop again
      timers.push(
        setTimeout(() => {
          if (isMounted) {
            runAnimationSequence();
          }
        }, 16400)
      );
    };

    runAnimationSequence();

    return () => {
      isMounted = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  // Smoothly scroll down as new messages or typing indicator appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [currentStepIndex, isTyping]);

  const visibleMessages = CONVERSATION_STEPS.slice(0, currentStepIndex + 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-[28px] bg-[#110D1D] border border-white/[0.08] hover:border-purple-500/30 p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] min-h-[520px]"
    >
      {/* Ambient inner purple aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(147,51,234,0.38)_0%,rgba(107,33,168,0.18)_40%,transparent_75%)] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      {/* Top Label & Interactive Chat Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <h3 className="text-white/90 text-sm sm:text-[15px] font-semibold tracking-wide text-left mb-3">
          Lead Qualification &amp; Automation
        </h3>

        {/* Chat Stream Viewport */}
        <div
          ref={chatContainerRef}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className={`relative h-[265px] sm:h-[275px] overflow-y-auto space-y-3 pr-1 transition-opacity duration-500 flex flex-col justify-start [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 ${
            isResetting ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {visibleMessages.map((msg, idx) => (
            <motion.div
              key={`${msg.id}-${idx}`}
              initial={{
                opacity: 0,
                x: msg.sender === 'customer' ? -18 : 18,
                y: 8,
              }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`flex w-full ${
                msg.sender === 'customer' ? 'justify-start' : 'justify-end'
              }`}
            >
              {msg.sender === 'customer' ? (
                <div className="bg-black/95 text-white text-[12px] sm:text-[13px] font-normal px-4 py-2.5 rounded-2xl rounded-tl-sm border border-white/10 shadow-md max-w-[86%] leading-snug text-left">
                  {msg.text}
                </div>
              ) : (
                <div className="bg-[#8247E5] text-white text-[12px] sm:text-[13px] font-normal px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-lg max-w-[88%] leading-snug text-left">
                  {msg.text}
                </div>
              )}
            </motion.div>
          ))}

          {/* Three-dot typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, scale: 0.85, x: 12, y: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex justify-start w-full"
              >
                <div className="bg-black text-white px-3.5 py-2.5 rounded-full w-fit flex items-center gap-1.5 shadow-md border border-white/10">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="pt-4 pb-1 mt-auto">
          <div className="relative flex items-center justify-between px-3">
            {/* Background Line */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-white/20 z-0" />

            {/* Active Connecting Line */}
            <motion.div
              className="absolute left-6 top-1/2 -translate-y-1/2 h-[2px] bg-[#8B5CF6] z-0"
              initial={{ width: '0%' }}
              animate={{
                width:
                  progressStage === 1
                    ? '0%'
                    : progressStage === 2
                    ? '50%'
                    : 'calc(100% - 48px)',
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />

            {/* Step 1 Node: New Lead */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-[#8B5CF6] flex items-center justify-center shadow-md transition-all duration-300">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </div>
            </div>

            {/* Step 2 Node: Qualified */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center transition-all duration-500 ${
                  progressStage >= 2
                    ? 'bg-[#8B5CF6] shadow-md shadow-purple-600/30'
                    : 'bg-[#1b1429] border border-white/25'
                }`}
              >
                {progressStage >= 2 ? (
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                )}
              </div>
            </div>

            {/* Step 3 Node: Converted */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full flex items-center justify-center transition-all duration-500 ${
                  progressStage >= 3
                    ? 'bg-[#8B5CF6] shadow-md shadow-purple-600/30'
                    : 'bg-[#1b1429] border border-white/25'
                }`}
              >
                {progressStage >= 3 ? (
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                )}
              </div>
            </div>
          </div>

          {/* Step Labels */}
          <div className="flex justify-between items-center text-[10.5px] sm:text-[11px] font-medium mt-2 px-1">
            <span className="text-white">New Lead</span>
            <span className={progressStage >= 2 ? 'text-white' : 'text-gray-400'}>
              Qualified
            </span>
            <span className={progressStage >= 3 ? 'text-white' : 'text-gray-400'}>
              Converted
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Card Description */}
      <div className="relative z-10 mt-5 pt-2 border-t border-white/[0.04]">
        <p className="text-gray-300/90 text-xs sm:text-[13px] text-center leading-relaxed font-normal">
          Understand every lead and automatically identify high-intent customers.
        </p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 2: Payment (Animated Interactive Payment Flow with Dynamic Top & Bottom)
───────────────────────────────────────────────────────────────────────────── */
function PaymentAnimatedCard() {
  const [paymentState, setPaymentState] = useState('link'); // 'link' | 'clicking' | 'success'

  useEffect(() => {
    let isMounted = true;
    const timers = [];

    const runPaymentLoop = () => {
      if (!isMounted) return;

      // 0s: Start with payment link state ("Payment in chat")
      setPaymentState('link');

      // 1.5s: Cursor approaches and clicks Pay Now button
      timers.push(
        setTimeout(() => {
          if (isMounted) setPaymentState('clicking');
        }, 1500)
      );

      // 2.0s: Transition top to "Payment Status" and bottom to "Payment Successful"
      timers.push(
        setTimeout(() => {
          if (isMounted) setPaymentState('success');
        }, 2000)
      );

      // 4.8s: Seamlessly reset and loop back to payment link
      timers.push(
        setTimeout(() => {
          if (isMounted) runPaymentLoop();
        }, 4800)
      );
    };

    runPaymentLoop();

    return () => {
      isMounted = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-[28px] bg-[#110D1D] border border-white/[0.08] hover:border-purple-500/30 p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] min-h-[520px]"
    >
      {/* Ambient inner purple aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(147,51,234,0.38)_0%,rgba(107,33,168,0.18)_40%,transparent_75%)] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      {/* Top Label & Visual */}
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <h3 className="text-white/90 text-sm sm:text-[15px] font-semibold tracking-wide text-left mb-3">
          Payment
        </h3>

        {/* Payment Flow Visual */}
        <div className="flex flex-col items-center justify-center my-auto py-1">
          {/* Top White Card: Dynamically updates between "Payment in chat" and "Payment Status" */}
          <div className="w-full min-h-[92px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {paymentState === 'success' ? (
                <motion.div
                  key="top-payment-status"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full bg-white rounded-2xl p-4 sm:p-4.5 text-left shadow-xl shadow-black/20 border border-white/80"
                >
                  <h4 className="text-gray-900 font-bold text-sm sm:text-[15px] tracking-tight">
                    Payment Status
                  </h4>
                  <p className="text-gray-600 text-[11px] sm:text-xs leading-relaxed mt-1 font-normal">
                    Payment status is updated instantly, confirming the order as soon as the payment is successful.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="top-payment-in-chat"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full bg-white rounded-2xl p-4 sm:p-4.5 text-left shadow-xl shadow-black/20 border border-white/80"
                >
                  <h4 className="text-gray-900 font-bold text-sm sm:text-[15px] tracking-tight">
                    Payment in chat
                  </h4>
                  <p className="text-gray-600 text-[11px] sm:text-xs leading-relaxed mt-1 font-normal">
                    Once interested, Orbion shares details and the payment link — no follow-up needed.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Vertical Dashed Connecting Line */}
          <div className="my-2.5 flex flex-col items-center justify-center">
            <div className="w-0 h-7 sm:h-9 border-l-2 border-dashed border-emerald-400/90" />
          </div>

          {/* Dynamic Bottom Interactive Payment Card */}
          <div className="w-full min-h-[125px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {paymentState === 'success' ? (
                <motion.div
                  key="payment-success"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full bg-white rounded-2xl p-4 sm:p-4.5 text-left shadow-xl shadow-black/20 border border-white/80 flex items-center gap-3.5"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 22,
                    }}
                    className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </motion.div>
                  <div>
                    <h5 className="text-gray-900 font-bold text-xs sm:text-[13.5px]">
                      Payment Successful!
                    </h5>
                    <p className="text-gray-500 text-[10.5px] sm:text-[11px] font-medium">
                      Your order is confirmed.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="payment-link"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full bg-white rounded-2xl p-3.5 sm:p-4 text-left shadow-xl shadow-black/20 border border-white/80 relative overflow-hidden"
                >
                  {/* Top info */}
                  <div>
                    <p className="text-gray-600 text-[11px] font-medium leading-tight">
                      Here’s your payment link.
                    </p>
                    <p className="text-gray-400 text-[10px] leading-tight mt-0.5">
                      Complete your order securely.
                    </p>
                  </div>

                  {/* Product Price */}
                  <div className="my-2 pt-1.5 border-t border-gray-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                        2,499
                      </span>
                      <span className="text-[10px] text-gray-400 block -mt-0.5 font-medium">
                        Product price
                      </span>
                    </div>
                  </div>

                  {/* Pay Now Button with Cursor Animation */}
                  <div className="relative mt-1">
                    <motion.div
                      animate={{
                        scale: paymentState === 'clicking' ? 0.95 : 1,
                        backgroundColor:
                          paymentState === 'clicking' ? '#6D28D9' : '#8247E5',
                      }}
                      transition={{ duration: 0.15 }}
                      className="w-full bg-[#8247E5] text-white font-semibold text-[11.5px] sm:text-xs py-2 rounded-xl shadow-md text-center flex items-center justify-center cursor-pointer select-none"
                    >
                      Pay Now
                    </motion.div>

                    {/* Animated Mouse Cursor */}
                    <motion.div
                      initial={{ opacity: 0, x: 28, y: 22 }}
                      animate={
                        paymentState === 'clicking'
                          ? { opacity: 1, x: 0, y: 0, scale: 0.88 }
                          : { opacity: 0.85, x: 12, y: 10, scale: 1 }
                      }
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="absolute right-8 top-2 pointer-events-none z-20"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                      >
                        <path
                          d="M5.5 3.5L19 12L12 14L9 20.5L5.5 3.5Z"
                          fill="white"
                          stroke="#1f2937"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Card Description */}
      <div className="relative z-10 mt-5 pt-2 border-t border-white/[0.04]">
        <p className="text-gray-300/90 text-xs sm:text-[13px] text-center leading-relaxed font-normal">
          Move from interested to paid without manual follow-ups.
        </p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN SECTION
───────────────────────────────────────────────────────────────────────────── */
export default function SalesJourneySection() {
  const { appLogoUrl } = useBranding();

  return (
    <section className={`${poppins.className} relative py-20 sm:py-24 md:py-28 overflow-hidden bg-[#0B0B0B]`}>
      {/* Background ambient radial glow matching overall SaaS dark aesthetic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-14 sm:mb-16 md:mb-20"
        >
          {/* Top Pill Badge */}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-md mb-6 shadow-sm">
            <span className="text-xs sm:text-[13px] font-medium text-white/90 tracking-wide">
              The complete sales journey
            </span>
          </div>

          {/* Heading */}
          <h2 className={`${jakarta.className} text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight sm:leading-tight md:leading-tight`}>
            How Conversations Become Customers
          </h2>

          {/* Subtitle */}
          <p className="mt-3.5 text-sm sm:text-base text-gray-400 font-normal max-w-2xl mx-auto">
            One AI. Every conversations. More sales.
          </p>
        </motion.div>

        {/* 3-Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-stretch">
          {/* ════════════════════ Card 1: Lead Qualification & Automation (Animated) ════════════════════ */}
          <LeadQualificationAnimatedCard />

          {/* ════════════════════ Card 2: Payment (Animated Interaction) ════════════════════ */}
          <PaymentAnimatedCard />

          {/* ════════════════════ Card 3: Integration ════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[28px] bg-[#110D1D] border border-white/[0.08] hover:border-purple-500/30 p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] min-h-[520px]"
          >
            {/* Ambient inner purple aura */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(147,51,234,0.38)_0%,rgba(107,33,168,0.18)_40%,transparent_75%)] pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

            {/* Top Label & Visual */}
            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-white/90 text-sm sm:text-[15px] font-semibold tracking-wide text-left mb-4">
                Integration
              </h3>

              {/* Orbital Ecosystem Graphic */}
              <div className="relative w-56 h-56 sm:w-60 sm:h-60 mx-auto flex items-center justify-center my-auto">
                {/* Outer Orbit Track */}
                <div className="absolute inset-0 rounded-full border border-white/20" />

                {/* Inner Orbit Track */}
                <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-white/10" />

                {/* Center Core Ambient Glow */}
                <div className="absolute w-24 h-24 rounded-full bg-purple-500/30 blur-xl pointer-events-none" />

                {/* Center Logo Hub */}
                <div className="relative z-20 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center p-2 shadow-[0_0_24px_rgba(168,85,247,0.7)]">
                  <img
                    src={appLogoUrl || "/logo.png"}
                    alt="Orbion"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/logo.png";
                    }}
                  />
                  <span className="sr-only">Orbion Core</span>
                </div>

                {/* Top Node: Google */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1b122e]/90 backdrop-blur-md border border-white/25 flex items-center justify-center p-2 shadow-lg hover:scale-110 transition-transform duration-200">
                    <img
                      src="/images/integrations/google_calendar.png"
                      alt="Google"
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                </div>

                {/* Right Node: WhatsApp */}
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1b122e]/90 backdrop-blur-md border border-white/25 flex items-center justify-center p-2 shadow-lg hover:scale-110 transition-transform duration-200">
                    <img
                      src="/images/integrations/whatsapp.png"
                      alt="WhatsApp"
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                </div>

                {/* Left Node: Instagram */}
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1b122e]/90 backdrop-blur-md border border-white/25 flex items-center justify-center p-2 shadow-lg hover:scale-110 transition-transform duration-200">
                    <img
                      src="/images/integrations/instagram.png"
                      alt="Instagram"
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                </div>

                {/* Bottom-Left Node: Salesforce / CRM */}
                <div className="absolute bottom-4 left-6 z-10">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1b122e]/90 backdrop-blur-md border border-white/25 flex items-center justify-center p-2 shadow-lg hover:scale-110 transition-transform duration-200">
                    <img
                      src="/images/integrations/salesforce.svg"
                      alt="Salesforce"
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/images/integrations/gdrive.svg";
                      }}
                    />
                  </div>
                </div>

                {/* Bottom-Right Node: Twilio / Integration */}
                <div className="absolute bottom-4 right-6 z-10">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1b122e]/90 backdrop-blur-md border border-white/25 flex items-center justify-center p-2 shadow-lg hover:scale-110 transition-transform duration-200">
                    <img
                      src="/images/integrations/twilio_fixed.svg"
                      alt="Twilio"
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/images/integrations/hubspot.svg";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card Description */}
            <div className="relative z-10 mt-6 pt-2 border-t border-white/[0.04]">
              <p className="text-gray-300/90 text-xs sm:text-[13px] text-center leading-relaxed font-normal">
                Turn qualified conversations into customers, automatically.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

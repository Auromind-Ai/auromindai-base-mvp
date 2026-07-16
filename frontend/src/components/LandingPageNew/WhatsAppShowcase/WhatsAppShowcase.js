'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CreditCard, Check, ShieldCheck, CheckCircle2, ArrowLeft, Video, Phone, Send } from 'lucide-react';
import { Plus_Jakarta_Sans, Poppins } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function WhatsAppShowcase() {
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'payments'

  // Forms state
  const [categories, setCategories] = useState([
    { id: 'cameras', label: 'Cameras', checked: true },
    { id: 'mobiles', label: 'Mobile phones', checked: false },
    { id: 'readers', label: 'eBook readers', checked: false },
    { id: 'accessories', label: 'Accessories', checked: false },
    { id: 'tvs', label: 'TVs', checked: false },
    { id: 'audio', label: 'Home audio', checked: false },
  ]);
  const [name, setName] = useState('Gourav');
  const [email, setEmail] = useState('gourav@example.com');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Payments state
  const [paymentStatus, setPaymentStatus] = useState('pending'); // 'pending' | 'processing' | 'completed'

  const toggleCategory = (id) => {
    if (formSubmitted) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c))
    );
  };

  const handleFormSubmit = () => {
    if (!name || !email || formSubmitted) return;
    setIsSubmittingForm(true);
    setTimeout(() => {
      setIsSubmittingForm(false);
      setFormSubmitted(true);
    }, 1200);
  };

  const handlePayment = () => {
    if (paymentStatus !== 'pending') return;
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('completed');
    }, 1800);
  };

  // Reset states when switching tabs
  useEffect(() => {
    setFormSubmitted(false);
    setIsSubmittingForm(false);
    setPaymentStatus('pending');
  }, [activeTab]);

  return (
    <section className={`${poppins.className} relative py-20 md:py-28 bg-black overflow-hidden border-b border-white/[0.04]`}>
      {/* Background glow blob */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-700/10 blur-[150px]" />
        <div className="absolute bottom-[20%] left-[5%] w-[450px] h-[450px] rounded-full bg-indigo-700/10 blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-semibold text-purple-300 tracking-wider uppercase mb-5">
            <MessageSquare size={12} className="text-purple-400" />
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Conversational Commerce Redefined
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Turn WhatsApp into your most productive sales channel. Build forms, collect payments, and close deals directly in chat.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center justify-center gap-3 mb-16 max-w-md mx-auto bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'forms'
                ? 'bg-[#814AC8] text-white shadow-lg shadow-[#814AC8]/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <MessageSquare size={15} />
            Interactive Forms
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'payments'
                ? 'bg-[#814AC8] text-white shadow-lg shadow-[#814AC8]/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <CreditCard size={15} />
            WhatsApp Payments
          </button>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Context Copy Panel */}
          <div className="lg:col-span-6 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'forms' ? (
                <motion.div
                  key="forms-text"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-zinc-300">
                    <span>Forms Engine</span>
                  </div>
                  <h3 className={`${jakarta.className} text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight`}>
                    Build Interactive <span className="bg-gradient-to-r from-[#C084FC] to-[#818CF8] bg-clip-text text-transparent">WhatsApp Forms</span>
                  </h3>
                  <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
                    Capture qualified leads and valuable business data directly inside the conversation. From event registration to customer interest surveys, collect it all cleanly on WhatsApp with 3x higher response rates.
                  </p>
                  
                  {/* Key points */}
                  <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#814AC8]/20 flex items-center justify-center mt-1 shrink-0">
                        <Check size={10} className="text-[#A855F7]" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm">Interactive Checklists</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">Let users select interests, categories, or options with simple click-to-check options.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#814AC8]/20 flex items-center justify-center mt-1 shrink-0">
                        <Check size={10} className="text-[#A855F7]" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm">Frictionless Lead Capture</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">Automate registrations and lead forms without sending prospects to external landing pages.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="payments-text"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-zinc-300">
                    <span>Instant Payments</span>
                  </div>
                  <h3 className={`${jakarta.className} text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight`}>
                    Grow Faster with <span className="bg-gradient-to-r from-[#C084FC] to-[#818CF8] bg-clip-text text-transparent">WhatsApp Payments</span>
                  </h3>
                  <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
                    Power up your WhatsApp chats with integrated payment support. Send product catalog links, handle checkouts, verify UPI/card transactions, and automatically deliver receipts instantly.
                  </p>
                  
                  {/* Key points */}
                  <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#814AC8]/20 flex items-center justify-center mt-1 shrink-0">
                        <Check size={10} className="text-[#A855F7]" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm">Single-Tap Checkout</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">Let customers purchase directly within the chat window for maximum conversion.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#814AC8]/20 flex items-center justify-center mt-1 shrink-0">
                        <Check size={10} className="text-[#A855F7]" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm">Automated Payment Verification</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">AI verifies receipts and payments instantly, triggering fulfillment without manual checks.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: High Fidelity Interactive Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-[#0c0c11] rounded-[42px] border-[8px] border-[#1d1d26] shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
              
              {/* iPhone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1d1d26] rounded-b-2xl z-30 flex items-center justify-center">
                <div className="w-12 h-1.5 bg-[#0a0a0f] rounded-full" />
              </div>

              {/* Status Bar */}
              <div className="h-9 bg-[#0b0a11]/90 backdrop-blur px-6 flex items-center justify-between text-white/90 text-xs font-semibold select-none z-20 shrink-0">
                <span>9:05</span>
                <div className="flex items-center gap-1.5">
                  {/* Wifi icon */}
                  <span className="w-3.5 h-3 bg-white/20 rounded-sm inline-block" />
                  {/* Battery */}
                  <span className="w-5 h-2.5 border border-white/40 rounded-sm inline-block p-[1px]">
                    <span className="h-full w-[80%] bg-white rounded-2xs block" />
                  </span>
                </div>
              </div>

              {/* Chat Window Header */}
              <div className="h-14 bg-[#14131b]/95 border-b border-white/[0.06] px-4 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-2">
                  <ArrowLeft size={16} className="text-white/80 cursor-pointer" />
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs select-none">
                    <span>O</span>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-[#14131b]" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs">Orbion AI Agent</h4>
                    <span className="text-[10px] text-green-400">online</span>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 text-white/70">
                  <Video size={15} />
                  <Phone size={13} />
                </div>
              </div>

              {/* Chat Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0f] relative">
                {/* Background Pattern Mask */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                <AnimatePresence mode="wait">
                  {activeTab === 'forms' ? (
                    <motion.div
                      key="forms-chat"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 relative z-10"
                    >
                      {/* Message 1: Left */}
                      <div className="flex flex-col items-start max-w-[85%]">
                        <div className="bg-zinc-900 border border-white/[0.04] rounded-2xl rounded-tl-none p-3.5 text-xs text-white/90 leading-relaxed">
                          Hello Gourav! Let us know which category you're interested in:
                        </div>
                      </div>

                      {/* Interactive Category List Card */}
                      <div className="bg-[#111116] border border-white/[0.08] rounded-2xl p-4 space-y-3.5 shadow-lg max-w-[95%]">
                        <p className="text-[10px] font-bold text-[#A855F7] tracking-wider uppercase">Select Categories</p>
                        <div className="space-y-2">
                          {categories.map((c) => (
                            <button
                              key={c.id}
                              disabled={formSubmitted}
                              onClick={() => toggleCategory(c.id)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                                c.checked
                                  ? 'bg-[#814AC8]/10 border-[#814AC8]/40 text-white'
                                  : 'bg-white/[0.02] border-white/[0.04] text-zinc-400 hover:bg-white/[0.04]'
                              }`}
                            >
                              <span className="text-xs font-semibold">{c.label}</span>
                              <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                c.checked 
                                  ? 'bg-[#814AC8] border-[#814AC8] text-white' 
                                  : 'border-zinc-600 bg-transparent'
                              }`}>
                                {c.checked && <Check size={10} strokeWidth={3} />}
                              </span>
                            </button>
                          ))}
                        </div>

                        {!formSubmitted && (
                          <button
                            onClick={handleFormSubmit}
                            disabled={isSubmittingForm}
                            className="w-full bg-[#814AC8] hover:bg-[#8d58d1] text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-[#814AC8]/25 flex items-center justify-center gap-2"
                          >
                            {isSubmittingForm ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Confirm Choice'
                            )}
                          </button>
                        )}
                      </div>

                      {/* Registration Form Card */}
                      <div className="bg-[#111116] border border-white/[0.08] rounded-2xl p-4 space-y-3.5 shadow-lg max-w-[95%]">
                        <p className="text-[10px] font-bold text-[#A855F7] tracking-wider uppercase">Register For Deals</p>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">Your Name</label>
                            <input
                              type="text"
                              value={name}
                              disabled={formSubmitted}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#814AC8] font-sans"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-1">Your Email</label>
                            <input
                              type="email"
                              value={email}
                              disabled={formSubmitted}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#814AC8] font-sans"
                            />
                          </div>
                        </div>

                        {!formSubmitted && (
                          <button
                            onClick={handleFormSubmit}
                            disabled={isSubmittingForm}
                            className="w-full bg-[#814AC8] hover:bg-[#8d58d1] text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-[#814AC8]/25 flex items-center justify-center gap-2"
                          >
                            {isSubmittingForm ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Submit Details'
                            )}
                          </button>
                        )}
                      </div>

                      {/* Success Responses */}
                      {formSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          <div className="flex flex-col items-end max-w-[85%] ml-auto">
                            <div className="bg-[#814AC8] text-white rounded-2xl rounded-tr-none p-3.5 text-xs shadow-md">
                              Categories confirmed &amp; registered! ✓
                            </div>
                          </div>
                          <div className="flex flex-col items-start max-w-[85%]">
                            <div className="bg-zinc-900 border border-white/[0.04] rounded-2xl rounded-tl-none p-3.5 text-xs text-white/90 leading-relaxed">
                              Sounds great, {name}! Let me register you with email {email}. You will receive early updates on the categories you selected.
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="payments-chat"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 relative z-10"
                    >
                      {/* Message 1: Left */}
                      <div className="flex flex-col items-start max-w-[85%]">
                        <div className="bg-zinc-900 border border-white/[0.04] rounded-2xl rounded-tl-none p-3.5 text-xs text-white/90 leading-relaxed">
                          Sounds great 😊 Let me create an order and you can pay here.
                        </div>
                      </div>

                      {/* Product Card */}
                      <div className="bg-[#111116] border border-white/[0.08] rounded-2xl overflow-hidden shadow-lg max-w-[95%]">
                        <div className="relative w-full aspect-square bg-[#07070a]">
                          <img
                            src="/images/smartwatch.png"
                            alt="Smartwatch product"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-white font-bold text-sm">FitPro X1</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Premium Smartwatch</p>
                            </div>
                            <span className="text-[#C084FC] font-extrabold text-sm">₹2,500</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs border-t border-white/[0.04] pt-3 text-zinc-400">
                            <span>Quantity: 1</span>
                            <span className="font-semibold text-white">Total: ₹2,500</span>
                          </div>

                          {paymentStatus === 'pending' && (
                            <button
                              onClick={handlePayment}
                              className="w-full bg-[#814AC8] hover:bg-[#8d58d1] text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-[#814AC8]/25"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Payment Processing State */}
                      {paymentStatus === 'processing' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#111116] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-center gap-3 max-w-[95%]"
                        >
                          <span className="w-4.5 h-4.5 border-2 border-[#814AC8] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-zinc-300 font-semibold">Processing Secure Checkout...</span>
                        </motion.div>
                      )}

                      {/* Payment Status Card (Completed) */}
                      {paymentStatus === 'completed' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                          className="bg-[#111116] border border-[#22c55e]/30 rounded-2xl p-4 space-y-3.5 shadow-lg max-w-[95%] relative overflow-hidden"
                        >
                          {/* Success green glow background */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl pointer-events-none" />

                          <div className="flex items-center gap-2 text-green-400">
                            <ShieldCheck size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Payment Verified</span>
                          </div>
                          
                          <div className="space-y-1.5">
                            <h4 className="text-white font-bold text-xs">Headway Inc.</h4>
                            <p className="text-[10px] text-zinc-400">FitPro X1 (Qty 1) • ₹2,500</p>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                            <span className="text-[10px] text-zinc-500">Receipt ID: #HW-8849</span>
                            <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold">
                              <CheckCircle2 size={13} />
                              <span>Completed</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Success response bubble */}
                      {paymentStatus === 'completed' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex flex-col items-start max-w-[85%]"
                        >
                          <div className="bg-zinc-900 border border-white/[0.04] rounded-2xl rounded-tl-none p-3.5 text-xs text-white/90 leading-relaxed">
                            Thank you! Payment of ₹2,500 verified successfully. We are preparing your order. 🚀
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chat Input Bar */}
              <div className="h-16 bg-[#14131b]/95 border-t border-white/[0.06] px-4 flex items-center justify-between gap-3 shrink-0 z-20">
                <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-full h-10 px-4 flex items-center text-zinc-500 text-xs select-none">
                  <span>Type a message...</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#814AC8] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#814AC8]/20">
                  <Send size={15} className="ml-[1px]" />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

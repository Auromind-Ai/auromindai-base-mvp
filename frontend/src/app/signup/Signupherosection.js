'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus_Jakarta_Sans } from 'next/font/google';


const jakarta = Plus_Jakarta_Sans({ 
    subsets: ['latin'], 
    weight: ['400', '500', '600', '700', '800'] 
});

export default function SignupHeroSection() {
    const appName = "Orbion Agents";

    return (
        <div className={`hidden lg:flex lg:w-[48%] xl:w-[46%] 2xl:w-[45%] h-screen flex-col justify-between p-5 xl:p-8 relative bg-[#06050C] overflow-hidden select-none sticky top-0 ${jakarta.className}`}>
            
            {/* SVG Linear Gradient Definition for Glowing Orbion Logo Colors */}
            <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
                <defs>
                    <linearGradient id="orbionLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e879f9" />
                        <stop offset="35%" stopColor="#c084fc" />
                        <stop offset="70%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Ambient background glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[380px] h-[380px] bg-purple-600/[0.14] rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-[35%] right-[-10%] w-[400px] h-[400px] bg-fuchsia-600/[0.08] rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[10%] w-[350px] h-[350px] bg-indigo-600/[0.09] rounded-full blur-[130px] pointer-events-none" />

            {/* Top Bar: Brand Logo */}
            <div className="relative z-10 shrink-0 flex items-center justify-between w-full">
                <Link href="/" className="inline-flex items-center gap-2.5 group">
                    <img 
                        src="/logo.png" 
                        alt={appName} 
                        className="h-8 xl:h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-all duration-300" 
                    />
                    <div className="flex items-center">
                        <span className="text-[19px] xl:text-[21px] font-extrabold tracking-[0.05em] text-white">
                            ORBION
                        </span>
                        <span className="ml-2 text-[19px] xl:text-[21px] font-extrabold tracking-[0.08em] bg-gradient-to-r from-[#c084fc] via-[#a855f7] to-[#818cf8] bg-clip-text text-transparent">
                            AGENTS
                        </span>
                    </div>
                </Link>
            </div>

            {/* Main Middle Content - neatly centered with no scroll */}
            <div className="relative z-10 flex flex-col justify-center my-auto max-w-[480px] w-full mx-auto gap-3.5 xl:gap-4 py-1">
                
                {/* Headline: WhatsApp in glowing purple */}
                <div>
                    <h1 className="text-2xl sm:text-3xl xl:text-[34px] font-extrabold text-white leading-[1.18] tracking-tight">
                        Experience the future of<br />
                        <span className="bg-gradient-to-r from-[#e879f9] via-[#c084fc] to-[#a855f7] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(192,132,252,0.5)]">
                            WhatsApp
                        </span>{' '}
                        <span className="text-white">
                            Marketing
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-xs xl:text-[13px] font-normal leading-relaxed pt-1.5">
                        Automate every conversation, capture high-intent leads, and launch bulk campaigns from one unified inbox.
                    </p>
                </div>

                {/* Eyebrow Label */}
                <div className="text-[10px] xl:text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-400 pt-0.5">
                    YOUR FREE FOREVER PLAN INCLUDES
                </div>

                {/* The 3 Core Feature Cards with Glowing Logo-Color Icons */}
                <div className="flex flex-col gap-2.5 xl:gap-3">
                    
                    {/* 1. FREE WhatsApp Business API */}
                    <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                        className="p-3.5 xl:p-4 rounded-[16px] bg-[#121118] hover:bg-[#161520] border border-white/[0.08] hover:border-purple-500/40 transition-all duration-300 flex items-center gap-3.5 shadow-lg group"
                    >
                        {/* Squircle with rich glowing logo gradient and purple aura */}
                        <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-purple-900/45 via-[#1b1035] to-[#2e1065]/50 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(168,85,247,0.35),inset_0_1px_2px_rgba(255,255,255,0.2)] group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.55)] transition-all">
                            <svg className="w-5 h-5 xl:w-6 xl:h-6 drop-shadow-[0_0_10px_rgba(192,132,252,0.85)]" viewBox="0 0 24 24">
                                <path fill="url(#orbionLogoGrad)" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path fill="url(#orbionLogoGrad)" d="M12 0C5.373 0 0 5.373 0 12c0 2.127.556 4.126 1.526 5.859L.057 23.572a.75.75 0 00.92.92l5.713-1.469A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 01-5.098-1.397l-.364-.217-3.763.967.996-3.649-.237-.376A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-white font-bold text-sm xl:text-[15px] tracking-tight">
                                FREE WhatsApp Business API
                            </h3>
                            <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                                Instant verification & official setup with Meta
                            </p>
                        </div>
                    </motion.div>

                    {/* 2. Advanced AI Automation */}
                    <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.18 }}
                        className="p-3.5 xl:p-4 rounded-[16px] bg-[#121118] hover:bg-[#161520] border border-white/[0.08] hover:border-purple-500/40 transition-all duration-300 flex items-center gap-3.5 shadow-lg group"
                    >
                        {/* Squircle with rich glowing logo gradient and purple aura */}
                        <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-purple-900/45 via-[#1b1035] to-[#2e1065]/50 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(168,85,247,0.35),inset_0_1px_2px_rgba(255,255,255,0.2)] group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.55)] transition-all">
                            <svg className="w-5 h-5 xl:w-6 xl:h-6 drop-shadow-[0_0_10px_rgba(192,132,252,0.85)]" viewBox="0 0 24 24" fill="none" stroke="url(#orbionLogoGrad)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                                <path d="M5 3v4"/>
                                <path d="M19 17v4"/>
                                <path d="M3 5h4"/>
                                <path d="M17 19h4"/>
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-white font-bold text-sm xl:text-[15px] tracking-tight">
                                Advanced AI Automation
                            </h3>
                            <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                                24/7 AI-powered replies, smart bots & lead qualification
                            </p>
                        </div>
                    </motion.div>

                    {/* 3. Bulk Messages */}
                    <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.26 }}
                        className="p-3.5 xl:p-4 rounded-[16px] bg-[#121118] hover:bg-[#161520] border border-white/[0.08] hover:border-purple-500/40 transition-all duration-300 flex items-center gap-3.5 shadow-lg group"
                    >
                        {/* Squircle with rich glowing logo gradient and purple aura */}
                        <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-gradient-to-br from-purple-900/45 via-[#1b1035] to-[#2e1065]/50 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-[0_0_22px_rgba(168,85,247,0.35),inset_0_1px_2px_rgba(255,255,255,0.2)] group-hover:scale-105 group-hover:shadow-[0_0_28px_rgba(168,85,247,0.55)] transition-all">
                            <svg className="w-5 h-5 xl:w-5.5 xl:h-5.5 ml-0.5 drop-shadow-[0_0_10px_rgba(192,132,252,0.85)]" viewBox="0 0 24 24" fill="none" stroke="url(#orbionLogoGrad)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m22 2-7 20-4-9-9-4Z" />
                                <path d="M22 2 11 13" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-white font-bold text-sm xl:text-[15px] tracking-tight">
                                High-Speed Bulk Messages
                            </h3>
                            <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                                Broadcast targeted campaigns to thousands with 98% open rates
                            </p>
                        </div>
                    </motion.div>

                </div>

            </div>

            {/* Bottom: Official Meta Tech Partner Badge */}
            <div className="relative z-10 shrink-0 pt-2 pb-1 flex justify-center">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#111019] hover:bg-[#161424] border border-white/[0.09] hover:border-[#0081FB]/40 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_15px_rgba(0,129,251,0.15)] transition-all duration-300 group">
                    {/* Official Meta 3D Logo */}
                    <img 
                        src="/meta-logo.png" 
                        alt="Meta" 
                        className="h-4.5 w-auto object-contain shrink-0 drop-shadow-[0_0_8px_rgba(0,129,251,0.6)] group-hover:scale-105 transition-transform" 
                    />
                    <span className="text-xs sm:text-[13px] font-semibold text-white/90 tracking-wide">
                        Meta Tech Partner
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0081FB] shadow-[0_0_6px_#0081FB]" />
                </div>
            </div>

        </div>
    );
}
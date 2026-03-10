'use client';

import { TrendingUp, BarChart3, Target, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function MarketingPage() {
    return (
        <div className="w-full max-w-[1400px] mx-auto px-6">

            {/* TOP GRADIENT SECTION */}
            <div className="relative overflow-hidden rounded-2xl mb-10 
            bg-gradient-to-r from-[#0B1220] via-[#0E1A33] to-[#14284D] 
            p-6 shadow-xl">

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-1 font-display tracking-tight">
                        Digital Marketing Assistant
                    </h1>
                    <p className="text-slate-300">
                        Smarter ads and SEO, with human control.
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                            <AlertCircle size={24} />
                        </div>

                        <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">
                                Connect Your Ad Accounts
                            </h3>

                            <p className="text-sm text-slate-300 mb-5">
                                Connect Meta Ads and Google Ads to enable AI-powered campaign suggestions and performance insights.
                            </p>

                            <div className="flex gap-4">
                                <button className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition">
                                    <ExternalLink size={16} />
                                    Connect Meta Ads
                                </button>

                                <button className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition">
                                    <ExternalLink size={16} />
                                    Connect Google Ads
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* WHAT YOU'LL GET SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] lg:grid-rows-[auto_1fr] gap-8">

                {/* LEFT ROW 1 */}
                <div>
                    <h2 className="text-3xl font-bold text-white mb-3">
                        What You'll Get
                    </h2>

                    <p className="text-slate-400 mb-8 max-w-xl">
                        Unlock powerful AI tools to manage your marketing campaigns,
                        optimise ad spend and grow your business faster with AuroMind.
                    </p>
                </div>

                {/* RIGHT SIDE CARD (spans 2 rows) */}
                <div className="sparkle-card rounded-2xl border border-white/10 
                bg-gradient-to-b from-[#0B1220] via-[#0E1A33] to-[#14284D] 
                p-8 text-center flex flex-col items-center justify-center
                lg:row-span-2">

                    <div className="relative z-10 flex flex-col items-center justify-center flex-1">

                        <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mb-6">
                            <TrendingUp size={36} className="text-indigo-400"/>
                        </div>

                        <h3 className="text-xl font-semibold text-white mb-2">
                            No campaigns to show
                        </h3>

                        <p className="text-sm text-slate-400 mb-6 max-w-xs">
                            Connect your ad accounts above to start seeing your campaigns
                            and AI-powered insights.
                        </p>

                        <div className="flex gap-2">
                            <div className="w-2 h-2 bg-white/20 rounded-full"/>
                            <div className="w-2 h-2 bg-white/20 rounded-full"/>
                            <div className="w-2 h-2 bg-white/20 rounded-full"/>
                        </div>

                    </div>
                </div>

                {/* LEFT ROW 2 (feature cards) */}
                <div className="grid grid-cols-3 gap-5 auto-rows-fr">

                    <div className="sparkle-card rounded-xl p-6 border border-white/10 
                    bg-gradient-to-r from-[#0B1220] via-[#0E1A33] to-[#14284D] 
                    shadow-sm hover:shadow-lg transition group flex flex-col">

                        <div className="relative z-10">

                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                            <BarChart3 size={20}/>
                        </div>

                        <h3 className="font-semibold text-white mb-1">
                            Performance Dashboard
                        </h3>

                        <p className="text-sm text-gray-400">
                            Real-time ad spend, ROAS, and conversion metrics.
                        </p>

                    </div>
                    </div>

                    <div className="sparkle-card rounded-xl p-6 border border-white/10 
                    bg-gradient-to-r from-[#0B1220] via-[#0E1A33] to-[#14284D] 
                    shadow-sm hover:shadow-lg transition group flex flex-col">

                        <div className="relative z-10">

                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                            <Target size={20}/>
                        </div>

                        <h3 className="font-semibold text-white mb-1">
                            AI Suggestions
                        </h3>

                        <p className="text-sm text-gray-400">
                            Budget allocation and audience targeting recommendations.
                        </p>

                    </div>
                    </div>

                    <div className="sparkle-card rounded-xl p-6 border border-white/10 
                    bg-gradient-to-r from-[#0B1220] via-[#0E1A33] to-[#14284D] 
                    shadow-sm hover:shadow-lg transition group flex flex-col">

                        <div className="relative z-10">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                            <Zap size={20}/>
                        </div>

                        <h3 className="font-semibold text-white mb-1">
                            Quick Actions
                        </h3>

                        <p className="text-sm text-gray-400">
                            One-click pause, boost, or duplicate campaigns.
                        </p>

                    </div>
                    </div>

                </div>

            </div>

        </div>
    );
}
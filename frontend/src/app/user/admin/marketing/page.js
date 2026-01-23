'use client';

import { TrendingUp, BarChart3, Target, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function MarketingPage() {
    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8 p-4">
                <h1 className="text-2xl font-bold text-[#D4D4D4] mb-1 font-display tracking-tight">Digital Marketing Assistant</h1>
                <p className="text-[#9b9b9b] font-medium">Smarter ads and SEO, with human control.</p>
            </div>

            {/* Connection Status */}
            {/* Connection Status */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 mb-8 mx-4 shadow-lg shadow-amber-900/5">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-sm">
                        <AlertCircle size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-amber-200/90 mb-1 tracking-tight">Connect Your Ad Accounts</h3>
                        <p className="text-sm text-amber-100/60 mb-5 font-medium leading-relaxed">
                            Connect Meta Ads and Google Ads to enable AI-powered campaign suggestions and performance insights.
                        </p>
                        <div className="flex gap-4">
                            <button className="inline-flex items-center gap-2 px-6 py-2 bg-[#2c2c2c] hover:bg-[#3f3f3f] border border-[#3f3f3f] rounded-xl text-xs font-bold text-[#D4D4D4] transition-all active:scale-95 shadow-sm">
                                <ExternalLink size={16} />
                                Connect Meta Ads
                            </button>
                            <button className="inline-flex items-center gap-2 px-6 py-2 bg-[#2c2c2c] hover:bg-[#3f3f3f] border border-[#3f3f3f] rounded-xl text-xs font-bold text-[#D4D4D4] transition-all active:scale-95 shadow-sm">
                                <ExternalLink size={16} />
                                Connect Google Ads
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Preview */}
            {/* Feature Preview */}
            <h2 className="text-sm font-bold text-[#565656] uppercase tracking-[0.2em] mb-4 p-4">What You&apos;ll Get</h2>
            <div className="grid grid-cols-3 gap-4 mb-8 p-4">
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm hover:bg-[#252525] transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                        <BarChart3 size={20} />
                    </div>
                    <h3 className="font-bold text-[#D4D4D4] mb-1 tracking-tight">Performance Dashboard</h3>
                    <p className="text-xs text-[#787878] font-medium leading-relaxed">Real-time ad spend, ROAS, and conversion metrics.</p>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm hover:bg-[#252525] transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                        <Target size={20} />
                    </div>
                    <h3 className="font-bold text-[#D4D4D4] mb-1 tracking-tight">AI Suggestions</h3>
                    <p className="text-xs text-[#787878] font-medium leading-relaxed">Budget allocation and audience targeting recommendations.</p>
                </div>
                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--notion-border)] shadow-sm hover:bg-[#252525] transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                        <Zap size={20} />
                    </div>
                    <h3 className="font-bold text-[#D4D4D4] mb-1 tracking-tight">Quick Actions</h3>
                    <p className="text-xs text-[#787878] font-medium leading-relaxed">One-click pause, boost, or duplicate campaigns.</p>
                </div>
            </div>

            {/* Empty State */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--notion-border)] p-12 text-center mx-4 shadow-xl">
                <div className="w-20 h-20 rounded-[2rem] bg-[#2c2c2c] flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-2xl border border-[#3f3f3f]">
                    <TrendingUp size={36} className="text-[#3f3f3f]" />
                </div>
                <h3 className="text-xl font-bold text-[#D4D4D4] mb-2 tracking-tight font-display">No campaigns to show</h3>
                <p className="text-sm font-medium text-[#787878] mb-8 max-w-sm mx-auto leading-relaxed">
                    Connect your ad accounts above to start seeing your campaigns and AI-powered insights.
                </p>
                <div className="flex justify-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#2f2f2f]" />
                    <div className="w-2 h-2 rounded-full bg-[#2f2f2f]" />
                    <div className="w-2 h-2 rounded-full bg-[#2f2f2f]" />
                </div>
            </div>
        </div>
    );
}

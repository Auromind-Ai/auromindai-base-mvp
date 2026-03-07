'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  MessageSquare,
  Zap,
  ShieldCheck,
  Check,
  Mail,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function LandingPage() {
  const [pricing, setPricing] = useState({
    free_plan_price: 0.0,
    pro_plan_price: 1000.0,
    enterprise_plan_price: 10000.0,
    token_limit_per_plan: { free: 10000, pro: 100000, enterprise: 1000000 }
  });

 useEffect(() => {
  const fetchPricing = async () => {
    try {
      const response = await fetch("http://localhost:8000/public/pricing");

      if (response.ok) {
        const data = await response.json();
        setPricing(data);
      }

    } catch (error) {
      console.error("Failed to fetch pricing:", error);
    }
  };

  fetchPricing();

}, []);

return (
  <div className="min-h-screen bg-black text-slate-200 selection:bg-indigo-500/30">
      {/* Mesh Gradient Background Removed for Minimal Look */}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
              <Cpu className="text-white" size={18} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Auromind</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#governance" className="hover:text-white">Governance</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-sm shadow-lg shadow-indigo-500/10">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-indigo-500/10 border border-indigo-500/10 text-indigo-400 text-xs font-semibold mb-12">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            New: Agentic Governance Layer Enabled
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold text-white tracking-tight leading-[1.05] mb-12">
            AI That Follows Up,<br />
            <span className="text-slate-400">
              So You Don't Have To
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-16 leading-relaxed">
            Automate customer follow-ups, optimize marketing, and track commitments—all
            governed by AI you can trust and control.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <Link href="/signup" className="group w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-sm shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2">
              Start Free Trial
              <ArrowRight size={20} />
            </Link>
            <button className="w-full sm:w-auto px-10 py-5 bg-black hover:bg-white/5 text-white font-semibold rounded-sm border border-white/10 flex items-center justify-center">
              Request Demo
            </button>
          </div>
          <p className="text-slate-600 text-sm">
            No credit card required • Free 14-day trial
          </p>
        </div>
      </section>

      {/* Value Propositions */}
      <section id="features" className="py-32 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Powered by AI. Controlled by You.</h2>
            <p className="text-slate-500 text-lg">The first AI workforce with human-in-the-loop governance.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Card 1 */}
            <div className="p-10 rounded-sm bg-white/[0.02] border border-white/5 group">
              <div className="w-12 h-12 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-8">
                <Mail size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-5">Never Miss a Follow-Up</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                AI automatically follows up with leads when they go silent. Every message
                is reviewed by our governance layer before sending.
              </p>
              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Smart timing based on engagement</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Auto-stop when customer replies</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Human approval for sensitive leads</li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-purple-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">AI-Assisted Marketing</h3>
              <p className="text-slate-400 mb-6 leading-relaxed text-sm">
                Get intelligent suggestions for ad optimization and SEO improvements.
                Nothing executes without your explicit approval.
              </p>
              <ul className="space-y-3 text-sm text-slate-500">
                <li className="flex items-center gap-2"><Check size={16} className="text-purple-500" /> Monitor ad spend across platforms</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-purple-500" /> AI suggests budget adjustments</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-purple-500" /> You approve every change</li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-pink-500/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Founder Assistant</h3>
              <p className="text-slate-400 mb-6 leading-relaxed text-sm">
                Never forget a commitment. AI extracts promises from your messages and
                sends daily reminders until resolved.
              </p>
              <ul className="space-y-3 text-sm text-slate-500">
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-500" /> Auto-detect promises from text</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-500" /> Daily reminders & tracking</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-500" /> Complete control over what's saved</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">Scale your AI workforce as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center">
              <h3 className="text-lg font-semibold text-slate-400 mb-6">Starter</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-extrabold text-white text-3xl">₹{pricing.free_plan_price.toFixed(2)}</span>
                <span className="text-slate-500 font-medium">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 text-sm text-slate-400 w-full">
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Unified Inbox (all channels)</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> AI Follow-ups (up to 100/mo)</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Founder Assistant</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Basic Analytics</li>
              </ul>
              <Link href="/signup" className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors text-center border border-slate-700">
                Get Started
              </Link>
            </div>

            {/* Professional */}
            <div className="p-10 rounded-3xl bg-indigo-600/10 border-2 border-indigo-600 relative flex flex-col items-center overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                  Popular
                </div>
              </div>
              <h3 className="text-lg font-semibold text-indigo-400 mb-6">Professional</h3>
              <div className="flex items-baseline gap-1 mb-8 text-3xl">
                <span className="text-5xl font-extrabold text-white">₹{pricing.pro_plan_price.toFixed(2)}</span>
                <span className="text-slate-500 font-medium">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 text-sm text-slate-400 w-full">
                <li className="flex items-center gap-3 text-slate-200"><Check size={16} className="text-indigo-500" /> Everything in Starter</li>
                <li className="flex items-center gap-3 text-slate-200"><Check size={16} className="text-indigo-500" /> Unlimited AI Follow-ups</li>
                <li className="flex items-center gap-3 text-slate-200"><Check size={16} className="text-indigo-500" /> Marketing Bot (AI suggestions)</li>
                <li className="flex items-center gap-3 text-slate-200"><Check size={16} className="text-indigo-500" /> Advanced RAG/Brain</li>
              </ul>
              <Link href="/signup" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 text-center">
                Get Started
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center">
              <h3 className="text-lg font-semibold text-slate-400 mb-6">Enterprise</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-extrabold text-white">
                  {pricing.enterprise_plan_price > 0 ? `₹${pricing.enterprise_plan_price.toFixed(2)}` : 'Custom'}
                </span>
                {pricing.enterprise_plan_price > 0 && <span className="text-slate-500 font-medium">/mo</span>}
              </div>
              <ul className="space-y-4 mb-10 text-sm text-slate-400 w-full">
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Dedicated support</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> Custom MCP rules</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> On-premise deployment</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-indigo-500" /> SLA guarantee</li>
              </ul>
              <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-700">
                Contact Sales
              </button>
            </div>
          </div>
        </div>         
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Cpu className="text-white" size={18} strokeWidth={2.5} />
                </div>
                <span className="text-xl font-bold text-white tracking-tight text-3xl">Auromind</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Empowering businesses with agentic AI workforce,
                governed by human intelligence.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Product</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Support</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">API Docs</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Legal</h4>
                <ul className="space-y-2 text-sm text-slate-500">
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">DPA</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">&copy; 2026 Auromind Labs. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <div className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors" />
              <div className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors" />
              <div className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple fallback for missing icon
function CheckCircle2({ size = 24, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}

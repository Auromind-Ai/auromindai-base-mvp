'use client';

import { CheckCircle2 } from 'lucide-react';

const PricingSection = () => {
  return (
    <section id="pricing" className="py-32 px-6 bg-[#F9F9F9] border-t border-black/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block">Pricing</span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 text-black">Ready to grow?</h2>
          <p className="text-black/40 text-xl font-medium">Simple plans for every stage of your business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {[
            { plan: 'Free', price: '₹0', desc: 'Try Auromind for free and see the ROI yourself.', features: ['100 AI Replies', 'Basic Workflows', 'Meta API Included'] },
            { plan: 'Pro', price: '₹2,490', desc: 'Everything you need to automate and scale.', features: ['Unlimited AI Replies', 'Advanced Workflows', 'Priority Support', 'Full Analytics'], popular: true },
            { plan: 'Business', price: 'Custom', desc: 'Enterprise-grade scale for large teams.', features: ['Dedicated Manager', 'Custom API Access', 'On-premise Options', 'Global SLA'] }
          ].map((tier, i) => (
            <div
              key={i}
              className={`p-12 rounded-[2.5rem] bg-white border border-black/5 flex flex-col relative transition-all hover:shadow-2xl ${tier.popular ? 'ring-2 ring-black border-transparent' : ''}`}
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
                {tier.price !== 'Custom' && <span className="text-black/30 text-xs font-black uppercase tracking-widest">/mo</span>}
              </div>
              <ul className="space-y-6 mb-16 flex-1">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-4 text-sm text-black font-medium">
                    <CheckCircle2 size={18} className="text-black/10" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={`w-full py-5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${tier.popular ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white border border-black/10 text-black hover:bg-black/5'}`}>
                {tier.plan === 'Free' ? 'Get Started' : tier.plan === 'Pro' ? 'Go Pro' : 'Contact Sales'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
'use client';

import { Plus } from 'lucide-react';

const FaqSection = () => {
  return (
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
            { q: "What happens if the AI doesn't know the answer?", a: 'The AI can be configured to ask for clarification or hand off to your team with full context.' }
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
  );
};

export default FaqSection;
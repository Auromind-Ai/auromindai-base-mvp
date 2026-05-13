'use client';

import { Globe, Cpu, Rocket } from 'lucide-react';

const HowItWorksSection = () => {
  return (
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
  );
};

export default HowItWorksSection;
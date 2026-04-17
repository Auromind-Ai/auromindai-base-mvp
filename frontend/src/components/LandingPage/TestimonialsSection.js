'use client';

import { MessageSquare } from 'lucide-react';

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-32 px-6 bg-white border-t border-black/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-black">Joined by thousands.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[
            { user: 'Sarah Jenkins', role: 'Director @ ShopEase', result: '3x ROI', content: 'Auromind transformed our customer support. We now handle 3x more inquiries with better conversion rates.' },
            { user: 'Amit Sharma', role: 'Growth Lead @ TechFlow', result: '$20k Recovered', content: 'The AI replies are indistinguishable from my best agents. It recovered $20k in abandoned carts last month.' },
            { user: 'Michael Chen', role: 'Founder, Zynk Media', result: '90% Automation', content: 'Simply the best WhatsApp automation tool. The workflow builder is intuitive and extremely powerful.' }
          ].map((testi, i) => (
            <div key={i} className="p-12 rounded-[2.5rem] bg-[#F9F9F9] border border-black/5 relative flex flex-col items-start min-h-[400px]">
              <div className="absolute top-8 right-8 px-4 py-1.5 rounded-full bg-white border border-black/5 text-[10px] font-black uppercase tracking-widest text-[#A855F7]">
                {testi.result}
              </div>
              <div className="mb-10 text-black/20">
                <MessageSquare size={40} fill="currentColor" />
              </div>
              <p className="text-xl text-black font-medium mb-12 flex-1 leading-relaxed italic">
                "{testi.content}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/5" />
                <div>
                  <h4 className="font-black text-black tracking-tight">{testi.user}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mt-1">{testi.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
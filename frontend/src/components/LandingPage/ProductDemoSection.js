'use client';

import { MessageSquare, BarChart3, Workflow } from 'lucide-react';

const ProductDemoSection = () => {
  return (
    <section id="demo" className="py-32 px-6 bg-white border-t border-black/5">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#0B0B0B] rounded-[3rem] p-12 md:p-24 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-purple-600/10 to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 block">Command Center</span>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[1.1]">
                Monitor every chat <br /> from one dashboard.
              </h2>
              <p className="text-white/50 text-xl font-medium leading-relaxed">
                Track ROI, response velocity, and human-handoffs in real-time. Designed for teams that move fast.
              </p>

              <div className="space-y-6">
                {[
                  { icon: MessageSquare, title: 'Unified Inbox', desc: 'Cross-platform chat management.' },
                  { icon: BarChart3, title: 'Live Analytics', desc: 'Real-time conversion tracking.' },
                  { icon: Workflow, title: 'Workflow Logs', desc: 'Minute-by-minute automation history.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-white font-black tracking-tight">{item.title}</h4>
                      <p className="text-white/30 text-xs mt-1 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="px-10 py-5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all">
                Request Dashboard Access
              </button>
            </div>

            <div className="relative">
              {/* Mock Dashboard Visual */}
              <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-purple-600/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">Live: 1,429 active chats</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="h-40 bg-zinc-800/50 rounded-xl border border-white/5 p-4">
                    <div className="text-[10px] font-black uppercase text-white/30 mb-2">Conversion Rate</div>
                    <div className="text-3xl font-black text-white">24.8%</div>
                    <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-[80%] h-full bg-purple-500" />
                    </div>
                  </div>
                  <div className="h-40 bg-zinc-800/50 rounded-xl border border-white/5 p-4">
                    <div className="text-[10px] font-black uppercase text-white/30 mb-2">Avg. Response Time</div>
                    <div className="text-3xl font-black text-white">1.2s</div>
                    <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-[95%] h-full bg-green-500" />
                    </div>
                  </div>
                </div>
                <div className="h-32 bg-zinc-800/50 rounded-xl border border-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDemoSection;
'use client';

const PlatformTabsSection = () => {
  return (
    <section className="py-40 px-6 bg-white relative overflow-hidden border-b border-black/5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-50 rounded-full blur-[160px] opacity-40 pointer-events-none" />
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-16 text-black">Wherever your customers are.</h2>
        <div className="flex flex-wrap justify-center gap-4 mb-20">
          {['WhatsApp', 'Instagram', 'Telegram'].map((tab, i) => (
            <button
              key={tab}
              className={`px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-widest transition-all ${i === 0 ? 'bg-black text-white' : 'bg-white border border-black/5 text-black/40 hover:text-black'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="max-w-4xl mx-auto aspect-video bg-white rounded-[2.5rem] p-12 shadow-2xl border border-black/5 flex flex-col items-center justify-center">
          <span className="text-[#A855F7] font-black text-[10px] uppercase tracking-[0.5em] mb-4">Official API Integration</span>
          <p className="text-2xl text-black font-black tracking-tight max-w-lg mb-8">
            Scale your business with the power of world's most popular messaging platforms.
          </p>
          <div className="flex gap-4">
            <div className="px-6 py-2 bg-zinc-50 rounded-full text-[10px] font-black uppercase text-black/40">Broadcasting</div>
            <div className="px-6 py-2 bg-zinc-50 rounded-full text-[10px] font-black uppercase text-black/40">Catalogs</div>
            <div className="px-6 py-2 bg-zinc-50 rounded-full text-[10px] font-black uppercase text-black/40">Payments</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformTabsSection;
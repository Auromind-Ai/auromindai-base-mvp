'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Users, Clock, Sparkles } from 'lucide-react';
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

// Brand SVG Logos
const ShopifyLogo = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.57 5.51a.76.76 0 00-.67-.38H17.4l-.84-2.8A1.5 1.5 0 0015.12 1.3H8.88A1.5 1.5 0 007.44 2.33l-.84 2.8H5.1a.76.76 0 00-.67.38.74.74 0 000 .77l1.37 2.29-.68 11.23a1.5 1.5 0 001.5 1.6h10.58a1.5 1.5 0 001.5-1.6l-.68-11.23 1.37-2.29a.74.74 0 000-.77zM9 3.5h6l.6 2H8.4zm7.92 15.3H7.08l.6-9.8h8.64z"/>
  </svg>
);

const MetaLogo = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.463 9.42c-1.077 0-2.007.575-2.53 1.44a6.596 6.596 0 00-2.92-1.3c.153-.352.261-.715.323-1.085C11.196 6.35 12.927 5 15 5c2.757 0 5 2.243 5 5s-2.243 5-5 5c-1.44 0-2.736-.61-3.645-1.583a5.454 5.454 0 00-.649.658C11.72 15.22 13.253 16 15 16c3.309 0 6-2.691 6-6s-2.691-6-6-6c-2.66 0-4.912 1.734-5.672 4.125a6.452 6.452 0 00-1.748-.225c-.596 0-1.17.075-1.725.215C6.107 5.734 3.855 4 1.195 4c-3.309 0-6 2.691-6 6s2.691 6 6 6c1.747 0 3.28-.78 4.292-1.927a5.454 5.454 0 00.649.658C6.736 15.39 5.44 16 4 16c-2.757 0-5-2.243-5-5s2.243-5 5-5c2.073 0 3.804 1.35 4.664 3.475a6.596 6.596 0 00.323 1.085 6.596 6.596 0 00-2.53-1.44C6.007 8.243 5.077 7.668 4 7.668c-1.287 0-2.332 1.045-2.332 2.332S2.713 12.332 4 12.332c.983 0 1.822-.61 2.158-1.47a5.163 5.163 0 001.258.156c.449 0 .88-.052 1.294-.15a2.332 2.332 0 002.158 1.47c1.287 0 2.332-1.045 2.332-2.332s-1.045-2.332-2.332-2.332z"/>
  </svg>
);

const HubSpotLogo = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.2 12c-.1-1.3-.8-2.4-1.8-3.1l1-1.7c.3-.5.1-1.1-.4-1.4s-1.1-.1-1.4.4l-1 1.7c-1.2-.5-2.5-.5-3.7 0l-1-1.7c-.3-.5-1-.7-1.4-.4s-.7 1-.4 1.4l1 1.7c-1 .7-1.7 1.8-1.8 3.1h-4.3c-.5 0-1 .4-1 .9s.5.9 1 .9h4.3c.1 1.3.8 2.4 1.8 3.1l-1 1.7c-.3.5-.1 1.1.4 1.4.2.1.4.1.5.1.4 0 .7-.2.9-.5l1-1.7c1.2.5 2.5.5 3.7 0l1 1.7c.2.3.5.5.9.5.2 0 .4 0 .5-.1.5-.3.7-1 .4-1.4l-1-1.7c1-.7 1.7-1.8 1.8-3.1h4.3c.5 0 1-.4 1-.9s-.5-.9-1-.9h-4.3zm-6.2 1.8c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8z"/>
  </svg>
);

const SalesforceLogo = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.8 9.5c-.3-1.6-1.5-3-3.1-3.5-1.9-.6-4.1.1-5.1 1.8-1-1.1-2.5-1.8-4-1.8-2.6 0-4.8 1.8-5.3 4.2C.5 10.7-.1 12 .0 13.4c.1 2.2 1.6 4 3.7 4.5 2.4.6 4.9-.5 6.1-2.6 1 1.7 3 2.7 5.1 2.4 2.2-.3 3.9-2 4.4-4.2.4-1.8.1-3.6-.9-4.8.4.3.7.6.4.8z"/>
  </svg>
);

const SlackLogo = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523 2.528 2.528 0 01-2.522-2.523 2.528 2.528 0 012.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 012.52-2.52h5.043a2.528 2.528 0 012.522 2.52v5.042a2.528 2.528 0 01-2.522 2.52H8.823a2.528 2.528 0 01-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 012.52-2.522 2.528 2.528 0 012.522 2.522v2.52h-2.522a2.528 2.528 0 01-2.52-2.52zm0 1.261a2.528 2.528 0 012.52 2.52v5.043a2.528 2.528 0 01-2.52 2.522H3.78a2.528 2.528 0 01-2.522-2.522V8.824a2.528 2.528 0 012.522-2.52h5.043zm10.135 3.78a2.528 2.528 0 012.52-2.522 2.528 2.528 0 012.522 2.522 2.528 2.528 0 01-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 01-2.52 2.52h-5.043a2.528 2.528 0 01-2.522-2.52V3.78a2.528 2.528 0 012.522-2.522h5.043a2.528 2.528 0 012.52 2.522v5.043zm-3.78 10.135a2.528 2.528 0 01-2.52 2.522 2.528 2.528 0 01-2.522-2.522v-2.52h2.522a2.528 2.528 0 01-2.52 2.52zm0-1.262a2.528 2.528 0 01-2.52-2.52v-5.043a2.528 2.528 0 012.52-2.522h5.043a2.528 2.528 0 012.522 2.522v5.043a2.528 2.528 0 01-2.522 2.52h-5.043z"/>
  </svg>
);

const WhatsAppLogo = () => (
  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.004 2C6.48 2 2.004 6.477 2.004 12c0 1.764.46 3.42 1.265 4.869L2.03 21.917l5.222-1.37a9.952 9.952 0 004.752 1.448c5.524 0 10-4.477 10-10S17.528 2 12.004 2zm5.727 14.137c-.244.69-1.233 1.3-1.688 1.348-.445.048-.992.073-2.613-.59-2.185-.893-3.602-3.114-3.712-3.26-.11-.147-.893-1.187-.893-2.28 0-1.096.572-1.633.778-1.854.205-.22.446-.277.595-.277.15 0 .298.003.425.01.135.006.317-.052.495.38.183.447.625 1.52.68 1.633.056.113.093.243.018.393-.075.15-.113.244-.225.374-.112.13-.238.291-.34.4-.112.115-.23.24-.098.468.132.228.587.968 1.258 1.567.868.773 1.597 1.01 1.825 1.125.228.115.362.098.498-.056.136-.156.587-.683.743-.918.156-.234.312-.197.528-.117.216.08 1.37.646 1.605.764.236.117.393.176.452.274.057.1.057.575-.187 1.265z"/>
  </svg>
);

const SocialProofSection = () => {
  const brands = [
    { name: 'Shopify', icon: <ShopifyLogo /> },
    { name: 'Meta', icon: <MetaLogo /> },
    { name: 'HubSpot', icon: <HubSpotLogo /> },
    { name: 'Salesforce', icon: <SalesforceLogo /> },
    { name: 'Slack', icon: <SlackLogo /> },
    { name: 'WhatsApp', icon: <WhatsAppLogo /> },
  ];

  const stats = [
    {
      val: '10M+',
      label: 'Conversations / Mo',
      desc: 'Seamlessly processed across Meta APIs.',
      icon: MessageSquare,
      color: 'from-violet-500/20 to-purple-500/5 border-violet-500/20 text-violet-400',
      glow: 'bg-violet-500/5',
    },
    {
      val: '1M+',
      label: 'Leads Qualified',
      desc: 'Captured and integrated into CRM pipelines.',
      icon: Users,
      color: 'from-cyan-500/20 to-blue-500/5 border-cyan-500/20 text-cyan-400',
      glow: 'bg-cyan-500/5',
    },
    {
      val: '24/7',
      label: 'Automation Velocity',
      desc: 'Active coverage keeping response times under 2s.',
      icon: Clock,
      color: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/20 text-emerald-400',
      glow: 'bg-emerald-500/5',
    }
  ];

  return (
    <section className="py-24 px-6 relative bg-black border-y border-white/[0.08] overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#08080C] to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Title */}
        <div className="text-center mb-16">
          <span className={`${poppins.className} text-[10px] font-black uppercase tracking-[0.4em] text-white/40 block mb-2`}>
            Global Enterprise Infrastructure
          </span>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white/80">
            Trusted by modern brands worldwide
          </h3>
        </div>

        {/* Marquee Container */}
        <div className="relative mb-24 overflow-hidden py-4">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

          <motion.div
            animate={{ x: [0, -960] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="flex items-center gap-16 md:gap-24 whitespace-nowrap"
          >
            {[...Array(4)].map((_, outerI) => (
              <div key={outerI} className="flex items-center gap-16 md:gap-24">
                {brands.map((brand, i) => (
                  <div 
                    key={`${outerI}-${i}`} 
                    className="flex items-center gap-3 text-white/20 hover:text-white/80 transition-colors duration-300 group cursor-pointer"
                  >
                    <div className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      {brand.icon}
                    </div>
                    <span className="text-sm font-bold tracking-widest uppercase font-mono">
                      {brand.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                whileHover={{ y: -6, borderColor: 'rgba(255, 255, 255, 0.18)' }}
                className={`bg-[#07070A]/50 border border-white/[0.06] rounded-2xl p-8 backdrop-blur-md relative overflow-hidden group transition-all duration-300 shadow-[0_15px_40px_-20px_rgba(0,0,0,0.5)]`}
              >
                {/* Subtle internal glowing backdrop */}
                <div className={`absolute -right-16 -top-16 w-32 h-32 ${stat.glow} rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none`} />

                <div className="flex justify-between items-start mb-6">
                  {/* Icon Card */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${stat.color} border border-white/5`}>
                    <Icon size={22} />
                  </div>
                  
                  {/* Performance indicator */}
                  <span className="text-[8px] font-mono tracking-widest text-white/20 uppercase">
                    SYS OK • v2.0
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-5xl font-black text-white tracking-tighter leading-none font-sans bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent group-hover:scale-[1.02] origin-left transition-transform duration-300">
                    {stat.val}
                  </div>
                  
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70 font-sans pt-1">
                    {stat.label}
                  </div>
                  
                  <p className="text-xs text-white/40 leading-relaxed font-sans pt-1">
                    {stat.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default SocialProofSection;

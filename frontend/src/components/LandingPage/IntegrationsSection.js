'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

const IntegrationsSection = () => {
  return (
    <section id="integrations" className="py-40 px-6 bg-white relative border-t border-black/5">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03),transparent_100%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A855F7] mb-6 block"
        >
          Connectivity
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-black tracking-tighter text-black mb-20"
        >
          Works with your favorite tools.
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[
            { name: 'Shopify', color: 'hover:text-[#96BF48]' },
            { name: 'HubSpot', color: 'hover:text-[#FF7A59]' },
            { name: 'Salesforce', color: 'hover:text-[#00A1E0]' },
            { name: 'Make', color: 'hover:text-[#EA1B3C]' },
            { name: 'Zapier', color: 'hover:text-[#FF4A00]' },
            { name: 'WooCommerce', color: 'hover:text-[#96588A]' },
            { name: 'Mailchimp', color: 'hover:text-[#FFE01B]' },
            { name: 'ActiveCampaign', color: 'hover:text-[#356AE6]' },
            { name: 'Zendesk', color: 'hover:text-[#03363D]' },
            { name: 'Slack', color: 'hover:text-[#4A154B]' },
            { name: 'Intercom', color: 'hover:text-[#0057FF]' },
            { name: 'Stripe', color: 'hover:text-[#635BFF]' }
          ].map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -8, scale: 1.05 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`aspect-square flex flex-col items-center justify-center bg-white rounded-[2rem] border border-black/5 shadow-sm hover:shadow-2xl hover:border-purple-500/20 transition-all duration-300 group cursor-pointer`}
            >
              <div className="w-12 h-12 mb-4 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                <Zap size={20} className="text-black/10 group-hover:text-purple-500 transition-colors" />
              </div>
              <span className={`text-[11px] font-black uppercase tracking-widest text-black/40 group-hover:text-black transition-colors ${tool.color}`}>
                {tool.name}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-24 inline-flex items-center gap-4 px-8 py-4 bg-zinc-50 rounded-full border border-black/5 text-[11px] font-black uppercase tracking-widest text-black/40"
        >
          <span>And 100+ more via API</span>
          <div className="w-[1px] h-4 bg-black/10" />
          <button className="text-black hover:text-purple-600 transition-colors">View Directory</button>
        </motion.div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
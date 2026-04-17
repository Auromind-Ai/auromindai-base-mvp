'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Users, Clock } from 'lucide-react';

const SocialProofSection = () => {
  return (
    <section className="py-24 px-6 relative bg-[#F9F9F9] border-y border-black/5 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/30">Trusted by modern brands</span>
        </div>

        <div className="relative mb-24 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#F9F9F9] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#F9F9F9] to-transparent z-10" />

          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="flex items-center gap-32 whitespace-nowrap"
          >
            {[...Array(3)].map((_, outerI) => (
              <div key={outerI} className="flex items-center gap-32 opacity-20 grayscale">
                {['Shopify', 'Meta', 'Wati', 'HubSpot', 'Salesforce', 'Zendesk', 'Slack', 'WhatsApp'].map((brand, i) => (
                  <span key={`${outerI}-${i}`} className="text-2xl font-black tracking-tighter text-black uppercase">
                    {brand}
                  </span>
                ))}
              </div>
            ))}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { val: '10M+', label: 'Monthly Conversations', icon: MessageSquare },
            { val: '1M+', label: 'Leads Captured', icon: Users },
            { val: '24/7', label: 'Automation Velocity', icon: Clock }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center py-6"
            >
              <div className="text-6xl font-black mb-4 text-black tracking-tighter leading-none">
                {stat.val}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;

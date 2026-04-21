'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

const FooterSection = () => {
  return (
    <footer className="bg-black py-24 px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-16 mb-24">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-8 group">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black">
                <Zap size={18} fill="currentColor" />
              </div>
              <span className="text-xl font-black tracking-tighter text-white uppercase">Auromind</span>
            </Link>
            <p className="text-white/70 text-sm font-medium max-w-xs leading-relaxed">
              The leading AI-powered WhatsApp automation platform for sales-driven businesses.
            </p>
          </div>

          {[
            { title: 'Product', links: ['Automation', 'InBox', 'API', 'Pricing'] },
            { title: 'Solutions', links: ['E-commerce', 'Real Estate', 'Agencies', 'SaaS'] },
            { title: 'Resources', links: ['Blog', 'Docs', 'Guides', 'Support'] },
            { title: 'Company', links: ['About', 'Contact', 'Careers', 'Legal'] }
          ].map(col => (
            <div key={col.title}>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-white mb-10">{col.title}</h5>
              <ul className="space-y-4">
                {col.links.map(link => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-white/70 hover:text-white font-medium transition-colors">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/50">
            © 2026 Auromind. Meta Business Partner.
          </div>
          <div className="flex gap-10">
            {['Instagram', 'WhatsApp', 'LinkedIn', 'Twitter'].map(social => (
              <Link key={social} href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors">{social}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
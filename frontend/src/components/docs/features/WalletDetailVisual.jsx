'use client';

import { Zap, MessageCircle } from 'lucide-react';
import DocumentationScreenshot from '@/components/docs/DocumentationScreenshot';
import styles from './FeatureDetailView.module.css';

const WALLETS = [
  {
    id: 'ai', label: 'AI Credits', icon: Zap,
    src: '/images/doc-images/ai-workspace-credits-overview-updated.png',
    frame: 'aspect-[1655/950] !border-violet-500/80 shadow-[0_0_18px_rgba(139,92,246,0.14)] hover:!border-violet-400',
    alt: 'AI Workspace Credits showing balance, recharge packs, monthly cycle, credit distribution and activity',
  },
  {
    id: 'whatsapp', label: 'WhatsApp Credits', icon: MessageCircle,
    src: '/images/doc-images/whatsapp-wallet-overview-green.png',
    frame: 'aspect-[1652/952] !border-emerald-500/80 shadow-[0_0_18px_rgba(16,185,129,0.14)] hover:!border-emerald-400',
    alt: 'WhatsApp Credits showing wallet balance, category rates, cost calculator and recharge controls',
  },
];

export default function WalletDetailVisual({ selected = 'ai', onSelect }) {
  const wallet = WALLETS.find((item) => item.id === selected);

  return (
    <div className={`space-y-3 ${styles.poppins}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${selected === 'ai' ? 'bg-violet-400' : 'bg-emerald-400'}`} />
          Live Product UI &amp; Simulator
        </span>
        <div role="group" aria-label="Choose wallet overview" className="flex rounded-xl border border-white/10 bg-[#0d0e14] p-1">
          {WALLETS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={selected === id}
              aria-controls="wallet-overview-preview"
              onClick={() => onSelect?.(id)}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected === id
                ? id === 'ai' ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-black'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id="wallet-overview-preview" aria-live="polite">
        <DocumentationScreenshot
          key={wallet.id}
          src={wallet.src}
          alt={wallet.alt}
          aspectRatio={`${wallet.frame} [&_img]:object-contain`}
          caption={`${wallet.label} overview — Click to expand.`}
        />
      </div>
    </div>
  );
}


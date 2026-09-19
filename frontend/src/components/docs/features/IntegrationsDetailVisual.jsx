'use client';

import React, { useState } from 'react';
import { 
  Network, 
  MessageSquare, 
  Share2, 
  Webhook, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  Activity, 
  Copy, 
  Check, 
  Terminal,
  Server
} from 'lucide-react';

const CHANNELS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business Cloud',
    tag: 'Meta Official',
    status: 'CONNECTED',
    latency: '34ms',
    endpoint: 'https://[your-workspace].orbion.ai/channels/whatsapp',
    appId: 'Official Meta App ID',
    phoneId: '+1 (555) 019-8291',
    authType: 'Meta Official 1-Click Embedded Login',
    eventSubscriptions: ['Incoming Messages', 'Delivery Receipts', 'Read Status', 'Quick Replies'],
    security: 'Bank-Grade Enterprise Encryption'
  },
  {
    id: 'instagram',
    name: 'Instagram Direct & Mentions',
    tag: 'Meta Official',
    status: 'CONNECTED',
    latency: '52ms',
    endpoint: 'https://[your-workspace].orbion.ai/channels/instagram',
    appId: 'Official Meta App ID',
    phoneId: '@your_brand_handle',
    authType: 'Official Meta Instagram Business Login',
    eventSubscriptions: ['Direct Messages', 'Story Mentions', 'Comments'],
    security: 'End-to-End Enterprise Encryption'
  },
  {
    id: 'webhooks',
    name: 'CRM & Custom Webhooks',
    tag: 'Zapier / HubSpot Bridge',
    status: 'ACTIVE',
    latency: '18ms',
    endpoint: 'https://[your-workspace].orbion.ai/channels/crm-bridge',
    appId: 'CRM-CONNECTOR',
    phoneId: 'HubSpot / Salesforce / Zapier Gateway',
    authType: 'API Key & Secure Webhook Secret',
    eventSubscriptions: ['New Lead Created', 'Human Handoff Requested', 'Conversation Resolved'],
    security: 'Enterprise TLS Encryption'
  }
];

export default function IntegrationsDetailVisual() {
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden font-sans">
      {/* Visual Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">
              Omni-Gateway Channel Integrations Hub
            </h4>
            <p className="text-[11px] text-slate-400">
              High-throughput bidirectional webhook pipeline with zero-drop message queueing
            </p>
          </div>
        </div>

        {/* Channel Selector Pills */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-white/5">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch)}
              className={`px-3 py-1 text-xs rounded font-medium transition-all ${
                activeChannel.id === ch.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {ch.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Channel Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {/* Left: Endpoint & Auth Credentials Configuration (6 cols) */}
        <div className="lg:col-span-6 p-5 space-y-4 bg-slate-950/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Channel Gateway Configuration
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              {activeChannel.status}
            </span>
          </div>

          {/* Webhook Endpoint Box */}
          <div>
            <label className="text-[11px] text-slate-400 font-medium block mb-1.5">
              Production Webhook Callback URL
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-white/10 text-xs">
              <span className="text-sky-300 truncate flex-1">{activeChannel.endpoint}</span>
              <button
                onClick={() => handleCopy(activeChannel.endpoint)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Meta / Channel Credentials Matrix */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Meta App / Client ID:</span>
              <span className="text-slate-200">{activeChannel.appId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sender / Phone Handle:</span>
              <span className="text-sky-300 font-medium">{activeChannel.phoneId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Authentication Scheme:</span>
              <span className="text-emerald-400 font-sans text-[11px]">{activeChannel.authType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Payload Cryptography:</span>
              <span className="text-slate-300 text-[11px]">{activeChannel.security}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Edge Ping Latency:
            </span>
            <span className="text-emerald-400 font-bold">{activeChannel.latency}</span>
          </div>
        </div>

        {/* Right: Event Subscription Matrix & Payload Stream (6 cols) */}
        <div className="lg:col-span-6 p-5 space-y-4 bg-slate-900/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Subscribed Webhook Event Types
            </span>
            <span className="text-[10px] text-slate-400">Real-time Stream</span>
          </div>

          {/* Active Event Badges */}
          <div className="flex flex-wrap gap-2">
            {activeChannel.eventSubscriptions.map((evt, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-xs bg-sky-500/10 text-sky-300 border border-sky-500/20 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                {evt}
              </span>
            ))}
          </div>

          {/* Simulated Inbound Event Payload */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-sans">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-sky-400" />
                Verified Inbound Payload Sample
              </span>
              <span className="text-[10px] text-emerald-400">200 OK (Processed)</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-white/10 text-[11px] text-slate-300 space-y-1 overflow-x-auto leading-relaxed">
              <div className="text-slate-500">Security Check: Verified ✓</div>
              <div>&#123;</div>
              <div className="pl-3 text-sky-300">&quot;object&quot;: &quot;whatsapp_business_account&quot;,</div>
              <div className="pl-3 text-amber-300">&quot;entry&quot;: [&#123;</div>
              <div className="pl-6 text-slate-300">&quot;id&quot;: &quot;{activeChannel.appId}&quot;,</div>
              <div className="pl-6 text-slate-300">&quot;changes&quot;: [&#123;</div>
              <div className="pl-9 text-emerald-300">&quot;field&quot;: &quot;messages&quot;,</div>
              <div className="pl-9 text-purple-300">&quot;status&quot;: &quot;delivered&quot;</div>
              <div className="pl-6">&#125;]</div>
              <div className="pl-3">&#125;]</div>
              <div>&#125;</div>
            </div>
          </div>

          {/* SLA & Security Footer */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 font-sans">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              Meta TLS 1.3 Encrypted Socket
            </span>
            <span className="text-[10px] text-slate-400">Zero Inbound Drops</span>
          </div>
        </div>
      </div>
    </div>
  );
}

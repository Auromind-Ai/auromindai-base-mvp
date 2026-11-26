// Dynamic mappers converting live DB plan payloads from /public/pricing into card & comparison matrix view models.

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  twilio: 'Twilio',
};

const BROADCAST_TIER_LABELS = {
  none: '—',
  manual_100_day: 'Manual 100/day',
  standard_batch: 'Standard batch',
  high_volume_scheduler: 'High-volume scheduler',
  priority_queue: 'Priority queue throughput',
  dedicated_high_tps: 'Dedicated high-TPS queue',
};

const CRM_TIER_LABELS = {
  basic_viewer: 'Basic viewer',
  contact_list: 'Contact list view',
  single_stage_board: 'Single-stage board',
  advance_filtration: 'Advance Filtration CRM',
  lead_scoring: 'CRM + AI lead scoring',
  custom_stages: 'Fully customizable stages',
};

function formatNumberIn(val) {
  return Number(val).toLocaleString('en-IN');
}

function formatLimitCell(val, unitSingular, unitPlural = unitSingular) {
  if (val === -1) return 'Unlimited custom';
  if (val === 0 || val === null || val === undefined) return '—';
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  const label = num === 1 ? unitSingular : unitPlural;
  return label ? `${formatNumberIn(num)} ${label}` : formatNumberIn(num);
}

function getChannelsForPlan(dbPlan) {
  const raw = dbPlan?.feature_flags?.allowed_channels;
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => String(c).toLowerCase().trim()).filter(Boolean);
}

function getChannelsSummary(channels, planKey) {
  if (channels.length === 0) {
    return { channelsCount: '0 Channels', channelsName: 'No channels' };
  }
  const countLabel = channels.length >= 3 ? 'All 3 Channels' : `${channels.length}/3 Channels`;
  if (planKey === 'free' && channels.length === 1 && channels[0] === 'whatsapp') {
    return { channelsCount: countLabel, channelsName: 'WhatsApp Sandbox' };
  }
  const names = channels.map((c) => CHANNEL_LABELS[c] || c).join(' + ');
  return { channelsCount: countLabel, channelsName: names };
}

function getPlanBadge(dbPlan, key, channels) {
  if (dbPlan.is_featured || dbPlan.featured) return '★ Most Popular';
  if (key === 'free') return '100% Free Forever';
  if (key === 'enterprise') return 'Tailored SLAs';
  if (key === 'creator') return 'Social & Insta';
  if (channels.length >= 2) return 'Omnichannel Sync';
  if (channels.includes('whatsapp')) return 'WhatsApp Dedicated';
  if (channels.includes('instagram')) return 'Instagram Dedicated';
  return dbPlan.display_name || dbPlan.name || key;
}

export function buildDynamicCardFeatures(dbPlan) {
  const flags = dbPlan?.feature_flags && typeof dbPlan.feature_flags === 'object' ? dbPlan.feature_flags : null;
  const hasEntitlementData =
    flags !== null ||
    dbPlan?.team_limit !== undefined ||
    dbPlan?.lead_limit !== undefined ||
    dbPlan?.included_ai_credits !== undefined;

  if (!hasEntitlementData) {
    return Array.isArray(dbPlan?.features) ? dbPlan.features : [];
  }

  const key = String(dbPlan.key || dbPlan.name || '').toLowerCase().trim();
  const safeFlags = flags || {};
  const channels = getChannelsForPlan(dbPlan);
  const bullets = [];

  // 1. Inbox & Channels
  if (channels.length > 0) {
    bullets.push(getInboxLabel(channels, key));
  }

  // 2. Monthly Conversations
  const convLimit = dbPlan.monthly_conversations ?? safeFlags.monthly_conversations;
  if (convLimit === -1) {
    bullets.push('Unlimited monthly conversations');
  } else if (convLimit !== undefined && convLimit !== null) {
    bullets.push(`${formatNumberIn(convLimit)} Monthly conversations`);
  }

  // 3. Team Seats
  if (dbPlan.team_limit === -1) {
    bullets.push('Unlimited custom seats & role scoping');
  } else if (dbPlan.team_limit !== undefined && dbPlan.team_limit !== null) {
    const seats = Number(dbPlan.team_limit);
    bullets.push(`${formatNumberIn(seats)} User seat${seats === 1 ? '' : 's'} included`);
  }

  // 4. Leads & CRM
  const crmLabel = CRM_TIER_LABELS[safeFlags.crm_pipeline_tier];
  const leadSuffix = safeFlags.lead_enrichment ? ' with enrichment' : safeFlags.lead_scoring ? ' + lead scoring' : '';
  if (dbPlan.lead_limit === -1) {
    bullets.push(`Unlimited leads${crmLabel ? ` · ${crmLabel}` : ''}`);
  } else if (dbPlan.lead_limit !== undefined && dbPlan.lead_limit !== null) {
    bullets.push(`${formatNumberIn(dbPlan.lead_limit)} Contact leads${leadSuffix}`);
  }
  if (crmLabel && dbPlan.lead_limit !== -1) {
    bullets.push(`${crmLabel}${safeFlags.lead_scoring && !leadSuffix.includes('scoring') ? ' with lead scoring' : ''}`);
  }

  // 5. AI Assistants & Tools
  const assistants = safeFlags.assistant_limit;
  const tools = safeFlags.tool_limit;
  if (assistants !== undefined || tools !== undefined) {
    const aText = assistants === -1 ? 'Unlimited AI assistants' : assistants !== undefined ? `${formatNumberIn(assistants)} AI assistant${Number(assistants) === 1 ? '' : 's'}` : null;
    const tText = tools === -1 ? 'Unlimited AI tools' : tools !== undefined ? `${formatNumberIn(tools)} AI tools` : null;
    const combined = [aText, tText].filter(Boolean).join(' · ');
    if (combined) bullets.push(combined);
  }

  // 6. Meta Templates & Broadcasts
  const tplLim = safeFlags.template_limit;
  if (tplLim === -1) {
    bullets.push('Unlimited Meta-approved templates');
  } else if (tplLim && Number(tplLim) > 0) {
    bullets.push(`Up to ${formatNumberIn(tplLim)} Meta-approved templates`);
  }

  const broadcastLabel = BROADCAST_TIER_LABELS[safeFlags.broadcast_tier];
  if (broadcastLabel && broadcastLabel !== '—') {
    bullets.push(`${broadcastLabel} broadcasts`);
  }

  // 7. Flow Executions
  if (dbPlan.flow === -1) {
    bullets.push('Unlimited flow executions');
  } else if (dbPlan.flow !== undefined && dbPlan.flow !== null && Number(dbPlan.flow) > 0) {
    bullets.push(`${formatNumberIn(dbPlan.flow)} Flow executions / mo`);
  }

  // 8. Brain Knowledge Base & Storage
  if (safeFlags.has_rag !== false) {
    const kb = dbPlan.knowledge_base_limit;
    const st = formatStorageCell(dbPlan.storage_limit_mb);
    if (kb === -1) {
      bullets.push(`Unlimited Brain sync${st !== '—' ? ` · ${st} storage` : ''}`);
    } else if (kb !== undefined && kb !== null) {
      bullets.push(`Brain KB (${formatNumberIn(kb)} Docs${st !== '—' ? ` · ${st}` : ''})`);
    }
  }

  // 9. AI Credits & WCC Wallet
  const credits = dbPlan.included_ai_credits ?? dbPlan.credits;
  const wcc = Number(dbPlan.included_wcc_wallet ?? 0);
  const creditPart = credits === -1 ? 'Unlimited AI credits' : credits ? `${formatNumberIn(credits)} AI credits / mo` : null;
  const wccPart = wcc > 0 ? `₹${formatNumberIn(wcc)} WCC wallet` : null;
  const walletLine = [creditPart, wccPart].filter(Boolean).join(' · ');
  if (walletLine) bullets.push(walletLine);

  return bullets.length > 0 ? bullets : (Array.isArray(dbPlan.features) ? dbPlan.features : []);
}

export function mapDbPlanToCard(dbPlan) {
  const key = String(dbPlan.key || dbPlan.name || '').toLowerCase().trim();
  const isFree = key === 'free';
  const isEnterprise = key === 'enterprise' || (Number(dbPlan.monthly_price ?? 0) <= 0 && !isFree);
  const monthlyPrice = Number(dbPlan.monthly_price ?? dbPlan.amount ?? 0);
  const yearlyPrice = Number(dbPlan.yearly_price ?? 0);
  const yearlyPerMonth = yearlyPrice > 0 ? Math.round(yearlyPrice / 12) : Math.round(monthlyPrice * 0.95);

  const displayPrice = isFree
    ? '₹0'
    : isEnterprise || monthlyPrice <= 0
    ? 'Custom'
    : `₹${formatNumberIn(monthlyPrice)}`;

  const displayPriceYearly = isFree
    ? '₹0'
    : isEnterprise || yearlyPrice <= 0
    ? 'Custom'
    : `₹${formatNumberIn(yearlyPerMonth)}`;

  const channels = getChannelsForPlan(dbPlan);
  const { channelsCount, channelsName } = getChannelsSummary(channels, key);

  return {
    key,
    name: dbPlan.display_name || dbPlan.name || key,
    displayName: dbPlan.display_name || dbPlan.name || key,
    subtitle: dbPlan.description || '',
    description: dbPlan.description || '',
    priceMonthly: monthlyPrice,
    priceYearly: yearlyPrice,
    priceMonthlyGst: monthlyPrice,
    priceYearlyGst: yearlyPerMonth,
    displayPrice,
    displayPriceYearly,
    period: isFree ? 'forever' : isEnterprise ? '' : '/mo',
    badge: getPlanBadge(dbPlan, key, channels),
    featured: Boolean(dbPlan.is_featured ?? dbPlan.featured),
    buttonText: isEnterprise ? 'Contact sales' : isFree ? 'Start Free Forever' : 'Start free trial',
    channels,
    channelsCount,
    channelsName,
    setupNote: isFree
      ? 'Free setup — test without limits'
      : 'Free setup — we build your chatbot flow for you',
    features: buildDynamicCardFeatures(dbPlan),
    raw: dbPlan,
  };
}

export function buildTableTiers(dbPlans = [], billing = 'annual') {
  if (!Array.isArray(dbPlans) || dbPlans.length === 0) return [];
  const isAnnual = billing === 'annual';

  return dbPlans.map((plan) => {
    const key = String(plan.key || plan.name || '').toLowerCase().trim();
    const isFree = key === 'free';
    const isEnterprise = key === 'enterprise' || (Number(plan.monthly_price ?? 0) <= 0 && !isFree);
    const monthlyP = Number(plan.monthly_price ?? plan.amount ?? 0);
    const yearlyP = Number(plan.yearly_price ?? 0);
    const annualPerMonth = yearlyP > 0 ? Math.round(yearlyP / 12) : Math.round(monthlyP * 0.95);

    const price = isFree
      ? '₹0'
      : isEnterprise
      ? 'Custom'
      : isAnnual
      ? `₹${formatNumberIn(annualPerMonth)}`
      : `₹${formatNumberIn(monthlyP)}`;

    const channels = getChannelsForPlan(plan);
    const shortBadge = plan.is_featured || plan.featured
      ? '★ POPULAR'
      : isFree
      ? 'Free'
      : isEnterprise
      ? 'Dedicated'
      : channels.length >= 2
      ? 'Omnichannel'
      : channels.includes('instagram')
      ? 'Social'
      : 'WhatsApp';

    return {
      key,
      name: plan.display_name || plan.name || key,
      price,
      period: isFree ? 'forever' : isEnterprise ? 'Tailored' : '/mo',
      badge: shortBadge,
      isFeatured: Boolean(plan.is_featured ?? plan.featured),
      ctaText: isFree
        ? 'Start Free'
        : isEnterprise
        ? 'Contact Sales'
        : `Choose ${plan.display_name || plan.name || key}`,
      ctaHref: isFree
        ? '/login'
        : isEnterprise
        ? 'mailto:sales@orbionagents.com?subject=Enterprise Inquiry'
        : '/login?redirect=%2Fuser%2Fadmin%2Fbilling%2Fpayment',
      channels,
    };
  });
}

function formatStorageCell(mb) {
  if (mb === -1) return 'Unlimited';
  if (!mb || Number(mb) <= 0) return '—';
  const num = Number(mb);
  if (num >= 1024) return `${(num / 1024).toFixed(num % 1024 === 0 ? 0 : 1)} GB`;
  return `${num} MB`;
}

function getInboxLabel(channels, key) {
  if (channels.length >= 3) return key === 'enterprise' ? 'Enterprise hub (All channels)' : 'OMNI INBOX (WA + Insta + Twilio)';
  if (channels.includes('whatsapp') && channels.includes('instagram')) return 'WA + Insta Inbox';
  if (channels.includes('instagram')) return 'IG DM shared inbox';
  if (channels.includes('whatsapp')) return key === 'free' ? 'Single Sandbox inbox' : 'WhatsApp Inbox';
  if (channels.includes('twilio')) return 'Twilio SMS/Voice Inbox';
  return 'Shared Inbox';
}

export function buildComparisonSections(dbPlans = []) {
  if (!Array.isArray(dbPlans) || dbPlans.length === 0) return [];

  const rowFrom = (capability, tooltip, valueFn) => {
    const values = {};
    dbPlans.forEach((plan) => {
      const key = String(plan.key || plan.name || '').toLowerCase().trim();
      const flags = plan.feature_flags && typeof plan.feature_flags === 'object' ? plan.feature_flags : {};
      values[key] = valueFn(plan, flags, key);
    });
    return { capability, tooltip, values };
  };

  return [
    {
      category: 'Channels & Messaging Hub',
      icon: 'message-square',
      rows: [
        rowFrom('Supported Channels', 'Meta Cloud API & Twilio messaging integration', (plan, flags, key) => {
          const ch = getChannelsForPlan(plan);
          if (ch.length === 0) return '—';
          if (key === 'free') return `${ch.length} (${CHANNEL_LABELS[ch[0]] || ch[0]} Sandbox)`;
          return `${ch.length} (${ch.map((c) => CHANNEL_LABELS[c] || c).join(' + ')})`;
        }),
        rowFrom('Team Inbox Interface', 'Shared multi-agent conversation interface', (plan, flags, key) =>
          getInboxLabel(getChannelsForPlan(plan), key)
        ),
        rowFrom('Monthly Conversations', 'Active conversations processed per month', (plan, flags) => {
          const val = plan.monthly_conversations ?? flags.monthly_conversations;
          if (val === -1) return 'Unlimited custom';
          if (val === null || val === undefined) return '—';
          return formatNumberIn(val);
        }),
        rowFrom('Meta Approved Templates', 'Pre-approved HSM broadcast & notification templates', (plan, flags) => {
          const lim = flags.template_limit;
          if (lim === -1) return 'Unlimited templates';
          if (lim === 0 || lim === undefined || lim === null) return '—';
          return `Up to ${formatNumberIn(lim)} templates`;
        }),
        rowFrom('Bulk Broadcast Messages', 'Outbound campaign broadcasting queues', (plan, flags) =>
          BROADCAST_TIER_LABELS[flags.broadcast_tier] || '—'
        ),
      ],
    },
    {
      category: 'AI Agents & Brain Intelligence',
      icon: 'bot',
      rows: [
        rowFrom('AI Assistants', 'Concurrent autonomous AI agents in workspace', (plan, flags) =>
          formatLimitCell(flags.assistant_limit, 'AI assistant', 'AI assistants')
        ),
        rowFrom('AI Tools & Functions', 'Callable function tools, actions, and calculators', (plan, flags) =>
          formatLimitCell(flags.tool_limit, 'AI tool', 'AI tools')
        ),
        rowFrom('Brain Docs & Knowledge Base', 'RAG embeddings on documents, PDFs, and website URLs', (plan, flags) => {
          if (flags.has_rag === false) return '—';
          if (plan.knowledge_base_limit === -1) return 'Unlimited Sync & Vector DB';
          return formatLimitCell(plan.knowledge_base_limit, 'Doc / URL', 'Docs / URLs');
        }),
        rowFrom('Brain File Storage', 'Uploaded documents, PDFs, and media storage', (plan) =>
          formatStorageCell(plan.storage_limit_mb)
        ),
        rowFrom('Included AI Credits', 'Monthly platform credits for AI token execution', (plan) => {
          const cr = plan.included_ai_credits ?? plan.credits;
          if (cr === -1) return 'Unlimited';
          if (!cr) return '0 credits';
          return `${formatNumberIn(cr)} credits / mo`;
        }),
        rowFrom('Included WhatsApp Wallet', 'Monthly included WhatsApp conversation credit balance', (plan) => {
          const wcc = Number(plan.included_wcc_wallet ?? 0);
          return wcc > 0 ? `₹${formatNumberIn(wcc)} / mo` : 'Pay-as-you-go';
        }),
      ],
    },
    {
      category: 'Automations & Rules Engine',
      icon: 'zap',
      rows: [
        rowFrom('Active Automations', 'Concurrent active automation workflows', (plan) =>
          formatLimitCell(plan.automation_limit, 'Active flow', 'Active flows')
        ),
        rowFrom('Flow Executions / Month', 'Monthly automated workflow execution quota', (plan) =>
          formatLimitCell(plan.flow, 'execution / mo', 'executions / mo')
        ),
        rowFrom('Monthly Automation Triggers', 'Automated event triggers executed per month', (plan, flags) => {
          const val = flags.monthly_automation_triggers ?? plan.automation_limit;
          return formatLimitCell(val, 'trigger', 'triggers');
        }),
        rowFrom('Drip Campaigns', 'Automated time-delayed multi-step message sequences', (plan, flags) =>
          formatLimitCell(flags.drip_limit ?? 0, 'Drip campaign', 'Drip campaigns')
        ),
      ],
    },
    {
      category: 'CRM, Pipeline & Contact Management',
      icon: 'users',
      rows: [
        rowFrom('Contacts / Leads Limits', 'Maximum contacts stored with conversation history', (plan) =>
          formatLimitCell(plan.lead_limit, 'Lead', 'Leads')
        ),
        rowFrom('CRM & Pipeline Tracking', 'Lead progression tracking and visual Kanban pipelines', (plan, flags) =>
          CRM_TIER_LABELS[flags.crm_pipeline_tier] || 'Basic viewer'
        ),
        rowFrom('Lead Enrichment', 'Automatic contact & social profile enrichment', (plan, flags) =>
          flags.lead_enrichment ? '✓ Enabled' : '—'
        ),
        rowFrom('AI Lead Scoring', 'Intent-based automatic lead scoring', (plan, flags) =>
          flags.lead_scoring ? '✓ Enabled' : '—'
        ),
        rowFrom('Meetings Scheduled / Month', 'Calendar bookings & appointment sync quota', (plan) =>
          formatLimitCell(plan.meeting_limit, 'Meeting', 'Meetings')
        ),
      ],
    },
    {
      category: 'Team Workspace, Integrations & Add-ons',
      icon: 'shield-check',
      rows: [
        rowFrom('User Seats & Team Logins', 'Simultaneous login credentials for human agents', (plan) =>
          formatLimitCell(plan.team_limit, 'User seat', 'User seats')
        ),
        rowFrom('Gmail Connections', 'Connected Gmail inboxes for lead sync & email', (plan) =>
          formatLimitCell(plan.gmail_limit, 'Connection', 'Connections')
        ),
        rowFrom('AI Credit Top-ups', 'Purchase additional AI credit packs anytime', (plan) =>
          plan.allow_ai_topup ? '✓ Enabled' : '—'
        ),
        rowFrom('WhatsApp Wallet Recharge', 'Recharge prepaid WhatsApp messaging wallet', (plan) =>
          plan.allow_wcc_recharge ? '✓ Enabled' : '—'
        ),
        rowFrom('Flow Pack Add-ons', 'Purchase additional flow execution packs', (plan) =>
          plan.allow_flow_addon ? '✓ Enabled' : '—'
        ),
      ],
    },
  ];
}

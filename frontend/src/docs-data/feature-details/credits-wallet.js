export const creditsWalletDetail = {
  slug: 'credits-wallet',
  aliasSlugs: ['features/credits-wallet', 'billing/credits-wallet'],
  featureNumber: '07',
  category: 'Financial Infrastructure & Token Metering',
  title: 'Credits, Wallet & Token Metering',
  tagline: 'Deterministic per-token metering, Meta WCC conversation billing, transparent transaction ledgers, and zero-downtime auto-reload.',
  description: 'Total financial transparency for your AI operations. The OrbionAgents Wallet (/user/admin/credits) provides real-time metering for AI token consumption across models (GPT, Claude, Gemini) and transparently reconciles Meta WhatsApp Conversation Charges (WCC). Set automated balance reload triggers, monitor per-agent compute costs, and review an immutable transaction ledger down to individual turns.',
  visualKey: 'wallet',
  screenshotUrl: '/docs/screenshots/dashboard-credits-wallet.png',
  videoPlaceholder: {
    title: 'Managing AI Credits & Meta Conversation Balance',
    description: 'Learn how token metering works, how to configure zero-downtime auto-reload rules, and how to export itemized monthly cost reports for accounting.',
    duration: '3:30 min walkthrough'
  },
  architecture: {
    title: 'Real-Time Metering & Ledger Reconciliation Pipeline',
    description: 'Every token stream and Meta webhook event is metered asynchronously at the edge to ensure zero latency impact on live conversation responses.',
    stages: [
      {
        number: '01',
        name: 'Stream Token Counting',
        detail: 'Precise prompt and completion token counts are captured directly from LLM streaming chunks via exact BPE tokenizers.'
      },
      {
        number: '02',
        name: 'Meta WCC Window Calculation',
        detail: 'Inbound customer WhatsApp messages trigger or renew 24-hour service conversation windows according to official Meta rate cards.'
      },
      {
        number: '03',
        name: 'Atomic Ledger Deduction',
        detail: 'Deducts exact token credits and platform units from your workspace balance with ACID transaction guarantees.'
      },
      {
        number: '04',
        name: 'Auto-Reload & Threshold Guard',
        detail: 'If credits fall below your configured safety buffer, Razorpay auto-charges your saved payment method (Card/UPI) to guarantee zero service interruption.'
      }
    ]
  },
  benefits: [
    {
      title: 'Deterministic Token Accounting',
      description: 'Know exactly what every customer interaction costs. Inspect prompt tokens, completion tokens, and tool overheads per conversation turn.',
      highlight: 'Sub-token accuracy across all LLMs'
    },
    {
      title: 'Meta WhatsApp WCC Integration',
      description: 'Direct pass-through billing for Meta 24-hour marketing, utility, and service conversation fees in Indian Rupees (₹ INR) with no hidden markups.',
      highlight: 'Official Meta pricing parity'
    },
    {
      title: 'Zero-Downtime Auto-Reload Guard',
      description: 'Never worry about agents abruptly stopping mid-conversation due to exhausted credits. Set custom auto-topup thresholds.',
      highlight: 'Configurable automated top-up'
    },
    {
      title: 'Per-Agent & Department Budgets',
      description: 'Allocate dedicated monthly credit caps for individual agents (e.g. Support Bot vs Inbound Sales) to avoid surprise compute spikes.',
      highlight: 'Granular spending caps'
    }
  ],
  beforeYouStart: [
    {
      title: 'Valid Payment Method',
      description: 'Credit/Debit card, UPI, or Net Banking linked via Razorpay for billing and automated reloads.'
    },
    {
      title: 'Understand Meta WCC vs AI Credits',
      description: 'Recognize that AI Credits cover LLM generation tokens, while Meta WCC covers WhatsApp 24-hour service and marketing conversation charges.'
    },
    {
      title: 'Billing Admin Permissions',
      description: 'Workspace user account with Owner or Finance Admin privileges to modify spending caps.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      stage: 'Step 1 — Open the feature',
      title: 'Open Credits & Wallet Console',
      description: 'From the main navigation sidebar, click "Credits" (/user/admin/credits) to open your financial overview.',
      screenshotPlaceholder: {
        src: '/docs/screenshots/dashboard-credits-wallet.png',
        title: 'Credits & Wallet Console',
        description: 'Dual-tab wallet displaying AI Models token quota (250,991 remaining) and WhatsApp Conversation Wallet (₹3,000 balance).'
      }
    },
    {
      step: 2,
      stage: 'Step 2 — Configure the required information',
      title: 'Configure Auto-Reload & Spending Caps',
      description: 'In "Auto-Reload Settings", set your trigger buffer (e.g. reload when balance drops below ₹500) and top-up amount (₹1,000 / ₹2,500). In "Agent Budgets", assign monthly token caps.'
    },
    {
      step: 3,
      stage: 'Step 3 — Perform the action',
      title: 'Save Payment Method & Enable Auto-Topup',
      description: 'Link your billing card or UPI via Razorpay and toggle "Auto-Reload" to ON. You can also click "Recharge" to make an instant one-time wallet deposit in ₹ INR.'
    },
    {
      step: 4,
      stage: 'Step 4 — Review',
      title: 'Review Real-Time Token Expenditure Ledger',
      description: 'Inspect the Transaction Ledger. Verify per-conversation breakdowns, model-by-model token consumption (Claude vs Gemini), and Meta WCC deductions.'
    },
    {
      step: 5,
      stage: 'Step 5 — Complete',
      title: 'Export Tax Invoices & Download PDF Receipts',
      description: 'Click "Download Monthly Invoice" to get a GST-compliant tax receipt with itemized usage breakdowns for your accounting team.'
    }
  ],
  tips: [
    {
      title: 'Enable Auto-Reload to Prevent Downtime',
      description: 'Always keep an auto-reload buffer so your AI agents never drop customer messages during unpredicted traffic spikes.'
    },
    {
      title: 'Route High-Volume Tasks to Gemini',
      description: 'Use Claude or GPT for complex intent routing, but switch high-volume repetitive FAQ responses to Gemini to reduce inference costs by 70%.'
    },
    {
      title: 'Set Low Balance Email Notifications',
      description: 'Configure email alerts when your balance hits 20% to review consumption trends before automatic charges occur.'
    }
  ],
  useCases: [
    {
      title: 'High-Volume Seasonal Support Peaks',
      scenario: 'Holiday e-commerce rush with 5x typical inbound WhatsApp conversation volume.',
      solution: 'Auto-reload prevents any downtime or dropped messages while live dashboard gives real-time visibility into compute expenditure.'
    },
    {
      title: 'Multi-Client Agency Cost Pass-Through',
      scenario: 'Agencies managing OrbionAgents across multiple client brands who need itemized billing.',
      solution: 'Export individual workspace usage reports showing exact token consumption and Meta fees for seamless client invoicing.'
    },
    {
      title: 'Cost Optimization Across LLM Models',
      scenario: 'Engineering teams wanting to balance response quality against inference costs.',
      solution: 'Review token ledger to identify simple FAQ tasks that can be migrated to Gemini, cutting costs by 70%.'
    }
  ],
  expectedOutcome: 'Zero unexpected billing surprises, continuous 24/7 service availability, and complete financial auditability down to individual conversation turns.',
  troubleshooting: [
    {
      question: 'Why did my auto-reload trigger earlier than expected?',
      answer: 'A sudden burst of inbound messages or a high volume of document-heavy RAG queries can consume tokens faster. Review the Transaction Ledger to see which specific agent or conversation drove the increase.'
    },
    {
      question: 'What is the difference between AI Credits and Meta WCC?',
      answer: 'AI Credits cover LLM inference tokens and platform compute. Meta WCC covers official WhatsApp 24-hour conversation window fees (marketing, utility, service) billed directly by Meta Business in ₹ INR.'
    },
    {
      question: 'What happens if my AI Credits reach zero?',
      answer: 'OrbionAgents includes an automated Human Takeover fallback. When AI credits hit zero, active chats automatically transition to human support agents instead of dropping customer messages.'
    },
    {
      question: 'Can I set a hard spending cap to ensure I never exceed my budget?',
      answer: 'Yes! In Wallet Settings, enable "Hard Cap Enforcement". When enabled, agents pause non-essential automated tasks if your maximum monthly limit is reached.'
    }
  ]
};

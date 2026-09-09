export const creditsWalletDetail = {
  slug: 'credits-wallet',
  aliasSlugs: ['features/credits-wallet', 'billing/credits-wallet'],
  featureNumber: '07',
  category: 'Financial Infrastructure & Token Metering',
  title: 'Credits, Wallet & Token Metering',
  tagline: 'Deterministic per-token metering, Meta WCC conversation billing, transparent transaction ledgers, and zero-downtime auto-reload.',
  description: 'Total financial transparency for your AI operations. The OrbionAgents Wallet provides real-time metering for AI token consumption across models (GPT-4o, Claude, Gemini) and transparently reconciles Meta WhatsApp Conversation Charges (WCC). Set automated balance reload triggers, monitor per-agent compute costs, and review an immutable transaction ledger down to the exact millicent.',
  visualKey: 'wallet',
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
        detail: 'If credits fall below your configured safety buffer, Stripe auto-charges your card to guarantee zero service interruption.'
      }
    ]
  },
  benefits: [
    {
      title: 'Deterministic Token Accounting',
      description: 'Know exactly what every customer interaction costs. Inspect prompt tokens, completion tokens, and tool overheads per conversation turn.',
      highlight: 'Sub-cent accuracy across all LLMs'
    },
    {
      title: 'Meta WhatsApp WCC Integration',
      description: 'Direct pass-through billing for Meta 24-hour marketing and service conversation fees with no hidden markups.',
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
  setupSteps: [
    {
      step: 1,
      title: 'Access the Wallet & Review Current Balance',
      description: 'Click "Wallet" in the main navigation. Review your AI Credits balance, Meta WCC reserves, and estimated remaining conversation days.',
      screenshotPlaceholder: {
        title: 'Wallet Balance Overview Cards',
        description: 'Shows AI Token balance card, Meta WCC card, and 30-day spend trajectory graph.'
      }
    },
    {
      step: 2,
      title: 'Set Up Automated Balance Top-Up',
      description: 'Click "Auto-Reload Settings". Specify your minimum threshold (e.g. reload when balance drops below $25) and top-up amount (e.g. $100).',
      screenshotPlaceholder: {
        title: 'Auto-Reload Configuration Modal',
        description: 'Shows threshold input field, reload amount selector, and linked credit card information.'
      }
    },
    {
      step: 3,
      title: 'Configure Per-Agent Credit Allocation',
      description: 'Under "Agent Spending Limits", set daily or monthly token budgets for each active agent to enforce predictable operational costs.',
      screenshotPlaceholder: {
        title: 'Agent Token Budget Matrix',
        description: 'Shows active agent list with slider controls for monthly credit caps and alert thresholds.'
      }
    },
    {
      step: 4,
      title: 'Audit Historical Usage & Export Invoices',
      description: 'Inspect the Transaction Ledger to view itemized deductions by timestamp, model, and conversation ID. Click "Export CSV" for financial auditing.',
      screenshotPlaceholder: {
        title: 'Transaction History Ledger with Filter Controls',
        description: 'Shows transaction table with date filter, transaction type selector, and one-click invoice download.'
      }
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
      solution: 'Review token ledger to identify simple FAQ tasks that can be migrated from GPT-4o to Gemini Flash, cutting costs by 70%.'
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
      answer: 'AI Credits cover LLM inference tokens and platform storage. Meta WCC covers official WhatsApp 24-hour conversation window fees billed directly by Meta Business.'
    },
    {
      question: 'Can I set a hard spending cap to ensure I never exceed my budget?',
      answer: 'Yes! In Wallet Settings, enable "Hard Cap Enforcement". When enabled, agents pause non-essential automated tasks if your maximum monthly limit is reached.'
    }
  ]
};

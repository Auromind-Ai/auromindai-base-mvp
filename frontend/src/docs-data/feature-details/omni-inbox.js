export const omniInboxDetail = {
  slug: 'omni-inbox',
  aliasSlugs: ['features/omni-inbox'],
  featureNumber: '01',
  category: 'Unified Messaging & Live Operations',
  title: 'Omni-Channel Inbox',
  tagline: 'Single unified console for WhatsApp, Instagram, Twilio & Web chat with real-time AI copilot and one-click human takeover.',
  description: 'Eliminate fragmented communication tools. The OrbionAgents Omni-Channel Inbox aggregates customer messages across WhatsApp Cloud API, Instagram Direct, Twilio, and webhooks into a synchronized conversation queue. Support agents work alongside an AI Copilot that drafts contextual answers, retrieves CRM context, and yields control smoothly when human intervention is needed.',
  visualKey: 'inbox',
  videoPlaceholder: {
    title: 'Touring the Omni-Channel Inbox & AI Copilot',
    description: 'See how conversations from WhatsApp and Instagram route into a single queue, how agents toggle AI auto-reply on/off, and how internal private notes keep your team aligned.',
    duration: '3:15 min walkthrough'
  },
  architecture: {
    title: 'Message Ingestion & Dual-Engine Routing Architecture',
    description: 'Every inbound message passes through cryptographic signature verification before being normalized into standard Orbion thread events. Our dual-engine dispatcher evaluates whether an autonomous AI agent or a human operator should handle the response.',
    stages: [
      {
        number: '01',
        name: 'Channel Ingestion & Signature Auth',
        detail: 'Meta Graph Webhooks and Twilio webhooks deliver payloads to Orbion edge endpoints with HMAC SHA-256 validation.'
      },
      {
        number: '02',
        name: 'Thread Resolution & Contact Match',
        detail: 'Resolves phone numbers or social handles to a unified CRM profile. Active conversation histories are appended in sub-50ms.'
      },
      {
        number: '03',
        name: 'AI Copilot Inference & Draft Engine',
        detail: 'The AI Studio generates a contextual draft response using RAG knowledge base chunks and customer purchase history.'
      },
      {
        number: '04',
        name: 'Deterministic State Switch & Dispatch',
        detail: 'If autonomous mode is ON, the response is delivered immediately. If Human Takeover is active, the draft awaits agent approval.'
      }
    ]
  },
  benefits: [
    {
      title: 'Universal Channel Consolidation',
      description: 'Stop switching browser tabs between WhatsApp Web, Meta Business Suite, and email. Manage all customer conversations in one responsive workspace.',
      highlight: 'WhatsApp Cloud API + Instagram Direct'
    },
    {
      title: 'Real-Time AI Copilot & Suggested Responses',
      description: 'Agents get immediate AI-generated suggestions with cited documentation links. Accept, tweak, or discard suggestions with single-click hotkeys.',
      highlight: 'Pre-flight answer drafting'
    },
    {
      title: 'Frictionless Human-in-the-Loop Takeover',
      description: 'Flip a single toggle to silence the AI bot whenever complex complaints, VIP sales, or sensitive escalations require personal attention.',
      highlight: 'Instant autonomous/manual toggle'
    },
    {
      title: 'Internal Team Collaboration & Tags',
      description: 'Leave private internal notes on customer threads, assign leads to specific team members, and track custom tags without exposing anything to customers.',
      highlight: 'Private internal notes & assignments'
    }
  ],
  beforeYouStart: [
    {
      title: 'Connected Messaging Channel',
      description: 'At least one active channel (WhatsApp Business Cloud API or Instagram Direct) connected in Settings > Integrations.'
    },
    {
      title: 'Agent Permissions & Role',
      description: 'Workspace user account with Agent or Admin role assigned to access and reply in conversation queues.'
    },
    {
      title: 'Knowledge Base Ready',
      description: 'Verified documentation uploaded to AI Brain so the AI Copilot can generate accurate reply drafts.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      stage: 'Step 1 — Open the feature',
      title: 'Open the Omni-Channel Inbox',
      description: 'From the main navigation sidebar, click "Inbox" (/user/admin/inbox) to enter the live conversation console.'
    },
    {
      step: 2,
      stage: 'Step 2 — Configure the required information',
      title: 'Filter Queues & Configure Routing Rules',
      description: 'Select your preferred queue view (Unassigned, All Chats, WhatsApp, or Instagram). Adjust the AI confidence threshold slider and set auto-assignment preferences for team members.'
    },
    {
      step: 3,
      stage: 'Step 3 — Perform the action',
      title: 'Select Thread & Send or Approve Reply',
      description: 'Click any active conversation thread in the queue. In the bottom composer, accept the AI Copilot draft suggestion or type your own response, then click "Send" (Ctrl + Enter).'
    },
    {
      step: 4,
      stage: 'Step 4 — Review',
      title: 'Inspect Customer Context & Citations',
      description: 'Review the right-hand CRM sidebar to verify contact tags, conversation history, and the exact knowledge base chunks cited by the AI before proceeding.'
    },
    {
      step: 5,
      stage: 'Step 5 — Complete',
      title: 'Resolve Thread or Toggle Human Takeover',
      description: 'Mark the conversation as "Resolved" when finished, or toggle "AI Autonomous Mode" to OFF if manual intervention continues. The update is synced across all agent screens instantly.'
    }
  ],
  tips: [
    {
      title: 'Internal Notes for Escalation',
      description: 'Click the "Internal Note" tab (@mentions) in the composer to discuss complex tickets with colleagues without the customer seeing.'
    },
    {
      title: 'Use AI Copilot in Draft Mode First',
      description: 'Keep autonomous replies in Draft Review mode during your first week to verify suggested responses before switching to 100% autonomy.'
    },
    {
      title: 'Speed Up with Keyboard Shortcuts',
      description: 'Press Ctrl+Enter to send replies, Tab to cycle through AI suggestions, and Esc to return to the inbox queue.'
    }
  ],
  useCases: [
    {
      title: 'Tier-1 Customer Support Resolution',
      scenario: 'High volume of recurring inquiries regarding order status, return policies, and shipping timelines.',
      solution: 'Orbion AI answers 80%+ of repetitive queries autonomously using RAG knowledge base. Complex delivery issues are flagged for human agents.'
    },
    {
      title: 'High-Intent Inbound Sales Capture',
      scenario: 'Prospective buyers message on Instagram or WhatsApp asking about bulk pricing and custom packages.',
      solution: 'AI qualifies company size and budget, then instantly notifies sales reps in the inbox with contact data pre-filled.'
    },
    {
      title: 'Multi-Agent Support Handoff',
      scenario: 'Multiple team members handling different language shifts or specialized technical inquiries.',
      solution: 'Agents use internal notes (@mentions) to transfer context seamlessly without asking the customer to repeat themselves.'
    }
  ],
  expectedOutcome: 'Zero dropped inbound messages across WhatsApp and Instagram, sub-minute first-response latency, and seamless agent collaboration without tab juggling.',
  troubleshooting: [
    {
      question: 'Why are incoming WhatsApp messages not appearing in the Inbox queue?',
      answer: 'Ensure that the Webhook URL in your Meta App Dashboard matches your Orbion endpoint (e.g. /api/webhooks/whatsapp) and that the "messages" field is subscribed. Also check that your Meta System User token has not expired.'
    },
    {
      question: 'What happens when an agent sends a manual message while AI is active?',
      answer: 'Sending a manual message automatically flags the conversation as Human-in-the-Loop. The AI pauses autonomous replies for 30 minutes by default or until the agent explicitly re-enables AI Mode.'
    },
    {
      question: 'How do internal team notes work?',
      answer: 'Click the "Internal Note" tab below the message composer. Internal notes are highlighted in amber and are only visible to authenticated dashboard users, never dispatched to the customer channel.'
    }
  ]
};

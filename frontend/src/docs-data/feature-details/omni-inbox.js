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
  setupSteps: [
    {
      step: 1,
      title: 'Connect WhatsApp Cloud API or Instagram Direct',
      description: 'Navigate to Settings > Integrations and authenticate your Meta Business Account. Verify webhook verification tokens and verify phone number registration status.',
      screenshotPlaceholder: {
        title: 'Meta Channel Integration Setup Screen',
        description: 'Shows webhook URL callback configuration and permanent system token validation.'
      }
    },
    {
      step: 2,
      title: 'Configure Inbound Routing & Autonomous Default',
      description: 'Define whether inbound threads start in Autonomous AI Mode or Human Triage Mode. Assign default agent groups for escalations when confidence falls below 75%.',
      screenshotPlaceholder: {
        title: 'Inbox Routing Rules & Assignment Settings',
        description: 'Shows queue assignment rules, fallback agent selection, and confidence thresholds.'
      }
    },
    {
      step: 3,
      title: 'Operate Live Conversations & Leverage AI Drafts',
      description: 'Open the Inbox from the main navigation. Click any thread in the queue to inspect contact details, view the conversation history, and review AI copilot suggestions before sending.',
      screenshotPlaceholder: {
        title: 'Live Conversation View with AI Copilot Panel',
        description: 'Shows active customer chat on the left, message composer with AI draft, and CRM sidebar on the right.'
      }
    },
    {
      step: 4,
      title: 'Use Human Takeover for Complex Scenarios',
      description: 'When an inquiry requires custom approval, flip the "AI Autonomous Mode" toggle to OFF. The AI agent enters standby mode and logs your manual responses into the customer audit trail.',
      screenshotPlaceholder: {
        title: 'Human Takeover Toggle & Audit Trail',
        description: 'Shows the visual indicator switching from AI Agent to Support Operator with timestamp.'
      }
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

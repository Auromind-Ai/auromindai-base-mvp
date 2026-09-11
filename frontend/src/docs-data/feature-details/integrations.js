export const integrationsDetail = {
  slug: 'integrations',
  aliasSlugs: ['features/integrations', 'integrations/whatsapp-cloud-api'],
  featureNumber: '08',
  category: 'Omni-Gateway & Channel Connectivity',
  title: 'Multi-Channel Integrations Architecture',
  tagline: 'Direct Meta Cloud API, Instagram Graph, Twilio, and CRM webhook gateways with zero-drop message queueing.',
  description: 'Connect OrbionAgents directly to your customer communication channels without costly third-party aggregator markups. Our high-throughput integrations gateway supports Meta WhatsApp Cloud API, Instagram Direct & Story mentions, Twilio SMS/Voice, and outbound CRM webhooks with cryptographic HMAC signature verification and automatic retry policies.',
  visualKey: 'integrations',
  videoPlaceholder: {
    title: 'Connecting Channels & Verifying Webhooks',
    description: 'Step-by-step tutorial on generating a Meta System User permanent token, setting up webhook callback URLs, and validating inbound test messages.',
    duration: '4:30 min walkthrough'
  },
  architecture: {
    title: 'High-Throughput Gateway & Ingestion Architecture',
    description: 'Channel webhooks are received at edge gateway nodes, verified cryptographically, queued asynchronously in zero-drop Redis buffers, and dispatched to agents.',
    stages: [
      {
        number: '01',
        name: 'Meta Edge Webhook Ingestion',
        detail: 'Inbound POST requests are received with X-Hub-Signature-256 verification and immediate 200 OK acknowledgment.'
      },
      {
        number: '02',
        name: 'Cryptographic Security & Handshake',
        detail: 'Validates webhook challenge handshakes, permanent system tokens, and checks for replay attacks.'
      },
      {
        number: '03',
        name: 'Zero-Drop Asynchronous Queue',
        detail: 'Payloads are enqueued into distributed Redis streams to guarantee zero dropped messages during peak traffic spikes.'
      },
      {
        number: '04',
        name: 'Media Hydration & Thread Binding',
        detail: 'Images, voice notes, and document attachments are fetched securely from Meta CDN and linked to the active contact thread.'
      }
    ]
  },
  benefits: [
    {
      title: 'Direct Official Meta Graph API (v20+)',
      description: 'Cut out third-party SMS/WhatsApp brokers. Connect directly to Meta Cloud API for maximum delivery speed and lowest possible conversation cost.',
      highlight: 'Zero middleman latency & markups'
    },
    {
      title: 'Full Rich Media & Attachment Support',
      description: 'Send and receive WhatsApp interactive buttons, quick reply lists, voice notes, PDFs, images, and location pins natively.',
      highlight: 'Audio, images, documents & buttons'
    },
    {
      title: 'HMAC SHA-256 Webhook Security',
      description: 'Strict cryptographic payload verification ensures only legitimate requests from Meta and Twilio servers are ever processed.',
      highlight: 'Enterprise TLS 1.3 & payload verification'
    },
    {
      title: 'Bidirectional CRM & Webhook Bridges',
      description: 'Push conversation events and qualified lead data to HubSpot, Zapier, Make, or custom microservice endpoints instantly.',
      highlight: 'Real-time outbound webhooks'
    }
  ],
  beforeYouStart: [
    {
      title: 'Meta Business Manager Admin Access',
      description: 'Admin access to your Meta Business portfolio to create apps and generate System User tokens.'
    },
    {
      title: 'Dedicated Phone Number',
      description: 'A clean phone number not currently registered to a personal WhatsApp account for WhatsApp Business Cloud API.'
    },
    {
      title: 'Valid Business Documents',
      description: 'Official business registration documents if lifting Meta tier messaging limits from 250 to 1,000+ chats/day.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      stage: 'Step 1 — Open the feature',
      title: 'Open Multi-Channel Integrations Console',
      description: 'From the main navigation sidebar, click "Settings" > "Integrations" (/user/admin/integrations).'
    },
    {
      step: 2,
      stage: 'Step 2 — Configure the required information',
      title: 'Configure Channel Credentials & Tokens',
      description: 'Select your channel (WhatsApp Cloud API or Instagram Direct). Paste your Meta Phone Number ID, WhatsApp Business Account (WABA) ID, and Permanent System User Access Token.'
    },
    {
      step: 3,
      stage: 'Step 3 — Perform the action',
      title: 'Register Webhook Callback URL & Verify Secret',
      description: 'Copy your unique Orbion Webhook URL and Verification Token. In Meta App Dashboard, paste them and click "Verify and Save".'
    },
    {
      step: 4,
      stage: 'Step 4 — Review',
      title: 'Subscribe to Events & Send Inbound Test Message',
      description: 'Subscribe to "messages" and "messaging_postbacks" in Meta. Send a live test message from your mobile phone to your business number and verify that a green 200 OK webhook pulse appears.'
    },
    {
      step: 5,
      stage: 'Step 5 — Complete',
      title: 'Verify Live Stream in Omni-Channel Inbox',
      description: 'Open the Omni-Channel Inbox to confirm the incoming test chat is received and assigned. Channel connection is now verified and active 24/7.'
    }
  ],
  tips: [
    {
      title: 'Always Use System User Tokens',
      description: 'Never use temporary user tokens from Meta Graph Explorer, as they expire in 24 hours. Always generate a Permanent System User token.'
    },
    {
      title: 'Keep Webhook Verification Secret Secure',
      description: 'Store your verification secret safely. Orbion verifies every incoming payload using HMAC SHA-256 signatures to reject forged payloads.'
    },
    {
      title: 'Monitor Meta Quality Rating',
      description: 'Check your WhatsApp Quality Rating in the dashboard weekly to ensure high template approval rates and prevent temporary tier downgrades.'
    }
  ],
  useCases: [
    {
      title: 'Global WhatsApp Customer Concierge',
      scenario: 'International customers seeking support via WhatsApp in multiple countries and time zones.',
      solution: 'Direct Meta Cloud API integration guarantees instant delivery anywhere in the world with 99.99% uptime.'
    },
    {
      title: 'Instagram DM & Story Mention Engagement',
      scenario: 'Influencers and buyers tagging the brand in Instagram stories and sending DMs asking for product links.',
      solution: 'Orbion detects story mentions, auto-replies with thank-you messages and exclusive promo links in Instagram Direct.'
    },
    {
      title: 'Custom CRM Synchronization Webhooks',
      scenario: 'Enterprise client using proprietary in-house ERP/CRM systems.',
      solution: 'Configure custom outbound webhooks that trigger on lead updates, syncing full transcript JSON payloads to the ERP.'
    }
  ],
  expectedOutcome: 'Direct, reliable multi-channel connectivity with sub-second delivery, zero third-party middleman markup, and comprehensive rich media support.',
  troubleshooting: [
    {
      question: 'Why did the Meta webhook verification fail with "Challenge mismatch"?',
      answer: 'Ensure that the "Verify Token" entered in the Meta App Dashboard matches the exact secret token displayed in your Orbion Integration settings without any extra whitespace.'
    },
    {
      question: 'What happens if Meta experiences an API outage or delivery delay?',
      answer: 'Orbion automatically queues outgoing messages in a durable Redis queue with exponential backoff retries, ensuring messages are delivered as soon as connectivity resumes.'
    },
    {
      question: 'Can I connect multiple WhatsApp business numbers to one workspace?',
      answer: 'Yes! Orbion supports multi-number configurations. Each number can be assigned its own autonomous agent persona or routed to distinct team queues.'
    }
  ]
};

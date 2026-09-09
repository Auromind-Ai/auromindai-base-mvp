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
  setupSteps: [
    {
      step: 1,
      title: 'Create Meta Business App & System User',
      description: 'In Meta Business Manager, create a System User with Admin permissions. Generate a permanent access token with whatsapp_business_messaging and whatsapp_business_management scopes.',
      screenshotPlaceholder: {
        title: 'Meta Developer Console Token Generation',
        description: 'Shows System User screen with permanent access token generation and assigned permissions.'
      }
    },
    {
      step: 2,
      title: 'Configure Webhook Endpoint & Verify Token',
      description: 'Copy your unique Orbion Webhook URL from Integrations > WhatsApp. In Meta App Dashboard, paste the URL and enter your Verification Secret token.',
      screenshotPlaceholder: {
        title: 'Meta Webhooks Configuration Panel',
        description: 'Shows Callback URL and Verify Token fields with green "Verified" status checkmark.'
      }
    },
    {
      step: 3,
      title: 'Subscribe to Messaging Webhook Fields',
      description: 'In Meta Webhook subscriptions, check "messages", "messaging_postbacks", and "message_deliveries" to enable full two-way chat synchronization.',
      screenshotPlaceholder: {
        title: 'Webhook Field Subscription Matrix',
        description: 'Shows checkboxes for messages, message_deliveries, and message_reads enabled.'
      }
    },
    {
      step: 4,
      title: 'Send a Live Test Message & Verify Ingestion',
      description: 'Send a WhatsApp message from your personal phone to your registered business number. Watch it appear instantly in the Omni-Channel Inbox.',
      screenshotPlaceholder: {
        title: 'Live Message Ingestion Confirmation',
        description: 'Shows live inbound message reflected in the Omni-Channel Inbox within 200 milliseconds.'
      }
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

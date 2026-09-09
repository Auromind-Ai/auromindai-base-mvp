export const leadsCrmDetail = {
  slug: 'leads-crm',
  aliasSlugs: ['features/leads-crm'],
  featureNumber: '04',
  category: 'Revenue Operations & Lead Scoring',
  title: 'AI Lead Intelligence & CRM',
  tagline: 'Autonomous prospect qualification, real-time intent extraction, and automated CRM pipeline syncing.',
  description: 'Turn casual WhatsApp and Instagram chats into high-value revenue pipelines. OrbionAgents AI Lead Intelligence scans inbound conversations in real time, extracts qualifying parameters (budget, timeline, company size, decision authority), assigns a dynamic lead score, and immediately synchronizes updated profiles to your CRM.',
  visualKey: 'leads',
  videoPlaceholder: {
    title: 'Managing Leads & Automated Qualification',
    description: 'See how the AI detects buying signals during a WhatsApp conversation, extracts budget and timeline details, calculates a Hot/Warm/Cold score, and alerts the sales team.',
    duration: '3:40 min walkthrough'
  },
  architecture: {
    title: 'Natural Language Intent Extraction & Scoring Pipeline',
    description: 'Every interaction is analyzed using structured information extraction models that detect BANT (Budget, Authority, Need, Timeline) signals and compute a weighted qualification index.',
    stages: [
      {
        number: '01',
        name: 'Conversational Ingestion',
        detail: 'Inbound customer chat stream is parsed for entity tokens, product mentions, and explicit commercial inquiries.'
      },
      {
        number: '02',
        name: 'Entity & Parameter Extraction',
        detail: 'Extracts structured fields: estimated budget, purchase timeline, company name, team seats, and key blockers.'
      },
      {
        number: '03',
        name: 'Weighted Lead Scoring Algorithm',
        detail: 'Calculates a 0-100 score based on intent urgency, budget alignment, and decision maker status (Hot > 75, Warm 40-74, Cold < 40).'
      },
      {
        number: '04',
        name: 'CRM Sync & Rep Dispatch',
        detail: 'Dispatches webhook or native sync to HubSpot/Salesforce, creating contact records and notifying sales reps via Slack/WhatsApp.'
      }
    ]
  },
  benefits: [
    {
      title: 'Zero Manual CRM Data Entry',
      description: 'Never force sales reps to spend hours manually typing notes or copy-pasting phone numbers. Orbion auto-populates CRM fields directly from the dialogue.',
      highlight: 'Automated contact & entity extraction'
    },
    {
      title: 'Actionable Hot / Warm / Cold Scoring',
      description: 'Prioritize team focus on deals ready to close today. Hot leads trigger instant notifications so sales reps can jump in within 60 seconds.',
      highlight: 'Dynamic 0-100 qualification scoring'
    },
    {
      title: 'Transparent Pipeline Kanban Board',
      description: 'Visualize your entire sales funnel from "Inbound Discovered" to "Demo Scheduled" and "Proposal Sent" in an intuitive drag-and-drop board.',
      highlight: 'Visual deal stage management'
    },
    {
      title: 'Bi-Directional CRM Synchronization',
      description: 'Integrate directly with HubSpot, Salesforce, Pipedrive, Zoho CRM, or custom webhooks. Changes in your CRM update Orbion lead cards instantly.',
      highlight: 'HubSpot, Salesforce & Webhook sync'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Define Qualification Criteria & Custom Fields',
      description: 'Navigate to AI CRM > Settings > Qualification Rules. Specify which parameters your business needs to extract (e.g., Annual Budget, Target Launch Date, Current Provider).',
      screenshotPlaceholder: {
        title: 'Lead Qualification Criteria Builder',
        description: 'Shows customizable qualification rules with field data types (Currency, Date, Text) and scoring weights.'
      }
    },
    {
      step: 2,
      title: 'Configure Scoring Weights & Stage Thresholds',
      description: 'Set score thresholds for Hot (e.g. >= 80), Warm (40-79), and Cold (< 40). Assign higher weight to immediate purchase timelines and verified budget figures.',
      screenshotPlaceholder: {
        title: 'Score Thresholds & Alert Triggers',
        description: 'Shows slider controls for Hot/Warm/Cold ranges and notification checkbox for high-intent deals.'
      }
    },
    {
      step: 3,
      title: 'Connect CRM Destination (HubSpot / Salesforce / Webhook)',
      description: 'Select your CRM integration under Settings > Integrations. Authorize OAuth access and map Orbion extracted parameters to corresponding CRM deal properties.',
      screenshotPlaceholder: {
        title: 'CRM Property Mapping Interface',
        description: 'Shows side-by-side mapping between Orbion extracted variables and HubSpot Contact/Deal properties.'
      }
    },
    {
      step: 4,
      title: 'Track Pipeline & Review Extracted Lead Cards',
      description: 'Open the Leads dashboard to view newly qualified prospects. Click any lead card to see the full qualification transcript, extracted metadata, and confidence score.',
      screenshotPlaceholder: {
        title: 'Pipeline Kanban Board with Active Leads',
        description: 'Shows columns for New Inquiries, Qualified, Demo Booked, and Won Deals with lead contact badges.'
      }
    }
  ],
  useCases: [
    {
      title: 'Real Estate Buyer & Tenant Pre-Screening',
      scenario: 'High volume of inquiries on WhatsApp asking for property viewings.',
      solution: 'AI asks preferred neighborhood, budget bracket, and move-in date. If criteria match active listings, an agent is scheduled to host a tour.'
    },
    {
      title: 'B2B SaaS Sales Qualification',
      scenario: 'Website visitors chatting on WhatsApp asking about enterprise pricing.',
      solution: 'AI clarifies company size, current tech stack, and primary pain point. If company has >50 employees, it assigns a "Hot" rating and routes to account executives.'
    },
    {
      title: 'Automotive Dealership Test Drives',
      scenario: 'Prospective car buyers inquiring about vehicle availability and financing.',
      solution: 'AI extracts preferred model, trade-in status, and down payment budget, booking a test drive appointment directly into the showroom CRM.'
    }
  ],
  expectedOutcome: '3x faster sales response time to high-intent leads, complete contact data hygiene without manual admin work, and higher pipeline conversion rates.',
  troubleshooting: [
    {
      question: 'Why did a lead receive a lower score than expected?',
      answer: 'Check the qualification rules. If a customer expressed high enthusiasm but did not state a concrete budget or timeline, the algorithm marks those criteria as incomplete. You can adjust the scoring weight in Settings > Qualification Rules.'
    },
    {
      question: 'How do I prevent duplicates if a contact messages from both WhatsApp and Instagram?',
      answer: 'Orbion automatically merges contacts based on verified email or phone number. When a contact shares their email in Instagram chat, the profile is linked to their existing phone record.'
    },
    {
      question: 'Can I manually override an AI-assigned lead score?',
      answer: 'Yes. In the Lead Details panel, click the lead status badge to manually set it to Hot, Warm, or Cold, or drag the card to a different pipeline column.'
    }
  ]
};

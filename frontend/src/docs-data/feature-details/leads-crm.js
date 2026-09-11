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
  beforeYouStart: [
    {
      title: 'Identify Qualification Criteria',
      description: 'Define the key fields your sales team needs to capture (e.g. Budget, Decision Authority, Timeline, Company Size).'
    },
    {
      title: 'Live Inbound Channel',
      description: 'At least one messaging channel active so prospective leads can message your brand.'
    },
    {
      title: 'External CRM Account (Optional)',
      description: 'Connected HubSpot, Salesforce, or webhook destination if auto-syncing outside Orbion.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      stage: 'Step 1 — Open the feature',
      title: 'Open Leads & CRM Dashboard',
      description: 'From the main navigation sidebar, click "Leads / CRM" (/user/admin/crm) to access your prospect pipeline.'
    },
    {
      step: 2,
      stage: 'Step 2 — Configure the required information',
      title: 'Configure Qualification Rules & Scoring Thresholds',
      description: 'In CRM Settings, specify parameters to extract (Budget, Timeline, Seat Count) and configure scoring thresholds for Hot (>=80), Warm (40-79), and Cold (<40).'
    },
    {
      step: 3,
      stage: 'Step 3 — Perform the action',
      title: 'Link CRM Destination or Webhook',
      description: 'Click "Connect CRM" under Settings > Integrations. Authorize HubSpot/Salesforce or input your webhook endpoint and map extracted fields to CRM contact properties.'
    },
    {
      step: 4,
      stage: 'Step 4 — Review',
      title: 'Review Extracted Lead Cards & Confidence Scores',
      description: 'Click any prospect card in the Kanban board. Verify the extracted contact details, conversation transcript snippet, and calculated qualification score.'
    },
    {
      step: 5,
      stage: 'Step 5 — Complete',
      title: 'Assign Sales Rep & Transition Deal Stage',
      description: 'Assign the lead to a sales rep or drag the deal card to "Demo Scheduled". Automatic notifications are dispatched to the assigned rep via WhatsApp/Slack.'
    }
  ],
  tips: [
    {
      title: 'Real-Time Alert for Hot Deals',
      description: 'Enable push or WhatsApp alerts for leads scored >80 so reps can call or message back while the prospect is still active.'
    },
    {
      title: 'Automated Contact Deduplication',
      description: 'Orbion automatically merges contacts based on verified email or phone number across WhatsApp and Instagram.'
    },
    {
      title: 'Export Itemized CSV for Reports',
      description: 'Click "Export Leads" to generate sanitized CSV summaries of captured prospect data for weekly revenue meetings.'
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

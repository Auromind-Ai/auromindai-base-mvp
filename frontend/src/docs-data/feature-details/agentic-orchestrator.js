export const agenticOrchestratorDetail = {
  slug: 'agentic-orchestrator',
  aliasSlugs: ['features/agentic-orchestrator'],
  featureNumber: '05',
  category: 'Visual Workflow Automation',
  title: 'Automation Wire (Flow Builder)',
  tagline: 'Visual drag-and-drop orchestration canvas connecting triggers, AI intent classifiers, decision branches, and external actions.',
  description: 'Design complex, multi-step customer journeys without writing code. Automation Wire gives you an interactive visual canvas where triggers (inbound chats, form submissions, CRM status changes) flow into AI intent classification nodes, conditional logic branches, and automated actions like API calls, WhatsApp template notifications, and human escalations.',
  visualKey: 'automation',
  videoPlaceholder: {
    title: 'Building Multi-Branch Workflows in Automation Wire',
    description: 'Watch how to drag and drop an Inbound Trigger node, wire it into an AI Intent Classifier, create conditional forks for VIP vs Standard routing, and trigger automated webhook actions.',
    duration: '4:45 min walkthrough'
  },
  architecture: {
    title: 'Visual Node Graph & State Machine Execution',
    description: 'Every workflow runs on a deterministic directed acyclic graph (DAG) engine. Inbound events trigger state transitions across nodes with built-in retry logic and distributed trace IDs.',
    stages: [
      {
        number: '01',
        name: 'Event Ingestion Trigger',
        detail: 'Captures triggers from WhatsApp Cloud API, Instagram DM, HubSpot webhook, or scheduled cron timers.'
      },
      {
        number: '02',
        name: 'AI Intent & Entity Parsing Node',
        detail: 'Evaluates user message semantic intent and outputs discrete routing signals (e.g. Sales Inquiry vs Tech Support).'
      },
      {
        number: '03',
        name: 'Conditional Branching & Logic Gates',
        detail: 'Evaluates boolean rules (e.g. Lead Score >= 80, VIP Tag Present, Business Hours Open) to choose execution paths.'
      },
      {
        number: '04',
        name: 'Action Execution & External Dispatch',
        detail: 'Executes actions: dispatching WhatsApp message templates, invoking MCP database tools, or creating CRM tasks.'
      }
    ]
  },
  benefits: [
    {
      title: 'No-Code Visual Node Canvas',
      description: 'Drag, connect, and re-wire triggers, AI evaluation nodes, and actions. Clear visual connectors make multi-step workflows easy to audit and understand.',
      highlight: 'Interactive drag-and-drop graph editor'
    },
    {
      title: 'AI Intent-Based Routing Gates',
      description: 'Move beyond rigid keyword matching. Let AI understand the underlying goal of the customer to intelligently route them down the right path.',
      highlight: 'Semantic intent classification'
    },
    {
      title: 'Deterministic Retry & Fallback Safe-guards',
      description: 'If a third-party API or webhook fails, Automation Wire executes configured fallback paths or alerts an on-call agent automatically.',
      highlight: 'Automatic error handling & retries'
    },
    {
      title: 'Live Flow Testing & Step-Through Debugger',
      description: 'Simulate workflow runs with mock payloads before publishing. Watch nodes illuminate in green as data traverses each branch.',
      highlight: 'Visual step-by-step debugger'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Create a New Workflow from Canvas or Template',
      description: 'Go to Automation Wire from the navigation. Click "New Flow" and select a pre-built template (e.g., Inbound Lead Triage, Support Escalation, Abandoned Cart Re-engagement).',
      screenshotPlaceholder: {
        title: 'Workflow Canvas with Available Node Library',
        description: 'Shows blank canvas in center and left sidebar containing Triggers, Logic, AI Nodes, and Actions.'
      }
    },
    {
      step: 2,
      title: 'Place the Trigger & Configure Inbound Conditions',
      description: 'Drag the "Inbound WhatsApp Message" node onto the canvas. Set channel filters (e.g. only trigger on Main Support Number) and operating hours.',
      screenshotPlaceholder: {
        title: 'Trigger Node Configuration Drawer',
        description: 'Shows channel dropdown selector, keyword filter options, and business hours schedule toggle.'
      }
    },
    {
      step: 3,
      title: 'Add AI Intent Classification & Branching Forks',
      description: 'Connect the trigger to an "AI Intent Classifier" node. Define output routes: [Sales Lead], [Billing / Invoices], and [Technical Support]. Wire each route to specific actions.',
      screenshotPlaceholder: {
        title: 'Intent Classifier Node with Dynamic Branches',
        description: 'Shows intent branch connectors splitting into separate paths with custom labels and descriptions.'
      }
    },
    {
      step: 4,
      title: 'Attach Actions & Publish the Live Flow',
      description: 'Connect outcomes to "Send Message", "Invoke MCP Tool", or "Assign to Human". Click "Run Test Simulation" to test, then toggle the flow status to "Active".',
      screenshotPlaceholder: {
        title: 'Completed Active Workflow with Trace Highlights',
        description: 'Shows entire graph with active status badge, execution counter, and publish confirmation banner.'
      }
    }
  ],
  useCases: [
    {
      title: 'Intelligent Inbound Triage & Escalation',
      scenario: 'High-volume incoming chats containing a mix of billing questions, new sales inquiries, and urgent outages.',
      solution: 'Flow analyzes intent in real time. Billing questions get instant invoice links, outages trigger SMS alerts to DevOps, and sales chats alert reps.'
    },
    {
      title: 'Off-Hours Automated Lead Engagement',
      scenario: 'Customers messaging late at night when live support agents are offline.',
      solution: 'Workflow detects out-of-office hours, greets the customer via AI, collects contact details, and schedules a callback for 9:00 AM the next morning.'
    },
    {
      title: 'VIP Customer High-Priority Routing',
      scenario: 'High-value enterprise customers need immediate white-glove assistance without waiting in standard queues.',
      solution: 'Branch checks CRM lifetime value or VIP tag. If VIP, the flow skips the bot and routes directly to a dedicated Account Executive.'
    }
  ],
  expectedOutcome: 'Automated, deterministic execution of customer journeys 24/7 with zero dropped steps, complete visual auditability, and immediate human escalations when needed.',
  troubleshooting: [
    {
      question: 'Why did an incoming message not trigger the workflow?',
      answer: 'Ensure the workflow toggle is switched to "Active" (not Draft). Also verify that the trigger node channel filter matches the incoming phone number or social handle.'
    },
    {
      question: 'Can two workflows trigger on the same message?',
      answer: 'If multiple flows share the same trigger conditions, Orbion executes them in order of priority (configurable in Flow Settings), or you can use an Intent Router as a single master flow.'
    },
    {
      question: 'Where can I see the execution logs of past workflow runs?',
      answer: 'Click the "Execution History" tab in Automation Wire to view every transaction, including the exact path taken, input data, and node latencies.'
    }
  ]
};

export const DOCS_NAVIGATION = [
  {
    category: "Getting Started",
    icon: "Rocket",
    items: [
      {
        slug: "getting-started/introduction",
        title: "Introduction to OrbionAgents",
        description: "Overview of the governed AI agent platform, core capabilities, and architecture.",
        badge: "Overview"
      },
      {
        slug: "getting-started/account-setup",
        title: "Creating an Account & Setup",
        description: "Step-by-step account onboarding, workspace initialization, and profile settings."
      },
      {
        slug: "getting-started/quickstart",
        title: "5-Minute Quick Start Guide",
        description: "Connect your first messaging channel and ingest your knowledge base in minutes.",
        badge: "Fast Track"
      },
      {
        slug: "getting-started/dashboard-overview",
        title: "Dashboard & Analytics KPIs",
        description: "Understanding your conversational pipeline, active chats, response times, and ROI."
      }
    ]
  },
  {
    category: "Core Features",
    icon: "Sparkles",
    items: [
      {
        slug: "features/ai-workspace",
        title: "AI Workspace & Smart Copilot",
        description: "Multi-model conversational workspace with real-time streaming, Brain RAG search, document analysis, and session history.",
        badge: "Video Included",
        hasVideo: true
      },
      {
        slug: "features/agentic-orchestrator",
        title: "Agentic Orchestrator (Flows)",
        description: "Visual workflow canvas, Magic Wire AI generation, sequential linking, decision logic, and interactive button bots.",
        badge: "Video Included",
        hasVideo: true
      },
      {
        slug: "features/brain-rag",
        title: "AI Brain (RAG & Knowledge Base)",
        description: "Upload PDFs, sync live web URLs, and crawl full sitemaps with pgvector embeddings."
      },
      {
        slug: "features/omni-inbox",
        title: "Omni-Inbox & Human Takeover",
        description: "Unified inbox across WhatsApp, Instagram, Twilio, and Web with 1-click human intervention."
      },
      {
        slug: "features/leads-crm",
        title: "Leads & CRM Pipeline",
        description: "Capture, qualify, tag, and export contacts directly from active conversational channels."
      },
      {
        slug: "features/templates",
        title: "WhatsApp Message Templates",
        description: "Design Meta-approved WhatsApp broadcast and transactional templates with variables."
      },
      {
        slug: "features/credits-wallet",
        title: "Credits, Wallet & Token Metering",
        description: "Monitor real-time token expenditure, model-by-model consumption, and auto top-up."
      }
    ]
  },
  {
    category: "Channels & Integrations",
    icon: "Share2",
    items: [
      {
        slug: "integrations/whatsapp-cloud-api",
        title: "WhatsApp Business Cloud API",
        description: "Direct Meta Graph API integration with phone number ID, WABA ID, and webhook callbacks."
      },
      {
        slug: "integrations/instagram",
        title: "Instagram Graph API Integration",
        description: "Connect your Instagram Business account to automate DMs and story mention replies."
      },
      {
        slug: "integrations/twilio",
        title: "Twilio SMS & WhatsApp Gateway",
        description: "Configure Account SID and Auth Tokens for international SMS and backup routing."
      },
      {
        slug: "integrations/email-calendar",
        title: "Gmail & Google Calendar Sync",
        description: "Automate email replies and synchronize real-time demo bookings with Google Calendar."
      }
    ]
  },
  {
    category: "Account & Governance",
    icon: "Shield",
    items: [
      {
        slug: "account/workspace-management",
        title: "Workspaces & Team Permissions",
        description: "Multi-tenant workspace configuration, member invitations, and role-based access control."
      },
      {
        slug: "account/ai-governance",
        title: "AI Governance & Safeguards (MCP)",
        description: "Model Context Protocol guardrails, sensitive topic blocking, and PII masking."
      }
    ]
  },
  {
    category: "Billing & Subscriptions",
    icon: "CreditCard",
    items: [
      {
        slug: "billing/plans-pricing",
        title: "Subscription Plans & Add-ons",
        description: "Free, Starter, Pro, and Enterprise tiers with quota limits and channel allowances."
      },
      {
        slug: "billing/gst-invoices",
        title: "GST Compliance & Invoices",
        description: "Add your GSTIN, generate B2B tax invoices with CGST/SGST, and download PDFs."
      }
    ]
  },
  {
    category: "Troubleshooting & Support",
    icon: "HelpCircle",
    items: [
      {
        slug: "troubleshooting/common-issues",
        title: "Common Issues & Resolutions",
        description: "Guidance on customer care windows, webhook synchronization, knowledge base uploads, and credit safeguards."
      },
      {
        slug: "troubleshooting/faq",
        title: "Frequently Asked Questions",
        description: "Answers to the most common product, setup, billing, and technical integration questions."
      }
    ]
  }
];

export const ALL_DOC_SLUGS = [
  ...DOCS_NAVIGATION.flatMap(c => c.items.map(i => i.slug)),
  "features/flow-linking",
  "features/magic-wire",
  "features/conditional-logic",
  "features/interactive-menus",
  "features/automation",
  "features/ai-brain",
  "features/lead-intelligence",
  "features/wallet",
  "features/ai-governance",
  "features/integrations",
];

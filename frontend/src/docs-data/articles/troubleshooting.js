export const TROUBLESHOOTING_ARTICLES = {
  "troubleshooting/common-issues": {
    slug: "troubleshooting/common-issues",
    category: "Troubleshooting & Support",
    title: "Common Issues & Resolutions",
    subtitle: "Troubleshooting guides for Meta 24-hour window errors, webhook drops, RAG ingestion failures, and token limits.",
    readTime: "7 min read",
    lastUpdated: "June 2026",
    whatIsIt: "A structured diagnostics guide detailing the most common operational and technical errors encountered while operating OrbionAgents, along with root-cause explanations and step-by-step resolution pathways.",
    whyUseIt: "Quickly self-diagnose and resolve issues without waiting for support tickets, ensuring continuous uptime for your customer-facing conversational agents.",
    beforeYouStart: [
      "Access to your OrbionAgents workspace with Admin permissions.",
      "Access to your Meta Developer App or connected messaging dashboards if troubleshooting channel connectivity."
    ],
    steps: [
      {
        step: 1,
        title: "Identify the Error Category",
        instruction: "Determine whether the issue relates to Channel Connectivity (Meta/Instagram/Twilio), Flow Execution (Wires/Orchestrator), Knowledge Retrieval (Brain), or Billing/Tokens.",
        uiElements: ["Error toast messages", "Network tab in browser DevTools", "Channels status badge"]
      },
      {
        step: 2,
        title: "Check System Health Indicators",
        instruction: "Inspect the Channels page (/user/admin/channels) to confirm active green connection indicators, and inspect the Credits widget to ensure positive token balances.",
        uiElements: ["Channel status indicator", "Credit Ring counter", "API status banner"]
      },
      {
        step: 3,
        title: "Audit Webhook Logs",
        instruction: "If messages fail to deliver, inspect the Meta App Dashboard -> Webhooks -> Test & Diagnostic tool to check if incoming webhook events return HTTP 200.",
        uiElements: ["Meta Webhook delivery logs", "HTTP response code status"]
      },
      {
        step: 4,
        title: "Verify Flow Validation",
        instruction: "In Wires (/user/admin/automation), open your active flow and inspect the Flow Health bar. If 'Validation Required' is red, resolve missing copy or disconnected ports.",
        uiElements: ["'Flow Health' status bar", "'Validation Required' alert", "'Sync Wire' button"]
      },
      {
        step: 5,
        title: "Perform an End-to-End Test Dialogue",
        instruction: "Send a message from a real WhatsApp or Instagram account and watch the Omni-Inbox to verify that the conversation appears and receives an automated response.",
        uiElements: ["Omni-Inbox real-time stream", "Takeover switch status"]
      }
    ],
    screenshots: [
      {
        src: "/images/wires-hero.webp",
        alt: "Common Issues Troubleshooting Matrix",
        caption: "Troubleshooting flow validation errors and channel connectivity in OrbionAgents."
      }
    ],
    expectedResult: "Identified bottlenecks are resolved, returning your conversational agents to optimal 24/7 operating performance.",
    tips: [
      "Keep a test WhatsApp number that is not linked to an employee so you can test customer journeys without corrupting live customer threads.",
      "Always check the 24-hour service window before attempting outbound broadcast messages on WhatsApp."
    ],
    troubleshooting: [
      {
        issue: "Meta WhatsApp Error 131047: 'Re-engagement message requires template'?",
        solution: "More than 24 hours have passed since the customer's last message. You must use an approved WhatsApp Template to initiate contact."
      },
      {
        issue: "Brain document ingestion hangs in 'Processing' status?",
        solution: "If a document remains in processing for > 3 minutes, re-upload it with images stripped out or convert it to standard TXT/CSV format."
      },
      {
        issue: "AI Workspace returns '401 Unauthorized'?",
        solution: "Your authentication session has expired. Click 'Log Out' in the lower-left sidebar and sign in again to refresh your JWT token."
      },
      {
        issue: "Agent answers with generic knowledge instead of company data?",
        solution: "Ensure the document is attached to the active workspace Brain and that 'AI Agent Grounding' is enabled in Settings -> AI Control."
      }
    ],
    seo: {
      title: "Common Issues & Resolutions | OrbionAgents",
      description: "Step-by-step troubleshooting guide for Meta 24-hour window errors, webhook drops, RAG ingestion failures, and token limits.",
      keywords: ["OrbionAgents troubleshooting", "WhatsApp webhook error", "Meta 24 hour window", "RAG ingestion failure"]
    }
  },

  "troubleshooting/faq": {
    slug: "troubleshooting/faq",
    category: "Troubleshooting & Support",
    title: "Frequently Asked Questions",
    subtitle: "Answers to the top 20 most common product, architecture, channel setup, and billing questions.",
    readTime: "8 min read",
    lastUpdated: "June 2026",
    whatIsIt: "A curated repository of frequently asked questions submitted by developers, product managers, and business operators using OrbionAgents.",
    whyUseIt: "Provides instant clarity on technical architecture, platform capabilities, Meta compliance, and operational best practices.",
    beforeYouStart: [
      "Review the Getting Started guide for general platform concepts."
    ],
    steps: [
      {
        step: 1,
        title: "Search by Category",
        instruction: "Use the search bar at the top of the documentation or scroll to the relevant category: General, Channels, Brain & RAG, Wires & Automations, or Billing.",
        uiElements: ["Search input (Cmd+K / Ctrl+K)", "Category section headers"]
      },
      {
        step: 2,
        title: "Review Question & Answer Pairs",
        instruction: "Click on any question to expand detailed explanations, code snippets, and direct links to related deep-dive guides.",
        uiElements: ["Accordion question cards", "Direct deep links"]
      },
      {
        step: 3,
        title: "Follow Recommended Actions",
        instruction: "Implement the suggested configurations directly in your workspace settings.",
        uiElements: ["Settings shortcuts", "Links to documentation sections"]
      },
      {
        step: 4,
        title: "Verify Resolution",
        instruction: "Test the feature in AI Workspace or Omni-Inbox to confirm expected operation.",
        uiElements: ["AI Workspace simulation", "Omni-Inbox thread"]
      },
      {
        step: 5,
        title: "Contact Support If Needed",
        instruction: "If your question is not covered, click 'Contact Support' to reach our engineering team via live chat or email at support@orbionagents.com.",
        uiElements: ["'Contact Support' button", "Support ticket drawer"]
      }
    ],
    screenshots: [
      {
        src: "/images/documentation.webp",
        alt: "Frequently Asked Questions FAQ Hub",
        caption: "Comprehensive FAQ hub answering technical, operational, and billing questions."
      }
    ],
    expectedResult: "Rapid resolution of common inquiries and complete understanding of OrbionAgents capabilities.",
    tips: [
      "Bookmark this page for quick reference when onboarding new team members.",
      "Check the 'What's New' section in the user dashboard for recent feature announcements."
    ],
    troubleshooting: [
      {
        issue: "Can I connect multiple WhatsApp numbers to one workspace?",
        solution: "Yes! Pro and Enterprise plans support multi-number management. Each number can be assigned to different Wires or run the same unified bot."
      },
      {
        issue: "Does OrbionAgents use customer chat data to train foundation models?",
        solution: "No. OrbionAgents enforces strict zero-retention data policies. Your conversations, customer PII, and Brain documents are never used for public model training."
      },
      {
        issue: "What happens if our wallet runs out of credits during a live conversation?",
        solution: "If your wallet reaches zero, the system pauses generative AI replies and gracefully switches the conversation to Human Takeover mode in Omni-Inbox."
      },
      {
        issue: "Can we migrate our existing ManyChat or Landbot flows to OrbionAgents?",
        solution: "Yes. Our team provides migration assistance, or you can describe your existing flow to Magic Wire to recreate it in seconds."
      },
      {
        issue: "Is GST input tax credit available for Indian businesses?",
        solution: "Yes. Enter your 15-digit GSTIN under Billing -> Billing Profile, and all future invoices will include valid tax breakdowns with CGST/SGST/IGST."
      }
    ],
    seo: {
      title: "Frequently Asked Questions (FAQ) | OrbionAgents",
      description: "Answers to the most common questions about OrbionAgents AI agents, WhatsApp Cloud API, RAG Brain, and billing.",
      keywords: ["OrbionAgents FAQ", "WhatsApp bot questions", "AI agent FAQ", "conversational AI questions"]
    }
  }
};

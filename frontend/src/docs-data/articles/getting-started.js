export const GETTING_STARTED_ARTICLES = {
  "getting-started/introduction": {
    slug: "getting-started/introduction",
    category: "Getting Started",
    title: "Introduction to OrbionAgents",
    subtitle: "Enterprise conversational AI platform uniting messaging channels, knowledge grounding, and visual automation.",
    pageType: "onboarding",
    sections: [
      {
        id: "overview",
        title: "Platform Overview",
        type: "text",
        content: "OrbionAgents is a conversational AI and operations platform built for businesses to handle customer communication, qualify inbound sales leads, and resolve support requests across WhatsApp, Instagram, SMS, and Webchat. By combining large language models with grounded knowledge retrieval (RAG) and deterministic workflow triggers, Orbion enables autonomous agents to operate 24/7 with strict human-in-the-loop oversight."
      },
      {
        id: "core-pillars",
        title: "Core Platform Capabilities",
        type: "list",
        items: [
          { title: "Omni-Channel Inbox", description: "A unified collaborative queue aggregating conversations from WhatsApp Cloud API, Instagram Direct, and Twilio." },
          { title: "AI Brain (RAG Knowledge Base)", description: "Vector-grounded document store ingesting PDFs, technical manuals, and live URLs to prevent model hallucinations." },
          { title: "AI Workspace & Agent Studio", description: "Studio for engineering agent personas, system prompt constraints, and attaching external MCP tools." },
          { title: "Automation Wire (Flow Builder)", description: "Visual node graph canvas for building multi-step logic, AI intent classifiers, and automated actions." },
          { title: "AI Lead Intelligence & CRM", description: "Real-time parameter extraction identifying buyer budget, urgency, and qualification tiers (Hot/Warm/Cold)." },
          { title: "AI Governance & Safeguards", description: "Runtime policy boundaries enforcing PII redaction, adversarial jailbreak defense, and human sign-off on financial actions." }
        ]
      },
      {
        id: "next-steps",
        title: "Recommended Implementation Path",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Create Account & Provision Workspace",
            instruction: "Sign up at /signup, create your organization, and configure your default operating timezone.",
            uiElements: ["Signup portal", "Workspace provisioning wizard"]
          },
          {
            step: 2,
            title: "Connect Your Inbound Channels",
            instruction: "Navigate to Channels (/user/admin/channels) to authenticate your official Meta WhatsApp Business number or Instagram Direct account.",
            uiElements: ["Channels console", "'Connect WhatsApp' button"]
          },
          {
            step: 3,
            title: "Upload Grounding Knowledge",
            instruction: "Add your pricing sheets, product catalogs, or FAQs to the AI Brain so your agents answer with verifiable source citations.",
            uiElements: ["AI Brain console", "'Upload Documents' dropzone"]
          },
          {
            step: 4,
            title: "Test in Agent Studio & Deploy",
            instruction: "Interact with your agent in the live studio playground, verify tool executions, and turn on autonomous mode.",
            uiElements: ["Agent Studio playground", "'Publish' button"]
          }
        ]
      }
    ],
    seo: {
      title: "Introduction to OrbionAgents | Enterprise Conversational AI Platform",
      description: "Learn what OrbionAgents is, how governed AI agents automate customer sales and support on WhatsApp & Instagram, and platform architecture.",
      keywords: ["OrbionAgents documentation", "AI agents", "WhatsApp automation", "Governed AI", "RAG conversational platform"]
    }
  },

  "getting-started/account-setup": {
    slug: "getting-started/account-setup",
    category: "Getting Started",
    title: "Creating an Account & Setup",
    subtitle: "Complete account creation, multi-tenant workspace provisioning, and security settings.",
    pageType: "onboarding",
    sections: [
      {
        id: "overview",
        title: "Account & Workspace Architecture",
        type: "text",
        content: "Orbion accounts are structured around multi-tenant workspaces. An organization can host multiple distinct workspaces (such as separate departments, regional teams, or client accounts) with completely isolated knowledge collections, channel tokens, collaborator permissions, and billing quotas."
      },
      {
        id: "prerequisites",
        title: "Prerequisites",
        type: "checklist",
        items: [
          "A valid corporate email address.",
          "Administrative access to your organization's business messaging accounts."
        ]
      },
      {
        id: "setup-steps",
        title: "Account Creation Walkthrough",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Open Signup Portal",
            instruction: "Navigate to https://orbionagents.com/signup or click 'Get Started' on the navigation header.",
            uiElements: ["'Get Started' button", "Signup form"]
          },
          {
            step: 2,
            title: "Enter Account Credentials",
            instruction: "Input your full name, work email address, and a secure password.",
            uiElements: ["'Full Name' input", "'Work Email' input", "'Password' input"]
          },
          {
            step: 3,
            title: "Name Your Workspace",
            instruction: "Enter your company name to initialize your primary workspace and choose your operating timezone.",
            uiElements: ["'Workspace Name' field", "'Timezone' selector"]
          },
          {
            step: 4,
            title: "Access Dashboard",
            instruction: "Click 'Launch Workspace' to be directed to your dashboard with access to Omni-Inbox, Channels, Brain, and Wires.",
            uiElements: ["'Launch Workspace' button", "Admin Dashboard"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Workspace Initialized:",
        calloutText: "Your user profile is created with Owner permissions, and your isolated workspace environment is ready for channel connections."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Confirmation email not received?",
            cause: "Corporate spam filters or email firewall delays.",
            solution: "Check your spam folder for messages from noreply@orbionagents.com, or request a verification link resend from the login screen."
          }
        ]
      }
    ],
    seo: {
      title: "Creating an Account & Setup | OrbionAgents",
      description: "Step-by-step account onboarding, workspace initialization, and profile settings in OrbionAgents.",
      keywords: ["Orbion account setup", "workspace provisioning", "multi-tenant signup"]
    }
  },

  "getting-started/quickstart": {
    slug: "getting-started/quickstart",
    category: "Getting Started",
    title: "5-Minute Quick Start Guide",
    subtitle: "Fast-track guide to connect your first messaging channel and deploy a grounded AI agent.",
    pageType: "onboarding",
    sections: [
      {
        id: "overview",
        title: "Quick Start Overview",
        type: "text",
        content: "This guide walks through the four essential steps to get your first autonomous AI agent live: connecting a communication channel, uploading a grounding document, configuring an agent persona, and verifying live responses in the Omni-Channel Inbox."
      },
      {
        id: "quickstart-steps",
        title: "Fast-Track Milestones",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Connect WhatsApp or Webchat",
            instruction: "Open Channels (/user/admin/channels) and authenticate your WhatsApp Cloud API credentials or enable the Omni-Webchat widget.",
            uiElements: ["Channels console", "'Connect' button on WhatsApp or Webchat"]
          },
          {
            step: 2,
            title: "Upload Knowledge Base Document",
            instruction: "Go to AI Brain (/user/admin/brain), click 'Add Documents', and upload your product FAQ or pricing PDF.",
            uiElements: ["AI Brain dashboard", "'Upload Document' button", "PDF ingestion progress bar"]
          },
          {
            step: 3,
            title: "Configure Agent Persona in Studio",
            instruction: "Open AI Workspace > Agent Studio (/user/admin/ai). Attach your newly uploaded document collection and select your preferred LLM.",
            uiElements: ["Agent Studio", "Knowledge Sources selector", "Model dropdown (e.g. GPT-4o)"]
          },
          {
            step: 4,
            title: "Send Test Dialogue & Verify",
            instruction: "Send a message asking about your pricing. Verify that the agent replies with verified answers citing your uploaded document.",
            uiElements: ["Omni-Channel Inbox", "Live message stream", "Citation tag"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Live Agent Operational:",
        calloutText: "Your connected messaging channel automatically routes inbound customer queries to your grounded agent, answering with zero manual intervention."
      }
    ],
    seo: {
      title: "5-Minute Quick Start Guide | OrbionAgents",
      description: "Fast-track guide to connect messaging channels and deploy grounded AI agents in minutes.",
      keywords: ["Orbion quickstart", "fast track AI bot", "deploy WhatsApp AI"]
    }
  },

  "getting-started/dashboard-overview": {
    slug: "getting-started/dashboard-overview",
    category: "Getting Started",
    title: "Dashboard & Analytics KPIs",
    subtitle: "Understanding your conversational pipeline, active chats, response times, and ROI.",
    pageType: "onboarding",
    sections: [
      {
        id: "overview",
        title: "Dashboard Overview",
        type: "text",
        content: "The Executive Dashboard (/user/admin/dashboard) serves as your daily command center. It provides real-time visibility into active conversational volume, autonomous resolution rates, lead pipeline velocity, and channel health indicators."
      },
      {
        id: "kpis-monitored",
        title: "Key Metrics & Widgets",
        type: "list",
        items: [
          { title: "Total Active Conversations", description: "Real-time count of customer threads active within the 24-hour messaging window across all connected channels." },
          { title: "Autonomous Resolution Rate", description: "Percentage of inquiries answered completely by AI agents without requiring human takeover." },
          { title: "Qualified Leads Pipeline", description: "Count of inbound prospects qualified into Hot, Warm, and Cold tiers by the AI Lead Intelligence engine." },
          { title: "Credit Ring & Token Balance", description: "Real-time balance gauge showing available AI compute tokens and WhatsApp Conversation Credits (WCC)." },
          { title: "Channel Connectivity Status", description: "Live heartbeat status pills showing operational health for WhatsApp, Instagram, and Twilio gateways." }
        ]
      },
      {
        id: "daily-workflow",
        title: "Recommended Daily Operations",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Check Channel Heartbeats",
            instruction: "Verify that all channel indicators in the top status bar display green 'Connected' pills.",
            uiElements: ["Channel status widget", "Green health indicators"]
          },
          {
            step: 2,
            title: "Review Escalated Threads",
            instruction: "Open Omni-Inbox to address threads flagged for 'Human Takeover' by sentiment or intent rules.",
            uiElements: ["Omni-Inbox badge", "Human Takeover filter"]
          },
          {
            step: 3,
            title: "Monitor Token Balance",
            instruction: "Inspect the Credit Ring dropdown. If balance is below safety thresholds, verify that auto-reload is active.",
            uiElements: ["Credit Ring in top header", "Wallet quick balance"]
          }
        ]
      }
    ],
    seo: {
      title: "Dashboard & Analytics KPIs | OrbionAgents",
      description: "Understand your conversational pipeline, active chats, response times, and ROI in OrbionAgents.",
      keywords: ["AI analytics dashboard", "conversational KPIs", "bot performance metrics"]
    }
  }
};

export const GETTING_STARTED_ARTICLES = {
  "getting-started/introduction": {
    slug: "getting-started/introduction",
    category: "Getting Started",
    title: "Introduction to OrbionAgents",
    subtitle: "Enterprise-grade governed AI conversational agents, omnichannel automation, and cognitive knowledge grounding.",
    readTime: "4 min read",
    lastUpdated: "April 2026",
    video: {
      url: "/docs/videos/meet-orbion.mp4",
      title: "Meet OrbionAgents: Complete Platform Overview",
      duration: "0:40",
      caption: "High-level overview showing AI Workspaces, Unified Inbox, Visual Automations, and Knowledge Brain."
    },
    whatIsIt: "OrbionAgents is a next-generation conversational AI platform built for businesses to automate customer interactions, qualify sales leads, and resolve support requests across WhatsApp, Instagram, SMS, and Webchat. Unlike simple chatbot wrappers, OrbionAgents pairs large language models with a Governed AI Architecture (Model Context Protocol safeguards) and a live pgvector Retrieval-Augmented Generation (RAG) Brain.",
    whyUseIt: "Modern customer-facing teams lose up to 40% of potential inbound sales opportunities due to delayed response times outside business hours and manual repetitive ticket qualification. OrbionAgents resolves customer inquiries instantly (sub-second latency), captures lead information directly into your CRM, and ensures AI safety through strict deterministic policies before any response is dispatched.",
    beforeYouStart: [
      "A modern web browser (Chrome, Edge, Firefox, or Safari).",
      "An active business email address for workspace registration.",
      "Access to your business messaging accounts (Meta WhatsApp Cloud API or Instagram Business) if connecting messaging channels."
    ],
    steps: [
      {
        step: 1,
        title: "Access the OrbionAgents Portal",
        instruction: "Navigate to the OrbionAgents application URL and choose between signing in to an existing workspace or registering a new tenant.",
        uiElements: ["Top navigation 'Login' button", "Domain selector", "Google OAuth / Email login field"]
      },
      {
        step: 2,
        title: "Initialize Your Workspace",
        instruction: "During first-time setup, input your official Organization Name, primary operating industry, and timezone to configure automated operational schedules.",
        uiElements: ["'Organization Name' input", "'Operating Timezone' dropdown", "'Create Workspace' button"]
      },
      {
        step: 3,
        title: "Select Your Communication Channels",
        instruction: "Choose which channels your business uses to interact with customers. You can select WhatsApp Business, Instagram Graph API, or Omni-Webchat.",
        uiElements: ["Channels selector cards", "WhatsApp toggle", "Instagram toggle"]
      },
      {
        step: 4,
        title: "Review Governance & Safety Safeguards",
        instruction: "Inspect the default Model Context Protocol (MCP) guardrails. These ensure that the AI never makes unauthorized pricing promises or engages in inappropriate discussions.",
        uiElements: ["MCP Policy status badge", "PII Redaction switch", "Escalation to Human threshold"]
      },
      {
        step: 5,
        title: "Complete Onboarding and Enter Dashboard",
        instruction: "Click 'Launch Workspace' to be automatically directed to your live tenant dashboard with pre-configured templates and sandbox test credits.",
        uiElements: ["'Launch Workspace' primary button", "Tour prompt"]
      }
    ],
    screenshots: [
      {
        src: "/images/wires-hero.webp",
        alt: "OrbionAgents Overview & Visual Ecosystem",
        caption: "OrbionAgents centralized dashboard linking Automations, Brain RAG, and Omni-Inbox."
      }
    ],
    expectedResult: "Your workspace is live, provisioned with an isolated pgvector namespace, a default AI agent profile, and full access to Omni-Inbox, Wires, Brain, and Channel Integrations.",
    tips: [
      "Keep the AI Workspace open in a secondary tab during testing so you can evaluate agent responses immediately.",
      "Set up your business timezone accurately to ensure automated follow-up sequences fire during appropriate local hours.",
      "Assign roles to team members (Admin, Agent, Viewer) to prevent accidental modifications to active production flows."
    ],
    troubleshooting: [
      {
        issue: "Cannot see the registration or workspace creation confirmation email?",
        solution: "Check your spam or quarantine folder for emails from noreply@orbionagents.com, or verify that your company email firewall allows external transactional emails."
      },
      {
        issue: "Page appears blank or stuck on authentication spinner?",
        solution: "Clear local storage keys for 'orbionagents_user' or open an Incognito window to clear cached authentication tokens."
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
    readTime: "5 min read",
    lastUpdated: "April 2026",
    whatIsIt: "OrbionAgents accounts are structured as multi-tenant organizations. Each account can host multiple distinct workspaces (e.g., Sales, Customer Support, Regional Offices) with separated knowledge bases, messaging numbers, team members, and billing quotas.",
    whyUseIt: "Multi-tenancy enables agencies and growing enterprises to maintain clean data boundaries. Client data, chat logs, and vector embeddings in one workspace are cryptographically isolated from all others, satisfying enterprise compliance standards.",
    beforeYouStart: [
      "A valid business email address.",
      "Admin rights on your company's domain or messaging accounts."
    ],
    steps: [
      {
        step: 1,
        title: "Open the Signup Page",
        instruction: "Navigate to https://orbionagents.com/signup or click the 'Start Free' button on the landing page header.",
        uiElements: ["'Start Free' CTA", "'Sign Up with Google' button", "Email & Password inputs"]
      },
      {
        step: 2,
        title: "Fill in Your Credentials",
        instruction: "Enter your full name, work email address, and a secure password (minimum 8 characters with numbers and symbols).",
        uiElements: ["'Full Name' field", "'Business Email' field", "'Password' field"]
      },
      {
        step: 3,
        title: "Verify Your Identity",
        instruction: "Complete the Cloudflare Turnstile bot verification check and click 'Create Account'. If prompted, enter the 6-digit confirmation code sent to your email.",
        uiElements: ["Security Turnstile checkbox", "'Create Account' button", "6-digit OTP modal"]
      },
      {
        step: 4,
        title: "Review Default Workspace Settings",
        instruction: "Once logged in, click your avatar in the lower-left sidebar and select 'Settings' -> 'Workspaces' to customize the workspace name and currency.",
        uiElements: ["Sidebar Avatar", "'Settings' modal", "'Workspace Name' input"]
      },
      {
        step: 5,
        title: "Invite Collaborators",
        instruction: "Under 'Team Members', input email addresses of sales reps or support agents and assign their permission role ('Admin' or 'Agent').",
        uiElements: ["'Invite Member' input", "'Role' dropdown", "'Send Invite' button"]
      }
    ],
    screenshots: [
      {
        src: "/images/documentation.webp",
        alt: "Account Setup & Workspace Provisioning",
        caption: "Workspace settings and access control panel in OrbionAgents."
      }
    ],
    expectedResult: "You receive an active session with an issued JWT token, redirecting directly to your newly created tenant workspace with free trial credits preloaded.",
    tips: [
      "Use your primary corporate Google Workspace login for seamless single sign-on without managing separate passwords.",
      "Always configure at least two workspace administrators to ensure continuity if one user changes roles."
    ],
    troubleshooting: [
      {
        issue: "Password reset link shows 'Token Expired'?",
        solution: "Password reset tokens expire after 15 minutes for security. Trigger a new reset link from the login page and use it immediately."
      },
      {
        issue: "Invited team members cannot see the workspace?",
        solution: "Ensure the invited user registers with the exact email address the invitation was sent to, and check that they accepted the invitation banner."
      }
    ],
    seo: {
      title: "Account Setup & Workspace Provisioning | OrbionAgents Docs",
      description: "How to register your OrbionAgents account, configure multi-tenant workspaces, invite team members, and manage role-based security.",
      keywords: ["create OrbionAgents account", "workspace setup", "team permissions", "multi-tenant AI SaaS"]
    }
  },

  "getting-started/quickstart": {
    slug: "getting-started/quickstart",
    category: "Getting Started",
    title: "5-Minute Quick Start Guide",
    subtitle: "Launch your first live conversational AI agent with your company knowledge base in 5 minutes.",
    readTime: "5 min read",
    lastUpdated: "May 2026",
    whatIsIt: "The Quick Start guide outlines the fastest path from an empty workspace to a fully functioning AI agent that understands your products and replies automatically on your chosen communication channel.",
    whyUseIt: "Instead of spending days setting up complex integrations, this streamlined sequence allows you to test real conversational capabilities in sandbox mode within minutes.",
    beforeYouStart: [
      "A 1-2 page company FAQ, brochure, or product pricing sheet in PDF or DOCX format.",
      "Access to the OrbionAgents dashboard."
    ],
    steps: [
      {
        step: 1,
        title: "Open the Brain Knowledge Base",
        instruction: "Click on 'Brain' in the left-hand sidebar navigation (/user/admin/brain).",
        uiElements: ["'Brain' navigation item with brain icon", "'Upload Document' dropzone"]
      },
      {
        step: 2,
        title: "Ingest Your Product FAQ",
        instruction: "Drag and drop your company document (or paste your website URL) into the upload area and click 'Sync Knowledge'.",
        uiElements: ["File dropzone", "'Sync URL' tab", "'Process Chunks' indicator"]
      },
      {
        step: 3,
        title: "Test in AI Workspace",
        instruction: "Navigate to 'AI Workspace' (/user/admin/ai) and type a natural-language question about your business pricing or services.",
        uiElements: ["'AI Workspace' tab", "Chat input field", "'✨ Auto' model badge"]
      },
      {
        step: 4,
        title: "Review Agent Response & Grounding",
        instruction: "Observe the streaming reply and verify that the AI retrieved the exact facts from the document you uploaded in Step 2.",
        uiElements: ["Live streaming token stream", "'Selecting tool...' badge", "Source citations"]
      },
      {
        step: 5,
        title: "Enable Inbound Messaging",
        instruction: "Navigate to 'Channels' (/user/admin/channels), activate the Webchat widget or connect WhatsApp, and toggle 'AI Agent Auto-Reply' to ON.",
        uiElements: ["'Channels' menu", "'AI Agent Status' toggle switch", "'Save Changes' button"]
      }
    ],
    screenshots: [
      {
        src: "/docs/screenshots/ai-workspace-streaming.png",
        alt: "Live Streaming Token Stream in AI Workspace",
        caption: "Testing your knowledge base in real-time inside the AI Workspace."
      }
    ],
    expectedResult: "Your AI agent is actively grounded in your business data and answering incoming inquiries autonomously.",
    tips: [
      "Start with a concise FAQ document before uploading 500-page manuals to evaluate accuracy faster.",
      "Use the 'Sources' dropdown in AI Workspace to inspect which specific knowledge chunk was cited."
    ],
    troubleshooting: [
      {
        issue: "AI answers 'I do not have enough information to answer this'?",
        solution: "Verify in the Brain tab that your uploaded document shows 'Ready' status with > 1 indexed chunk."
      }
    ],
    seo: {
      title: "5-Minute Quick Start Guide | OrbionAgents",
      description: "Quick start tutorial to launch your first governed conversational AI agent and knowledge base in 5 minutes.",
      keywords: ["OrbionAgents quickstart", "setup conversational agent", "RAG quickstart", "fast AI setup"]
    }
  },

  "getting-started/dashboard-overview": {
    slug: "getting-started/dashboard-overview",
    category: "Getting Started",
    title: "Dashboard & Analytics KPIs",
    subtitle: "Real-time visibility into inbound volume, AI resolution rates, conversation velocity, and ROI.",
    readTime: "4 min read",
    lastUpdated: "May 2026",
    whatIsIt: "The OrbionAgents Dashboard (/user/admin/dashboard) provides an executive overview of all conversational activities across connected messaging channels. It displays live counters, conversion velocity, token burn, and agent performance.",
    whyUseIt: "Business owners and operations leaders need clear metrics to gauge customer interest, identify bottlenecks, track lead capture efficiency, and calculate ROI on automation.",
    beforeYouStart: [
      "At least one active messaging channel or conversation history in the workspace."
    ],
    steps: [
      {
        step: 1,
        title: "Navigate to the Dashboard",
        instruction: "Click on 'Dashboard' at the top of the left sidebar navigation.",
        uiElements: ["'Dashboard' item with LayoutDashboard icon"]
      },
      {
        step: 2,
        title: "Inspect Top KPI Metric Cards",
        instruction: "Review the primary metric cards: Total Inquiries, Active AI Sessions, Converted Leads, and Average Response Time.",
        uiElements: ["'Total Inquiries' card", "'AI Resolution Rate' card", "'Captured Leads' card"]
      },
      {
        step: 3,
        title: "Analyze Channel Distribution Chart",
        instruction: "Inspect the breakdown of customer messages arriving via WhatsApp vs Instagram vs Webchat.",
        uiElements: ["Channel donut chart", "Channel legend toggles"]
      },
      {
        step: 4,
        title: "Review Lead Velocity & Sentiment",
        instruction: "Scroll to the 'Lead Velocity' section to track high-intent leads generated by day or week.",
        uiElements: ["Timeline bar chart", "Positive/Neutral sentiment indicators"]
      },
      {
        step: 5,
        title: "Deep-Dive into Recent Interactions",
        instruction: "Click on any recent conversation entry in the dashboard activity feed to jump directly into the Omni-Inbox thread.",
        uiElements: ["'Live Activity Feed' list", "'View in Inbox' link"]
      }
    ],
    screenshots: [
      {
        src: "/images/HeroSection_Automation_Image.png",
        alt: "OrbionAgents Executive Dashboard & Analytics",
        caption: "Centralized analytics displaying conversation metrics, resolution velocity, and lead counts."
      }
    ],
    expectedResult: "A comprehensive real-time view of customer engagement and agent automation health across all active touchpoints.",
    tips: [
      "Use the date-range picker in the upper right to filter analytics by Today, Last 7 Days, or This Month.",
      "Monitor the 'Human Takeover Ratio' — if it exceeds 30%, review your Brain knowledge entries to fill information gaps."
    ],
    troubleshooting: [
      {
        issue: "Dashboard metrics show zero after running test messages?",
        solution: "Ensure you are viewing the correct Workspace from the top workspace selector, and refresh the dashboard."
      }
    ],
    seo: {
      title: "Dashboard & Analytics KPIs | OrbionAgents",
      description: "Monitor real-time customer conversations, AI resolution metrics, lead conversion, and message volume.",
      keywords: ["AI analytics dashboard", "conversational KPIs", "OrbionAgents reporting", "lead metrics"]
    }
  }
};

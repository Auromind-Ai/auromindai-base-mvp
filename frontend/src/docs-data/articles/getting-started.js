export const GETTING_STARTED_ARTICLES = {
  "getting-started/introduction": {
    slug: "getting-started/introduction",
    category: "Getting Started",
    title: "Introduction to OrbionAgents",
    subtitle: "Enterprise conversational AI platform uniting messaging channels, knowledge grounding, and visual automation.",
    pageType: "onboarding",
    heroIntro: "OrbionAgents bridges the gap between chaotic customer messaging and autonomous business execution. It provides an enterprise AI operating system where conversations across WhatsApp, Instagram, and webchat are understood with precision, grounded in verified organizational knowledge, routed through visual workflow automations, and seamlessly synced with your CRM or handed off to human specialists.",
    sections: [
      {
        id: "overview",
        title: "Platform Overview",
        type: "text",
        content: "OrbionAgents is a conversational AI and operations platform built for businesses to handle customer communication, qualify inbound sales leads, and resolve support requests across WhatsApp, Instagram, SMS, and Webchat. By combining large language models with grounded knowledge retrieval (RAG) and deterministic workflow triggers, Orbion enables autonomous agents to operate 24/7 with strict human-in-the-loop oversight."
      },
      {
        id: "core-capabilities",
        title: "Core Platform Capabilities",
        type: "cards",
        capabilities: [
          {
            id: "omni-inbox",
            title: "Omni-Channel Inbox",
            category: "Conversations",
            description: "Unified collaborative queue aggregating conversations from WhatsApp Cloud API, Instagram Direct, and Webchat into a single real-time triage workspace.",
            highlights: ["Shared Team Workspace", "Real-Time Message Streaming", "1-Click Human Takeover", "Internal Notes & Tags"],
            href: "/docs/features/omni-inbox",
            badge: "01"
          },
          {
            id: "brain-rag",
            title: "AI Brain / RAG Knowledge Base",
            category: "Intelligence",
            description: "Enterprise vector-grounded document repository indexing PDFs, technical manuals, and live URLs with pgvector to deliver hallucination-free, cited answers.",
            highlights: ["pgvector Embeddings", "Strict Source Citations", "Automated PDF Parser", "Live URL Crawling"],
            href: "/docs/features/brain-rag",
            badge: "02"
          },
          {
            id: "ai-workspace",
            title: "AI Workspace & Agent Studio",
            category: "Studio",
            description: "Studio for engineering agent personas, system prompt constraints, dynamic tool-calling inspection, and switching between top LLM providers.",
            highlights: ["Multi-Model Switching", "Token-by-Token Streaming", "System Prompt Guardrails", "Dynamic Tool Badges"],
            href: "/docs/features/ai-workspace",
            badge: "03"
          },
          {
            id: "automation-wire",
            title: "Automation Wire",
            category: "Automation",
            description: "Visual node graph canvas for building multi-step logic, AI intent classifiers, conditional branching paths, and automated CRM actions.",
            highlights: ["Drag-and-Drop Canvas", "Magic Wire Flow Builder", "Decision & Urgency Nodes", "Webhook Triggers"],
            href: "/docs/features/agentic-orchestrator",
            badge: "04"
          },
          {
            id: "leads-crm",
            title: "AI Lead Intelligence & CRM",
            category: "Pipeline",
            description: "Real-time parameter extraction identifying buyer budget, purchase timeline, contact info, and qualification status (Hot/Warm/Cold).",
            highlights: ["Automated Lead Scoring", "Intent & Budget Parsing", "Kanban Stage Tracking", "Webhook Pipeline Sync"],
            href: "/docs/features/leads-crm",
            badge: "05"
          },
          {
            id: "ai-governance",
            title: "AI Governance & Safeguards",
            category: "Governance",
            description: "Runtime policy boundaries enforcing PII redaction, adversarial jailbreak defense, audit logs, and mandatory human sign-off on sensitive actions.",
            highlights: ["PII Data Masking", "Jailbreak Defense Shield", "Full Audit Trails", "Human Approval Gates"],
            href: "/docs/account/ai-governance",
            badge: "06"
          }
        ]
      },
      {
        id: "how-it-works",
        title: "How AI Conversations Flow",
        subtitle: "From customer message to resolution — how AI handles inbound conversations",
        type: "pipeline",
        steps: [
          {
            step: 1,
            title: "Customer Message",
            label: "Inbound Request",
            description: "A customer reaches out with a question, inquiry, or purchase interest through WhatsApp, Instagram, SMS, or Website chat."
          },
          {
            step: 2,
            title: "AI Understands",
            label: "Intent & Needs",
            description: "The AI reads the message, detects what the customer needs, recognizes language and urgency, and extracts key details like budget or interest."
          },
          {
            step: 3,
            title: "Knowledge / Tools",
            label: "Verified Grounding",
            description: "The AI searches your uploaded company documents, catalogs, and FAQs to retrieve accurate, verified facts — ensuring zero guesswork."
          },
          {
            step: 4,
            title: "Agent Decides",
            label: "Smart Decision",
            description: "Based on your business rules and brand guidelines, the agent prepares the ideal answer or determines the best workflow path."
          },
          {
            step: 5,
            title: "Action / Human",
            label: "Instant Resolution",
            description: "Delivers a helpful response, saves the lead into your CRM, triggers connected tools, or smoothly transfers to a human team member."
          }
        ]
      },
      {
        id: "what-you-can-build",
        title: "What You Can Build",
        subtitle: "Real-world production outcomes and high-ROI automated solutions",
        type: "outcomes",
        useCases: [
          {
            title: "Sales Qualification",
            category: "Revenue",
            outcome: "3x faster inbound qualification with 24/7 instant lead triage",
            description: "Automate discovery by interrogating buyer budget, timeline, and company needs. Automatically score leads into Hot, Warm, or Cold pipelines and book demos.",
            tags: ["B2B SaaS", "High-Ticket Sales", "Real Estate"]
          },
          {
            title: "Customer Support",
            category: "Support",
            outcome: "70%+ first-contact resolution with zero human intervention",
            description: "Resolve order status lookups, return policy questions, invoice queries, and troubleshooting guides directly against your grounded company knowledge.",
            tags: ["E-Commerce", "Logistics", "Consumer Brands"]
          },
          {
            title: "WhatsApp Automation",
            category: "Messaging",
            outcome: "98% open rates using Meta-verified Cloud API broadcasts & menus",
            description: "Deploy interactive button menus, order status carousels, payment receipt dispatches, and scheduled event reminders on WhatsApp.",
            tags: ["Retail", "Healthcare", "Hospitality"]
          },
          {
            title: "Knowledge-Based AI Agents",
            category: "Intelligence",
            outcome: "Zero hallucination risk with traceable source citations",
            description: "Equip your teams and clients with autonomous domain experts that answer complex policy, technical manual, or pricing questions with verified document citations.",
            tags: ["Education", "Legal & Compliance", "Internal IT"]
          },
          {
            title: "Lead Management",
            category: "CRM",
            outcome: "100% structured data capture from unstructured chat conversations",
            description: "Extract phone numbers, email addresses, decision-maker roles, and purchase intent straight from conversational streams into your centralized CRM.",
            tags: ["Agencies", "Financial Services", "Consulting"]
          },
          {
            title: "Workflow Automation",
            category: "Operations",
            outcome: "End-to-end operational execution without custom engineering",
            description: "Trigger multi-system workflows: dispatch transactional webhooks, generate PDF quotes, update inventory records, or notify Slack channels.",
            tags: ["Operations", "Supply Chain", "Fintech"]
          }
        ]
      },
      {
        id: "explore",
        title: "Explore OrbionAgents",
        subtitle: "Deep-dive documentation, architectural guides, and production blueprints",
        type: "explore",
        links: [
          {
            title: "Omni-Channel Inbox",
            description: "Manage multi-channel conversations and collaborative human takeover.",
            href: "/docs/features/omni-inbox",
            tag: "Feature Guide"
          },
          {
            title: "AI Brain & RAG Grounding",
            description: "Ingest PDFs, technical docs, and URLs with pgvector embeddings.",
            href: "/docs/features/brain-rag",
            tag: "Knowledge Base"
          },
          {
            title: "AI Workspace & Agent Studio",
            description: "Configure system prompts, LLM models, and real-time streaming.",
            href: "/docs/features/ai-workspace",
            tag: "Agent Studio"
          },
          {
            title: "Automation Wire (Flows)",
            description: "Build visual node graphs, decision branching, and event wires.",
            href: "/docs/features/agentic-orchestrator",
            tag: "Flow Builder"
          },
          {
            title: "AI Lead Intelligence & CRM",
            description: "Score inbound leads Hot/Warm/Cold and manage CRM pipelines.",
            href: "/docs/features/leads-crm",
            tag: "CRM Pipeline"
          },
          {
            title: "AI Governance & Safeguards",
            description: "Implement PII data masking, jailbreak defense, and audit trails.",
            href: "/docs/account/ai-governance",
            tag: "Safety & Policy"
          },
          {
            title: "WhatsApp Cloud API Setup",
            description: "Connect Meta Phone Number ID, webhooks, and verified templates.",
            href: "/docs/integrations/whatsapp-cloud-api",
            tag: "Integration"
          },
          {
            title: "Credits, Wallet & Token Metering",
            description: "Monitor real-time token expenditure and auto-recharge triggers.",
            href: "/docs/features/credits-wallet",
            tag: "Operations"
          }
        ]
      }
    ],
    seo: {
      title: "Introduction to OrbionAgents | Enterprise Conversational AI Platform",
      description: "Learn what OrbionAgents is, how governed AI agents automate customer sales and support on WhatsApp & Instagram, platform visual architecture, and core capabilities.",
      keywords: ["OrbionAgents introduction", "conversational AI platform", "WhatsApp automation", "AI Brain RAG", "visual workflow builder", "enterprise AI agents", "AI lead intelligence"]
    }
  },

  "getting-started/account-setup": {
    slug: "getting-started/account-setup",
    category: "Getting Started",
    title: "Creating an Account & Setup",
    subtitle: "Fast-track account onboarding via passwordless Email OTP or Google 1-Click OAuth, and workspace initialization.",
    pageType: "onboarding",
    sections: [
      {
        id: "overview",
        title: "Account & Workspace Overview",
        type: "text",
        content: "OrbionAgents offers passwordless, high-security account creation. You can register in seconds using a one-time password (OTP) sent to your email or 1-click Google OAuth authentication. Upon verification, your dedicated administrative workspace is instantly provisioned with complete access to the Omni-Inbox, AI Brain, Agent Studio, and Automation Wires."
      },
      {
        id: "prerequisites",
        title: "Prerequisites",
        type: "checklist",
        items: [
          "A valid corporate or personal email address (or Google account).",
          "Access to your email inbox to receive the 6-digit OTP verification code."
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
            instruction: "Navigate to https://orbionagents.com/signup or click 'Get Started Free' on the main navigation header.",
            uiElements: ["'Get Started Free' button", "Signup Portal (/signup)"],
            screenshot: {
              src: "/images/docs/screenshots/account-step-1-landing.png",
              alt: "OrbionAgents Landing Page Hero",
              caption: "OrbionAgents Landing Page: Click 'Get Started Free' or visit /signup to start onboarding."
            }
          },
          {
            step: 2,
            title: "Choose Signup Method (Email OTP or Google)",
            instruction: "Enter your Full Name and Work Email, then click 'Create Account'. Alternatively, click 'Continue with Google' for instantaneous 1-click authentication without manual form entry.",
            uiElements: ["'Full Name' input", "'Work Email' input", "'Continue with Google' button"],
            screenshot: {
              src: "/images/docs/screenshots/account-step-2-signup.png",
              alt: "Create Account Signup Form",
              caption: "Select your signup method: 1-Click Google OAuth or passwordless Email OTP."
            }
          },
          {
            step: 3,
            title: "Enter 6-Digit OTP Code",
            instruction: "Check your email inbox for the verification message from Orbion. Enter the 6-digit OTP code on the verification screen and click 'Verify OTP'.",
            uiElements: ["'Enter OTP' screen", "6-digit OTP field", "'Verify OTP' button"],
            screenshot: {
              src: "/images/docs/screenshots/account-step-3-otp.png",
              alt: "Enter 6-Digit OTP Code verification screen",
              caption: "Check your inbox and enter the 6-digit OTP to securely verify your email."
            }
          },
          {
            step: 4,
            title: "Automatic Dashboard Launch",
            instruction: "Upon successful OTP verification, your session token is saved, your workspace is provisioned with Owner permissions, and you land directly on the Admin Dashboard (/user/admin/dashboard).",
            uiElements: ["Admin Dashboard (/user/admin/dashboard)", "Omni-Inbox & AI Brain access"],
            screenshot: {
              src: "/images/docs/screenshots/account-step-4-dashboard.png",
              alt: "Admin Dashboard launch interface",
              caption: "Automated workspace launch into the Admin Dashboard with Owner privileges."
            }
          }
        ]
      },
      {
        id: "security",
        title: "Security: Enable Two-Factor Authentication (2FA)",
        type: "checklist",
        checklistTitle: "Recommended Security Configuration (Settings > Security):",
        items: [
          "Navigate to Settings (/user/admin/settings) from the sidebar navigation and select the 'Security' tab.",
          "Click 'Enable Two-Factor Authentication' to generate your unique TOTP QR code.",
          "Scan the QR code with your preferred authenticator app (Google Authenticator, Authy, or 1Password).",
          "Enter the 6-digit verification code from your authenticator app to lock in your 2FA protection."
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Workspace Initialized & Verified:",
        calloutText: "Your account is active with Owner administrative privileges. You are immediately ready to connect inbound messaging channels (WhatsApp Cloud API / Instagram) and upload documents into the AI Brain."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "6-Digit OTP email not received?",
            cause: "Corporate spam filters, mail firewall rules, or temporary mail relay delay.",
            solution: "Check your spam or junk folder for messages from noreply@orbionagents.com. Wait 60 seconds and click 'Resend OTP', or use Google 1-Click login."
          },
          {
            issue: "Account already exists error?",
            cause: "The email address has already been registered in the system.",
            solution: "Click the 'Go to Login page' link or visit /login to sign in directly with an OTP."
          }
        ]
      }
    ],
    seo: {
      title: "Creating an Account & Setup | OrbionAgents",
      description: "Step-by-step account onboarding via passwordless Email OTP or Google OAuth, workspace initialization, and Two-Factor Authentication in OrbionAgents.",
      keywords: ["Orbion account setup", "Orbion signup", "passwordless OTP login", "Google signup", "workspace provisioning", "two-factor authentication"]
    }
  },

  "getting-started/quickstart": {
    slug: "getting-started/quickstart",
    category: "Getting Started",
    title: "5-Minute Quick Start Guide",
    subtitle: "Fast-track guide to build a lead agent flow, connect messaging channels, and go live.",
    pageType: "onboarding",
    sections: [
      {
        id: "overview",
        title: "Quick Start Overview",
        type: "text",
        content: "This guide walks through the four essential steps to get your first autonomous AI lead qualification agent live: creating a visual flow, configuring the Lead Agent parameters to capture essential prospect data, connecting WhatsApp Business or Instagram, and monitoring real-time customer chats with lead capture in the Omni-Inbox."
      },
      {
        id: "prerequisites",
        title: "Prerequisites",
        type: "checklist",
        items: [
          "An active OrbionAgents account with administrative access.",
          "Meta WhatsApp Business account or an active Instagram account (needed for Step 3).",
          "Defined lead qualification requirements (e.g., name, email, phone, budget)."
        ]
      },
      {
        id: "quickstart-steps",
        title: "Fast-Track Milestones",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Navigate to Flows & Click \"+ Create Flow\"",
            instruction: "Open the Flows dashboard from the left sidebar navigation. Click the '+ Create Flow' button in the upper right to launch a fresh visual automation canvas.",
            uiElements: ["Flows dashboard", "'+ Create Flow' button", "Flow Quota Usage indicator"],
            screenshot: {
              src: "/images/docs/screenshots/quickstart-step-1-create-flow.png",
              alt: "Click + Create Flow on Flows Dashboard",
              caption: "Navigate to Flows and click '+ Create Flow' to start building your agent workflow."
            }
          },
          {
            step: 2,
            title: "Configure AI Lead Agent on Visual Canvas",
            instruction: "On the flow builder canvas, connect the initial Trigger to an AI Reply Action node. In the Configuration sidebar on the right, set Action Type to 'AI Reply (Brain)', select Agent Type as 'LEAD', choose your Business Type (e.g. 'SaaS'), and enter the Lead Fields you want to collect (such as 'name,email,phone,budget'). You can also enable options like Demo Booking.",
            uiElements: ["Init Trigger node", "AI Reply (Action) node", "Agent Type: LEAD", "Business Type (SaaS)", "Lead Fields (name,email,phone,budget)", "Enable Demo Booking"],
            screenshot: {
              src: "/images/docs/screenshots/quickstart-step-2-lead-agent.png",
              alt: "AI Reply Configuration with Lead Agent and Fields",
              caption: "Configure your AI Lead Agent with Business Type and specific Lead Fields to automatically extract customer details."
            }
          },
          {
            step: 3,
            title: "Connect WhatsApp Business or Instagram Channel",
            instruction: "Navigate to Channels from the sidebar. Under Messaging Channels, select WhatsApp Business (Meta Cloud API) or Instagram, and click 'Connect' to authenticate your business account and link incoming messages to your active AI agent flow.",
            uiElements: ["Channels console", "WhatsApp Business (Meta Cloud API)", "Instagram (Meta Business)", "'Connected' status pill"],
            screenshot: {
              src: "/images/docs/screenshots/quickstart-step-3-channels.png",
              alt: "Channels Dashboard with WhatsApp Business Connected",
              caption: "Connect WhatsApp Business or Instagram so inbound conversations are routed to your configured AI Lead agent."
            }
          },
          {
            step: 4,
            title: "Go Live & Track Qualified Leads in Omni-Inbox",
            instruction: "Once your flow is synced and your channel is connected, your AI Lead agent is live 24/7! Inbound customer chats on WhatsApp or Instagram stream directly into the Omni-Inbox. The AI engages prospects, answers questions, gathers their name, email, phone, and budget, and logs the qualified lead into your CRM. You can monitor live conversations and take over with human intervention anytime.",
            uiElements: ["Omni-Inbox", "Live message stream", "Contact Details & Lead tags", "'Human Takeover' control toggle"],
            screenshot: {
              src: "/images/docs/screenshots/quickstart-step-4-live-inbox.png",
              alt: "Omni-Inbox Live WhatsApp Conversation & Lead Qualification",
              caption: "Inbound customer chats stream live into the Omni-Inbox where AI handles inquiries and captures qualified leads."
            }
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Live AI Lead Agent Operational:",
        calloutText: "Your connected WhatsApp / Instagram channel automatically routes inbound customer inquiries to your configured Lead Agent flow, extracting buyer information, scoring leads, and streaming conversations into the Omni-Inbox with instant human takeover capability."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Lead fields (name, email, phone, budget) not being collected?",
            cause: "The AI Reply node is not set to 'LEAD' Agent Type or the lead fields comma-separated string is missing in configuration.",
            solution: "Open your Flow canvas, click the AI Reply node, and verify that Agent Type is set to 'LEAD' and Lead Fields are defined."
          },
          {
            issue: "Inbound WhatsApp messages not triggering the flow?",
            cause: "Flow is not synced / active, or Meta webhook callback URL is not connected in Channels.",
            solution: "Ensure you clicked 'Sync Wire' and enabled the flow status toggle on the Flows page, and check Channels for a green 'Connected' badge."
          }
        ]
      }
    ],
    seo: {
      title: "5-Minute Quick Start Guide | OrbionAgents",
      description: "Fast-track guide to create a visual Lead Agent flow, connect WhatsApp & Instagram channels, and go live with AI lead qualification in Omni-Inbox.",
      keywords: ["Orbion quickstart", "Lead agent setup", "WhatsApp flow automation", "Meta Cloud API", "Omni-Inbox live chat", "AI lead capture"]
    }
  },

  "getting-started/dashboard-overview": {
    slug: "getting-started/dashboard-overview",
    category: "Getting Started",
    title: "Dashboard & Analytics KPIs",
    subtitle: "Understanding your conversational pipeline, active leads, revenue growth, and AI response velocity.",
    pageType: "onboarding",
    sections: [
      {
        id: "overview",
        title: "Executive Command Center",
        subtitle: "Real-time analytics and operations command center",
        type: "text",
        content: "The Executive Dashboard is the central operational cockpit of OrbionAgents, uniting real-time messaging across WhatsApp, Instagram, and webchat to monitor customer sentiment, leads, and AI execution.",
        bullets: [
          { 
            label: "What is it? (What Data Is In It?)", 
            text: "A real-time interface displaying channel status, 4 Bento KPI cards, monthly revenue charts, recent activity feeds, and AI insights." 
          },
          { 
            label: "Why is it there? (Purpose)", 
            text: "To eliminate switching between Meta Business Manager, separate CRMs, and spreadsheets, giving teams immediate visibility into conversational operations." 
          },
          { 
            label: "Why use it? (Business Benefits)", 
            text: "Delivers instant situational awareness in under 5 seconds with urgent human escalation alerts and 1-click navigation into key tools." 
          }
        ],
        screenshot: {
          src: "/images/docs/screenshots/dashboard-full-preview.png",
          alt: "Executive Dashboard Full Overview",
          caption: "Full panoramic view of the Executive Dashboard (/user/admin/dashboard)",
          annotation: "Dashboard Console",
          aspectRatio: "aspect-[16/10]"
        }
      },
      {
        id: "credits-and-wallet",
        title: "AI Models Usage & WhatsApp Wallet Telemetry",
        subtitle: "Real-time consumption tracking for LLM tokens and Meta messaging funds",
        type: "text",
        content: "Live telemetry card monitoring remaining foundation model message allocations alongside prepaid Meta WhatsApp conversation credits in Indian Rupees (INR).",
        bullets: [
          { 
            label: "What is it? (What Data Is In It?)", 
            text: "Displays active AI message balances across Claude, Llama, and GPT alongside prepaid WhatsApp Wallet funds with 1-click recharge." 
          },
          { 
            label: "Why is it there? (Purpose)", 
            text: "To prevent unexpected chat drop-offs during campaigns by providing full transparency into token burn and Meta messaging rates." 
          },
          { 
            label: "Why use it? (Business Benefits)", 
            text: "Prevents dropped chats with low-balance alerts, simplifies cost forecasting, and enables instant wallet recharges via Razorpay." 
          }
        ],
        screenshot: {
          src: "/images/docs/screenshots/dashboard-credits-wallet.png",
          alt: "AI Models Usage & WhatsApp Wallet Card",
          caption: "AI Models token meter (99.9% Left) and WhatsApp messaging wallet balance (₹3,000)",
          annotation: "Credits & Wallet",
          aspectRatio: "aspect-[16/10]"
        }
      },
      {
        id: "bento-metrics",
        title: "Core Bento Performance Metrics",
        subtitle: "The 4 primary health indicators for your conversational pipeline",
        type: "text",
        content: "Four high-level executive cards calculate your sales momentum, pipeline volume, and responsiveness for the selected date period in real time:",
        bullets: [
          { 
            label: "What is it? (What Data Is In It?)", 
            text: "Four core metrics: Total Revenue (closed chat sales), Active Leads (pipeline volume), Conversion Rate (%), and Avg. Response Time (< 1m)." 
          },
          { 
            label: "Why is it there? (Purpose)", 
            text: "To quantify conversational AI ROI, proving whether autonomous customer engagement drives revenue and prevents buyer drop-off." 
          },
          { 
            label: "Why use it? (Business Benefits)", 
            text: "Eliminates lead leakage with sub-minute AI replies, attributes revenue to WhatsApp/Instagram, and tracks weekly sales velocity." 
          }
        ],
        screenshot: {
          src: "/images/docs/screenshots/dashboard-bento-kpis.png",
          alt: "4 Bento Performance Metric Cards",
          caption: "4 Bento KPI cards: Total Revenue (₹0), Active Leads (0), Conversion Rate (0.0%), Avg. Response Time (< 1m)",
          annotation: "Core Bento Metrics",
          aspectRatio: "aspect-[16/8]"
        }
      },
      {
        id: "activity-feed",
        title: "Real-Time Recent Activity Feed",
        subtitle: "Live chronological timeline of inbound chats, qualification events, and deals",
        type: "text",
        content: "A continuous live telemetry log detailing customer engagements as they happen across all linked messaging touchpoints.",
        bullets: [
          { 
            label: "What is it? (What Data Is In It?)", 
            text: "A live audit log displaying customer messages, channel badges, automated lead qualification scores (e.g., HOT 88 pts), demo bookings, and closed deals." 
          },
          { 
            label: "Why is it there? (Purpose)", 
            text: "To provide governance and audit oversight over autonomous agent executions, ensuring AI agents qualify inbound buyers accurately." 
          },
          { 
            label: "Why use it? (Business Benefits)", 
            text: "Gives managers real-time visibility into customer sentiment, highlights high-value won deals, and enables 1-click transcript auditing." 
          }
        ],
        screenshot: {
          src: "/images/docs/screenshots/dashboard-recent-activity.png",
          alt: "Real-Time Recent Activity Feed Widget",
          caption: "Chronological activity audit: Inbound messages, lead captures, hot scoring (88 pts), and won deals (₹85,000)",
          annotation: "Audit Stream",
          aspectRatio: "aspect-[4/3]"
        }
      },
      {
        id: "ai-insights",
        title: "AI Insights & Autonomous Recommendations",
        subtitle: "Autonomous suggestions and high-priority lead alerts",
        type: "text",
        content: "An intelligent heuristic recommendation engine that continuously analyzes customer conversations to prioritize hot prospects and alert human reps when manual intervention is required.",
        bullets: [
          { 
            label: "What is it? (What Data Is In It?)", 
            text: "Three prioritized insight cards: Hot Leads Ready to Convert (buying intent), Human Attention Required (escalations), and AI Booked Meetings." 
          },
          { 
            label: "Why is it there? (Purpose)", 
            text: "To transition sales teams from reactive scrolling to proactive closing, isolating conversations that require urgent human intervention." 
          },
          { 
            label: "Why use it? (Business Benefits)", 
            text: "Helps reps close deals faster by targeting high-intent leads, prevents churn through instant escalation alerts, and tracks booked demos." 
          }
        ],
        screenshot: {
          src: "/images/docs/screenshots/dashboard-ai-insights.png",
          alt: "AI Insights & Recommendations Widget",
          caption: "Autonomous AI Insights: Hot Leads Ready to Convert, Human Attention Required, and AI Booked Meetings",
          annotation: "Intelligence Engine",
          aspectRatio: "aspect-[16/9]"
        }
      },
      {
        id: "monthly-revenue-chart",
        title: "Monthly Revenue Trajectory Chart",
        subtitle: "Year-over-year comparative revenue visualization",
        type: "text",
        content: "Visualizes your month-by-month revenue trajectory comparing the current year against the previous year. Hover over any data point on the chart to inspect exact monthly rupee figures.",
        bullets: [
          { 
            label: "What is it? (What Data Is In It?)", 
            text: "A comparative chart displaying monthly closed revenue with distinct year-over-year curves and semester toggles (Jan–Jun / Jul–Dec)." 
          },
          { 
            label: "Why is it there? (Purpose)", 
            text: "To evaluate seasonality, long-term sales growth, and revenue velocity against historical annual performance." 
          },
          { 
            label: "Why use it? (Business Benefits)", 
            text: "Enables owners to forecast quarterly targets, identify seasonal spikes, and verify if automations are growing annual revenue." 
          }
        ],
        screenshot: {
          src: "/images/docs/screenshots/dashboard-monthly-revenue.png",
          alt: "Monthly Revenue Comparative Spline Chart",
          caption: "Monthly comparative revenue line chart (2026 Neon Green vs 2025 Purple)",
          annotation: "Revenue Analytics",
          aspectRatio: "aspect-[16/9]"
        }
      },
      {
        id: "telemetry-and-actions",
        title: "Top-Bar Status & 1-Click Quick Actions",
        subtitle: "System connectivity indicators and workflow shortcuts",
        type: "text",
        content: "Operational dock providing instant access to routine administrative actions and channel health telemetry without navigating nested menus.",
        bullets: [
          { 
            label: "What is it? (What Data Is In It?)", 
            text: "Header connection status indicator and 4 quick actions: 'New workflow', 'Broadcast', 'Add Lead', and 'Connect Channel'." 
          },
          { 
            label: "Why is it there? (Purpose)", 
            text: "To eliminate menu navigation friction, letting admins launch frequent operational workflows in a single click." 
          },
          { 
            label: "Why use it? (Business Benefits)", 
            text: "Saves repetitive clicks and accelerates the launch of time-sensitive broadcast campaigns and automation flows." 
          }
        ],
        screenshot: {
          src: "/images/docs/screenshots/dashboard-quick-actions.png",
          alt: "Top-Bar Telemetry & Quick Action Buttons",
          caption: "Quick Action buttons: New workflow, Broadcast, Add Lead, and Connect Channel",
          annotation: "Operational Controls",
          aspectRatio: "aspect-[16/7]"
        }
      }
    ],
    seo: {
      title: "Executive Dashboard & Analytics KPIs | OrbionAgents",
      description: "Explore the OrbionAgents Executive Dashboard: 4 Bento KPI cards (Total Revenue, Active Leads, Conversion Rate, Avg Response Time), Monthly Revenue charts, Quick Actions, and AI Insights.",
      keywords: ["Orbion executive dashboard", "conversational AI KPIs", "revenue analytics", "lead conversion rate", "AI response time", "WhatsApp status indicator", "AI insights"]
    }
  }
};

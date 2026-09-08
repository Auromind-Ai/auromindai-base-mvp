export const CORE_FEATURES_PART3 = {
  "features/leads-crm": {
    slug: "features/leads-crm",
    category: "Core Features",
    title: "Leads & CRM Pipeline",
    subtitle: "Capture, qualify, score, and manage prospect pipelines generated across conversational channels.",
    readTime: "6 min read",
    lastUpdated: "May 2026",
    whatIsIt: "The Leads & CRM module (/user/admin/leads) is a built-in contact management database specifically tailored for conversational commerce. It tracks contacts, lead stages (New, Qualified, Proposal, Won, Lost), lead intent scores, and conversational history.",
    whyUseIt: "Inbound chats on WhatsApp often fail to turn into sales because contact details get lost in long message threads. OrbionAgents automatically extracts contact names, emails, phone numbers, and budget requirements from chat transcripts, organizing them into a structured sales pipeline.",
    beforeYouStart: [
      "Customer conversations occurring in your Omni-Inbox or through Orchestrator funnels."
    ],
    steps: [
      {
        step: 1,
        title: "Open the Leads & CRM Page",
        instruction: "Click on 'Leads & CRM' in the left-hand navigation sidebar (/user/admin/leads).",
        uiElements: ["'Leads & CRM' item with Users icon", "Pipeline summary metrics"]
      },
      {
        step: 2,
        title: "Explore List vs Pipeline Kanban View",
        instruction: "Toggle between the structured 'List View' (with filters and sorting) and the visual 'Kanban Board' (dragging leads between stages).",
        uiElements: ["View switcher (List / Kanban)", "Stage columns ('New', 'Contacted', 'Qualified', 'Closed')"]
      },
      {
        step: 3,
        title: "Filter by Lead Qualification Score",
        instruction: "Use the filter bar to isolate 'Hot' leads (qualification score > 75) based on AI intent evaluation.",
        uiElements: ["Lead score filter pill", "Tag dropdown (e.g. 'VIP', 'Enterprise', 'Follow-up')"]
      },
      {
        step: 4,
        title: "Inspect Lead Profile & Conversation History",
        instruction: "Click on any lead record to open their customer drawer. View their verified phone number, email, captured form fields, and a 1-click link to their inbox thread.",
        uiElements: ["Customer detail drawer", "'View Full Chat' button", "Edit Stage dropdown"]
      },
      {
        step: 5,
        title: "Export to CSV or Sync with CRM",
        instruction: "Click the 'Export' button to download a sanitized CSV file, or trigger a webhook to automatically push new leads to HubSpot or Salesforce.",
        uiElements: ["'Export CSV' button", "Webhook sync indicator"]
      }
    ],
    screenshots: [
      {
        src: "/images/lead-qualification.webp",
        alt: "OrbionAgents Leads Pipeline & Qualification Management",
        caption: "Centralized CRM pipeline showing lead scoring, contact info, and stage transitions."
      }
    ],
    expectedResult: "A clean, synchronized customer database that captures qualified leads from conversations automatically without manual data entry.",
    tips: [
      "Configure automated follow-up rules in Wires for leads that remain in 'New' stage for more than 24 hours.",
      "Assign specific sales reps as owners of leads based on geography or product interest."
    ],
    troubleshooting: [
      {
        issue: "Lead name shows up as phone number instead of person's name?",
        solution: "WhatsApp only transmits the user's phone number initially unless the user provides their name during the bot dialogue or their WhatsApp profile name is public."
      }
    ],
    seo: {
      title: "Leads & CRM Pipeline | OrbionAgents",
      description: "Manage and qualify inbound sales leads captured from WhatsApp and Instagram automatically with OrbionAgents CRM.",
      keywords: ["conversational CRM", "lead qualification", "WhatsApp lead capture", "pipeline management"]
    }
  },

  "features/templates": {
    slug: "features/templates",
    category: "Core Features",
    title: "WhatsApp Message Templates",
    subtitle: "Create, submit, and manage Meta-approved WhatsApp broadcast and transactional templates.",
    readTime: "6 min read",
    lastUpdated: "June 2026",
    whatIsIt: "The Templates Manager (/user/admin/templates) allows you to design WhatsApp message templates conforming to Meta Cloud API specifications. WhatsApp requires pre-approved templates whenever a business initiates an outbound message to a user outside the 24-hour customer service window.",
    whyUseIt: "Outbound re-engagement, order confirmations, shipping updates, and abandoned cart reminders require verified Meta templates. The template builder simplifies variable mapping (`{{1}}`, `{{2}}`), header media (images/documents), and quick reply buttons.",
    beforeYouStart: [
      "A connected Meta WhatsApp Cloud API account with active WABA (WhatsApp Business Account) permissions."
    ],
    steps: [
      {
        step: 1,
        title: "Navigate to Templates",
        instruction: "Click 'Templates' in the left-hand sidebar navigation (/user/admin/templates).",
        uiElements: ["'Templates' menu item with FileText icon", "'+ Create Template' button"]
      },
      {
        step: 2,
        title: "Set Template Category and Language",
        instruction: "Click '+ Create Template'. Enter a Template Name (lowercase with underscores, e.g., `order_shipped_v1`), choose Category ('MARKETING' or 'UTILITY'), and select Language (e.g., 'English (US)').",
        uiElements: ["'Template Name' input", "'Category' dropdown", "'Language' dropdown"]
      },
      {
        step: 3,
        title: "Draft Header, Body, and Variables",
        instruction: "Type your message copy. Insert dynamic variable placeholders like `{{1}}` for customer name and `{{2}}` for tracking number using the '+ Add Variable' button.",
        uiElements: ["'Header' toggle (Text, Image, PDF)", "'Body' textarea", "'+ Add Variable' pill"]
      },
      {
        step: 4,
        title: "Add Call-to-Action Buttons",
        instruction: "Configure interactive footer buttons: 'Quick Reply' (e.g., 'Track Order') or 'Call to Action' (e.g., 'Visit Website' with URL).",
        uiElements: ["'Buttons' section", "'Quick Reply' option", "'Call to Action' option"]
      },
      {
        step: 5,
        title: "Submit to Meta for Verification",
        instruction: "Inspect the real-time smartphone preview on the right side of the screen. Click 'Submit Template' to push the template to Meta's automated approval system (typically approved in 1-5 minutes).",
        uiElements: ["Live smartphone preview container", "'Submit Template' primary button", "Approval status badge ('APPROVED' in green)"]
      }
    ],
    screenshots: [
      {
        src: "/images/whatsapp-hero.webp",
        alt: "WhatsApp Message Template Builder & Approval Status",
        caption: "Designing Meta-approved WhatsApp message templates with dynamic variable placeholders."
      }
    ],
    expectedResult: "Your template is approved by Meta, synchronized into your workspace, and ready to be dispatched via automations or broadcast campaigns.",
    tips: [
      "Ensure variable sample values are filled in before submitting to avoid Meta rejection.",
      "Utility templates (order notifications, verification codes) have lower Meta per-message charges than Marketing templates."
    ],
    troubleshooting: [
      {
        issue: "Template rejected by Meta with reason 'Variable parameters missing'?",
        solution: "Meta requires that every variable `{{1}}` has a corresponding realistic sample value in the template submission form."
      },
      {
        issue: "Template status stuck on 'PENDING'?",
        solution: "Meta approvals usually take under 5 minutes, but occasionally require manual review up to 24 hours. Click 'Refresh Status' in the templates table."
      }
    ],
    seo: {
      title: "WhatsApp Message Templates Guide | OrbionAgents",
      description: "How to create, format variables, and submit Meta-approved WhatsApp templates for automated customer outreach.",
      keywords: ["WhatsApp templates", "Meta Cloud API templates", "broadcast messages", "message variables"]
    }
  },

  "features/credits-wallet": {
    slug: "features/credits-wallet",
    category: "Core Features",
    title: "Credits, Wallet & Token Metering",
    subtitle: "Real-time visibility into LLM token expenditure, channel costs, and wallet balance.",
    readTime: "5 min read",
    lastUpdated: "May 2026",
    whatIsIt: "The Credits & Wallet module (/user/admin/credits) manages your workspace's token balance and billing meters. It provides transparent auditing of every prompt, completion, and tool invocation across underlying providers (OpenAI, Anthropic, Google, Groq).",
    whyUseIt: "Uncontrolled LLM usage can lead to surprise bills. OrbionAgents gives you granular cost tracking down to the exact conversation, customizable threshold alerts, and flexible auto-recharge settings to keep your customer bots running 24/7.",
    beforeYouStart: [
      "An active workspace with billing permissions."
    ],
    steps: [
      {
        step: 1,
        title: "Open Credits & Wallet",
        instruction: "Click on 'Credits & Wallet' in the left-hand sidebar navigation (/user/admin/credits).",
        uiElements: ["'Credits & Wallet' menu item with Coins icon", "Credit Ring balance widget"]
      },
      {
        step: 2,
        title: "Inspect Remaining Balance and Burn Rate",
        instruction: "Review your available credits ring, daily burn rate, and projected days remaining at your current conversation volume.",
        uiElements: ["Circular Credit Ring indicator", "'Daily Average Burn' stat", "'Projected Runway' counter"]
      },
      {
        step: 3,
        title: "Analyze Model-by-Model Breakdown",
        instruction: "Scroll to the 'Usage by Model' section to see token consumption split across Claude 3.5 Sonnet, GPT-4o, and Llama 3.",
        uiElements: ["Model breakdown bar chart", "Input vs Output token counters"]
      },
      {
        step: 4,
        title: "Configure Balance Alerts & Auto-Topup",
        instruction: "Click 'Wallet Settings' to set an email alert threshold (e.g., notify when credits fall below 5,000) or enable automatic wallet recharge.",
        uiElements: ["'Threshold Alert' input", "'Auto Top-Up' toggle", "'Recharge Amount' selector"]
      },
      {
        step: 5,
        title: "Add Credits via Razorpay Gateway",
        instruction: "Click '+ Add Credits', select a credit pack, and complete payment via UPI, Credit Card, or Netbanking.",
        uiElements: ["'+ Add Credits' button", "Packs selection modal", "Razorpay checkout modal"]
      }
    ],
    screenshots: [
      {
        src: "/images/documentation.webp",
        alt: "Credits & Token Metering Dashboard",
        caption: "Credit balance ring, token consumption logs, and wallet recharge options."
      }
    ],
    expectedResult: "Your wallet balance is updated in real time, with an itemized transaction receipt added to your billing log.",
    tips: [
      "Use '✨ Auto' model selection in the AI Workspace and Wires to let the system route routine queries to lightweight models, reducing token costs by up to 70%.",
      "Set an alert threshold at 20% of your average monthly usage to prevent service interruptions."
    ],
    troubleshooting: [
      {
        issue: "Credits deducted but response failed due to network timeout?",
        solution: "Failed generation requests are automatically detected by our billing reconciler and refunded to your wallet balance within 15 minutes."
      }
    ],
    seo: {
      title: "Credits, Wallet & Token Metering | OrbionAgents",
      description: "Track conversational AI token usage, manage your wallet balance, and configure auto-recharge settings.",
      keywords: ["AI tokens", "credit wallet", "token metering", "LLM billing", "auto top-up"]
    }
  }
};

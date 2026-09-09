export const CORE_FEATURES_PART3 = {
  "features/leads-crm": {
    slug: "features/leads-crm",
    category: "Core Features",
    title: "AI Lead Intelligence & CRM",
    subtitle: "Autonomous prospect qualification, real-time intent extraction, and automated CRM pipeline syncing.",
    pageType: "crm",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Leads & CRM module (/user/admin/leads) captures and qualifies customer contacts generated during WhatsApp and Instagram conversations. The AI Lead Intelligence engine parses dialogue in real time, extracts qualifying parameters (budget, timeline, intent), assigns a dynamic qualification score, and organizes leads into an interactive pipeline."
      },
      {
        id: "capabilities",
        title: "Key Lead Intelligence Features",
        type: "list",
        items: [
          { title: "Automated Parameter Extraction", description: "Detects budget figures, purchase timelines, company name, and requirements without manual forms." },
          { title: "Dynamic Lead Scoring (0-100)", description: "Categorizes prospects into Hot (>75), Warm (40-74), and Cold (<40) tiers based on buying intent." },
          { title: "Pipeline Kanban Board", description: "Drag-and-drop stage transitions from Lead Identified to Qualified, Demo Booked, and Won." },
          { title: "CRM Sync & Export", description: "One-click CSV exports and automated webhook sync to HubSpot, Salesforce, or custom backends." }
        ]
      },
      {
        id: "step-by-step",
        title: "Managing the Lead Pipeline",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Access Leads Dashboard",
            instruction: "Click 'Leads' in the sidebar navigation (/user/admin/leads) to open your pipeline.",
            uiElements: ["Sidebar 'Leads' link", "Pipeline view switcher"]
          },
          {
            step: 2,
            title: "Filter by Lead Qualification Tier",
            instruction: "Use the filter bar to isolate 'Hot' leads requiring immediate sales attention within the 24-hour window.",
            uiElements: ["Tier filter pills (Hot / Warm / Cold)", "Score range filter"]
          },
          {
            step: 3,
            title: "Inspect Lead Profile & Transcript",
            instruction: "Click any lead card to view extracted contact info, budget notes, and jump directly into the full chat thread in Omni-Inbox.",
            uiElements: ["Lead detail drawer", "'View Conversation' link"]
          },
          {
            step: 4,
            title: "Export or Sync Contacts",
            instruction: "Click 'Export CSV' for offline sales reports, or configure webhooks to synchronize updated contacts to your CRM.",
            uiElements: ["'Export CSV' button", "Webhook sync indicator"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Pipeline Synchronized:",
        calloutText: "Contact records are enriched and organized automatically from chat conversations with zero manual data entry."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Lead name shows phone number instead of person's name?",
            cause: "Customer has not stated their name in dialogue yet, and their WhatsApp profile name is hidden by privacy settings.",
            solution: "When the customer introduces themselves or fills in a name prompt, the lead profile updates automatically."
          }
        ]
      }
    ],
    seo: {
      title: "Leads & CRM Pipeline | OrbionAgents",
      description: "Capture, qualify, tag, and export contacts directly from active conversational channels.",
      keywords: ["AI CRM", "lead qualification", "conversational lead generation", "WhatsApp CRM"]
    }
  },

  "features/templates": {
    slug: "features/templates",
    category: "Core Features",
    title: "WhatsApp Message Templates",
    subtitle: "Design Meta-approved WhatsApp broadcast and transactional message templates with dynamic variables.",
    pageType: "conversation",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "WhatsApp Message Templates are pre-approved message structures required by Meta to initiate conversations outside the standard 24-hour service window. Use the Template Builder (/user/admin/templates) to compose, preview, and submit Marketing, Utility, and Authentication templates for official Meta approval."
      },
      {
        id: "template-categories",
        title: "Meta Template Categories",
        type: "list",
        items: [
          { title: "Marketing Templates", description: "Promotional announcements, discount offers, product recommendations, and abandoned cart reminders." },
          { title: "Utility Templates", description: "Transactional updates: order confirmations, shipping updates, account alerts, and billing receipts." },
          { title: "Authentication Templates", description: "One-time passwords (OTP) and two-factor authentication verification codes." }
        ]
      },
      {
        id: "step-by-step",
        title: "Creating & Submitting a Template",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Open Template Builder",
            instruction: "Navigate to Templates (/user/admin/templates) and click '+ Create Template'.",
            uiElements: ["Templates dashboard", "'+ Create Template' button"]
          },
          {
            step: 2,
            title: "Choose Category & Language",
            instruction: "Select Category (Marketing or Utility), specify template name (lowercase with underscores), and select primary language.",
            uiElements: ["Category radio buttons", "'Template Name' input", "'Language' selector"]
          },
          {
            step: 3,
            title: "Compose Header, Body & Buttons",
            instruction: "Write your message copy using {{1}}, {{2}} variable syntax for dynamic customer names or order numbers. Add optional media header (Image/Video/Document) and Call-to-Action buttons.",
            uiElements: ["Header media selector", "Body textarea with variable helper", "Button builder"]
          },
          {
            step: 4,
            title: "Submit to Meta for Approval",
            instruction: "Review the live phone preview on the right. Click 'Submit for Review'. Approvals are typically processed by Meta within 15 minutes.",
            uiElements: ["Mobile mockup preview", "'Submit to Meta' button"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Template Approved:",
        calloutText: "The template status badge turns green 'Approved' and becomes immediately available for automated Wires broadcasts and re-engagement messaging."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Template rejected with reason 'Variable formatting error'?",
            cause: "Variables must follow consecutive numerical order starting at {{1}} (e.g. {{1}}, {{2}}). Meta rejects templates containing non-sequential variables or variables in the footer.",
            solution: "Ensure variables start with {{1}} in the body text and provide realistic sample values for each variable during submission."
          },
          {
            issue: "Template rejected for 'Category mismatch'?",
            cause: "A promotional or sales message was submitted under the 'Utility' category.",
            solution: "Change the template category to 'Marketing' and re-submit."
          }
        ]
      }
    ],
    seo: {
      title: "WhatsApp Message Templates | OrbionAgents",
      description: "Design Meta-approved WhatsApp broadcast and transactional templates with variables.",
      keywords: ["WhatsApp templates", "Meta template approval", "HSM message builder", "WhatsApp marketing"]
    }
  },

  "features/credits-wallet": {
    slug: "features/credits-wallet",
    category: "Core Features",
    title: "Credits, Wallet & Token Metering",
    subtitle: "Deterministic per-token metering, Meta WCC conversation billing, transparent transaction ledgers, and zero-downtime auto-reload.",
    pageType: "billing",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Credits & Wallet console (/user/admin/credits) provides transparent metering for AI token consumption across foundation models (GPT-4o, Claude, Gemini) and reconciles Meta WhatsApp Conversation Charges (WCC). Monitor daily expenditure, inspect an itemized ledger, and configure auto-recharge rules."
      },
      {
        id: "ledger-features",
        title: "Metering Architecture",
        type: "list",
        items: [
          { title: "Deterministic Token Counting", description: "Captures exact prompt and completion tokens per inference turn with sub-cent accuracy." },
          { title: "Meta WCC Cost Tracking", description: "Direct pass-through billing for Meta 24-hour service and marketing conversation windows." },
          { title: "Auto-Reload Safety Buffer", description: "Automatically charges payment card when credit balance drops below your configured threshold." },
          { title: "Immutable Transaction History", description: "Audit trail logging timestamp, model used, conversation ID, and credit deduction." }
        ]
      },
      {
        id: "step-by-step",
        title: "Managing Credits & Auto-Reload",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Access Wallet Dashboard",
            instruction: "Open Credits (/user/admin/credits) to inspect your AI Credits balance and Meta WCC reserves.",
            uiElements: ["Sidebar 'Credits' item", "Balance cards"]
          },
          {
            step: 2,
            title: "Configure Auto-Reload",
            instruction: "Click 'Auto-Reload Settings'. Set minimum threshold (e.g. reload when balance drops below $20) and top-up amount.",
            uiElements: ["Auto-reload toggle", "Threshold input field", "Top-up amount selector"]
          },
          {
            step: 3,
            title: "Review Transaction History",
            instruction: "Scroll to the ledger table to audit recent token deductions with model names and conversation IDs.",
            uiElements: ["Ledger table", "Date range filter"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Continuous Operations Guaranteed:",
        calloutText: "Agents operate continuously without running out of credits mid-conversation, backed by automated top-up protection."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Auto-reload triggered sooner than anticipated?",
            cause: "A surge in high-token queries or large document RAG lookups increased token consumption.",
            solution: "Inspect the Transaction Ledger to identify which agent drove the usage, and optimize temperature or switch simple FAQ tasks to Gemini Flash."
          }
        ]
      }
    ],
    seo: {
      title: "Credits, Wallet & Token Metering | OrbionAgents",
      description: "Monitor real-time token expenditure, model-by-model consumption, and auto top-up in OrbionAgents.",
      keywords: ["AI token metering", "WhatsApp conversation cost", "WCC billing", "wallet credits"]
    }
  }
};

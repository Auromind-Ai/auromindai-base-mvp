export const ACCOUNT_AND_BILLING_ARTICLES = {
  "account/workspace-management": {
    slug: "account/workspace-management",
    category: "Account & Governance",
    title: "Workspaces & Team Permissions",
    subtitle: "Manage multi-tenant organizations, invite team collaborators, and configure role-based access control.",
    pageType: "settings",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "Workspace Management enables organization owners to administer isolated environments under a master tenant account. Team members can be invited with defined roles, separating customer conversations, knowledge collections, channel tokens, and operational settings across departments or client projects."
      },
      {
        id: "what-this-manages",
        title: "What this page manages",
        type: "list",
        items: [
          { title: "Workspace Environments", description: "Create and switch between separate workspaces for different brands, branches, or client accounts." },
          { title: "Team Collaborator Invitations", description: "Invite staff by business email address to collaborate on customer interactions." },
          { title: "Role-Based Access Control (RBAC)", description: "Assign Admin, Agent, or Viewer permission tiers to restrict sensitive configuration areas." },
          { title: "Member Revocation & Audit", description: "Instantly revoke workspace access and view active collaborators in the team table." }
        ]
      },
      {
        id: "prerequisites",
        title: "Prerequisites",
        type: "checklist",
        items: [
          "Workspace Owner or Admin privileges in your current organization.",
          "Valid corporate email addresses for all team members being invited."
        ]
      },
      {
        id: "rbac-matrix",
        title: "Role Permission Matrix",
        type: "table",
        headers: ["Role", "Omni-Inbox & Leads", "AI Studio & Wires", "Settings & Channels", "Billing & Profile"],
        rows: [
          ["Owner", "Full Access", "Full Access", "Full Access", "Full Access"],
          ["Admin", "Full Access", "Full Access", "Full Access", "Full Access"],
          ["Agent", "Read & Respond", "Test & View", "Read Only", "No Access"],
          ["Viewer", "Read Only", "Read Only", "Read Only", "No Access"]
        ]
      },
      {
        id: "step-by-step",
        title: "Configuring Workspaces & Inviting Members",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Access Workspace Settings",
            instruction: "Navigate to Settings in the lower-left navigation bar and select 'Workspaces'.",
            uiElements: ["Sidebar Settings navigation", "'Workspaces' tab"]
          },
          {
            step: 2,
            title: "Add or Switch Workspaces",
            instruction: "Click '+ Add Workspace' to initialize a new isolated tenant. Enter the workspace name and default operational timezone.",
            uiElements: ["'+ Add Workspace' button", "'Workspace Name' input", "'Timezone' selector"]
          },
          {
            step: 3,
            title: "Invite a Team Member",
            instruction: "In the 'Team & Members' panel, input the invitee's email address and select their role from the dropdown (Admin, Agent, or Viewer).",
            uiElements: ["'Email Address' field", "'Role' selector", "'Send Invite' button"]
          },
          {
            step: 4,
            title: "Manage Active Collaborators",
            instruction: "Review active collaborators in the team table. Click the revoke button to immediately remove access when an employee changes roles or leaves.",
            uiElements: ["Collaborators table", "'Revoke' action button"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Security & Isolation Guarantee:",
        calloutText: "Invited collaborators receive access strictly limited to their assigned role tier, ensuring API keys, billing configurations, and customer data remain protected."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Invited team member cannot access the workspace?",
            cause: "The user may have registered with a different email address than the one invited.",
            solution: "Verify that the user creates an account using the exact invited email. The platform links verified email addresses to the tenant on first sign in."
          },
          {
            issue: "Agent cannot see the Billing or Channels tab?",
            cause: "This is intentional RBAC security behavior.",
            solution: "Only Owners and Admins have permission to modify payment methods and channel credentials. Upgrade the user's role to Admin if channel management is required."
          }
        ]
      }
    ],
    seo: {
      title: "Workspaces & Team Permissions | OrbionAgents",
      description: "Manage multi-tenant workspaces, invite team members, and configure role-based access control in OrbionAgents.",
      keywords: ["multi-tenant workspaces", "team permissions", "RBAC", "workspace setup"]
    }
  },

  "account/ai-governance": {
    slug: "account/ai-governance",
    category: "Account & Governance",
    title: "AI Governance & Safeguards (MCP)",
    subtitle: "Real-time AI guardrails: automatic response evaluation, content filtering, and human escalation.",
    pageType: "ai-feature",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "AI Governance & Safeguards (MCP) is our built-in safety gatekeeper for Orbion Agents. Before an AI Agent replies to a customer on WhatsApp, Instagram, or Email, the MCP engine automatically evaluates the message against strict safety rules. It decides whether to ALLOW safe responses, BLOCK harmful or abusive content, or ESCALATE sensitive customer issues (like refunds, complaints, or high-value leads) directly to a human team member in the Omni-Channel Inbox."
      },
      {
        id: "why-use-it",
        title: "Core Capabilities & Value",
        type: "list",
        items: [
          { title: "Automated Response Safety (Allow / Block / Escalate)", description: "Every AI reply is evaluated before reaching the customer. Safe inquiries receive instant autonomous answers, while inappropriate or harmful messages are blocked immediately." },
          { title: "Human Escalation for High-Value & Sensitive Inquiries", description: "When a customer requests a refund, files a major complaint, or asks about custom enterprise pricing, the AI pauses and immediately escalates the conversation to your team in the Omni-Channel Inbox." },
          { title: "Blocked Keywords & Spam Filtering", description: "Filter out competitor names, prohibited words, or spam. If a user attempts prompt injection tricks or sends abusive messages, the AI safely rejects the input and stays on topic." },
          { title: "Accurate Knowledge Base Answers (Confidence Scores)", description: "The AI only answers when it is confident in the information retrieved from your business Knowledge Base (RAG). If confidence is low, it connects the user to a human agent instead of guessing." }
        ]
      },
      {
        id: "troubleshooting",
        title: "Feature Troubleshooting & Common Questions",
        type: "troubleshooting",
        items: [
          {
            issue: "What does the AI Safeguard do when it cannot find an answer in my Knowledge Base?",
            cause: "Missing documentation or low confidence score",
            solution: "If the AI's confidence score is low because the answer is not in your uploaded documents, the safeguard prevents the bot from guessing or making up false details. Instead, it politely informs the customer and escalates the chat to a human team member."
          },
          {
            issue: "How does the system handle refund requests or angry customer messages?",
            cause: "Sensitive customer intent detected",
            solution: "The MCP safeguard detects sensitive keywords (like 'refund', 'cancel', or complaint phrases) and flags the chat as an 'Escalation'. An alert banner appears on the conversation in your Omni-Channel Inbox so a human agent can step in immediately."
          },
          {
            issue: "Can I prevent the AI Agent from discussing certain topics or competitors?",
            cause: "Brand safety & competitor protection",
            solution: "Yes. You can configure blocked keywords in your workspace settings. If a user asks about a blocked topic or competitor, the safeguard stops the AI from promoting or discussing those terms."
          },
          {
            issue: "How do human agents take over an escalated conversation?",
            cause: "Human handoff workflow",
            solution: "When a chat is escalated, your team sees an 'Escalated by AI Safeguard' badge in the Omni-Channel Inbox. Any human agent can simply click into the chat and start typing. The AI pauses automatically until handed back."
          },
          {
            issue: "Does the AI safeguard delay responses to customers on WhatsApp or Instagram?",
            cause: "Processing latency",
            solution: "No. The safeguard evaluates messages in real time in memory within a fraction of a second, so customers experience seamless, instant replies."
          }
        ]
      }
    ],
    seo: {
      title: "AI Governance & Safeguards (MCP) | Orbion Agents Documentation",
      description: "Learn how Orbion Agents safeguards conversational AI with automatic response evaluation, blocked keyword filtering, and human escalation.",
      keywords: ["AI governance", "Model Context Protocol", "MCP safeguards", "guardrails", "human escalation"]
    }
  },

  "billing/plans-pricing": {
    slug: "billing/plans-pricing",
    category: "Billing & Subscriptions",
    title: "Subscription Plans & Add-ons",
    subtitle: "Manage subscription tiers, channel allowances, automation quotas, and add-on packs.",
    pageType: "billing",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "OrbionAgents provides structured subscription tiers designed for creators, growing teams, and high-volume enterprises. Plans bundle active messaging channels, Automation Wire limits, Knowledge Brain storage, and included compute credits."
      },
      {
        id: "what-this-manages",
        title: "What this page manages",
        type: "list",
        items: [
          { title: "Current Subscription Status", description: "View your active plan, renewal date, and billing cycle (Monthly or Yearly)." },
          { title: "Quota & Allowance Monitoring", description: "Track utilization of connected channels, active wires, and knowledge base capacity." },
          { title: "Plan Upgrades & Downgrades", description: "Switch between Starter, Pro, and Enterprise tiers as your business scales." },
          { title: "Individual Add-on Packs", description: "Purchase standalone extra channel slots or wire quotas without upgrading the whole plan tier." }
        ]
      },
      {
        id: "tier-matrix",
        title: "Plan Comparison Matrix",
        type: "table",
        headers: ["Feature Tier", "Starter", "Pro", "Enterprise"],
        rows: [
          ["Connected Channels", "1 Channel (WhatsApp or IG)", "Up to 3 Channels", "Unlimited Custom Channels"],
          ["Automation Wires", "5 Active Wires", "25 Active Wires", "Unlimited Wires"],
          ["Brain Collections", "2 Collections (50MB)", "10 Collections (500MB)", "Custom pgvector Namespaces"],
          ["AI Copilot & Inbox", "Standard Queue", "Unified Queue + Copilot", "Dedicated Agent Pools + Priority SLA"]
        ]
      },
      {
        id: "step-by-step",
        title: "Managing Plans & Purchasing Add-ons",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Navigate to Billing Dashboard",
            instruction: "Open the admin dashboard and navigate to Billing (/user/admin/billing).",
            uiElements: ["Sidebar Billing icon", "'Plans & Add-ons' section"]
          },
          {
            step: 2,
            title: "Select Billing Cadence",
            instruction: "Toggle between Monthly and Yearly billing. Yearly plans include a 20% discount on base platform subscription charges.",
            uiElements: ["Monthly / Yearly toggle switch"]
          },
          {
            step: 3,
            title: "Choose Target Plan or Add-on",
            instruction: "Click 'Upgrade' under your desired tier, or scroll to 'Add-ons' to select additional channel seats or wire packs.",
            uiElements: ["'Upgrade' button", "'Add-on Packs' selector"]
          },
          {
            step: 4,
            title: "Complete Checkout",
            instruction: "Review the order summary modal and complete secure payment. The updated quotas take effect immediately.",
            uiElements: ["Order Summary modal", "Payment confirmation"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Instant Quota Provisioning:",
        calloutText: "Upgraded limits for channels, wires, and storage are applied instantly to your workspace without requiring server restart or downtime."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Payment failed during plan checkout?",
            cause: "Card may have international or recurring billing restrictions enabled by the issuing bank.",
            solution: "Verify that international online transactions are enabled on your card, or choose an alternate payment method in the checkout modal."
          },
          {
            issue: "Quota did not reflect immediately after payment?",
            cause: "Webhook confirmation from payment gateway may experience slight network delay.",
            solution: "Refresh the billing page after 15 seconds. If the issue persists, contact support with the transaction reference ID."
          }
        ]
      }
    ],
    seo: {
      title: "Subscription Plans & Pricing | OrbionAgents",
      description: "Compare OrbionAgents pricing tiers, feature allowances, automation quotas, and enterprise options.",
      keywords: ["OrbionAgents pricing", "AI SaaS plans", "WhatsApp bot pricing", "conversational AI costs"]
    }
  },

  "billing/gst-invoices": {
    slug: "billing/gst-invoices",
    category: "Billing & Subscriptions",
    title: "GST Compliance & Invoices",
    subtitle: "Manage your billing profile, GST details, and available invoice records from Orbion billing.",
    pageType: "gst",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Billing Profile & Invoice console (/user/admin/billing) allows workspace administrators to configure corporate billing information, add an official Goods and Services Tax Identification Number (GSTIN), and access historical transaction invoice receipts for record-keeping."
      },
      {
        id: "what-this-manages",
        title: "What this page manages",
        type: "list",
        items: [
          { title: "Billing Profile", description: "Primary billing contact name, notification email, and direct telephone number." },
          { title: "Business Information", description: "Registered legal business name, street address, city, state, postal code, and country." },
          { title: "GST Details", description: "Official 15-digit GSTIN registration number and GST status toggle." },
          { title: "Invoice & Payment History", description: "Chronological table of completed subscription charges, top-ups, and transaction references." },
          { title: "Invoice Documents", description: "Downloadable PDF invoice receipts associated with past billing transactions." }
        ]
      },
      {
        id: "prerequisites",
        title: "Before You Start",
        type: "checklist",
        items: [
          "Workspace Admin or Owner role in your Orbion organization.",
          "Your company's official registered legal business name and corporate address.",
          "Your valid 15-digit GSTIN (e.g. 27AAPFU0939F1ZV) if registered under Indian GST."
        ]
      },
      {
        id: "configure-profile",
        title: "Configure Billing Profile",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Navigate to Billing Settings",
            instruction: "Log in to the dashboard and open the Billing page at /user/admin/billing.",
            uiElements: ["Sidebar 'Billing' navigation link", "'Billing Profile' card"]
          },
          {
            step: 2,
            title: "Open Profile Editor",
            instruction: "Locate the 'Billing Profile' section and click the 'Edit Profile' button to enable editing fields.",
            uiElements: ["'Edit Profile' button"]
          },
          {
            step: 3,
            title: "Fill Business & Contact Details",
            instruction: "Input your Legal Business Name, Contact Name, Billing Email, Phone Number, Street Address, City, State, Postal Code, and Country.",
            uiElements: [
              "'Legal Business Name' input",
              "'Billing Contact Name' input",
              "'Billing Email' input",
              "'State' dropdown selector",
              "'Postal Code' input"
            ]
          }
        ]
      },
      {
        id: "add-gst",
        title: "Add GST Details",
        type: "steps",
        steps: [
          {
            step: 4,
            title: "Enable GST Registration",
            instruction: "Toggle 'I have a GST Registration' to the ON position. This reveals the GSTIN entry input.",
            uiElements: ["'I have a GST Registration' toggle switch"]
          },
          {
            step: 5,
            title: "Input 15-Digit GSTIN",
            instruction: "Enter your official 15-character GSTIN. Verify that the two-digit state prefix matches the state selected in your address.",
            uiElements: ["'GSTIN' input field", "15-character uppercase format"]
          },
          {
            step: 6,
            title: "Save Profile",
            instruction: "Click 'Save Billing Profile'. Your saved details will be recorded for future invoice generation.",
            uiElements: ["'Save Billing Profile' button", "Success confirmation message"]
          }
        ]
      },
      {
        id: "invoice-history",
        title: "Review Invoice History & Download",
        type: "steps",
        steps: [
          {
            step: 7,
            title: "Inspect Payment History Table",
            instruction: "Scroll down to the 'Invoice & Payment History' section. Review the date, transaction description, amount, and payment status.",
            uiElements: ["'Invoice & Payment History' table", "Transaction date and status columns"]
          },
          {
            step: 8,
            title: "Download Invoice PDF",
            instruction: "Click the download action icon on any completed transaction row to save the invoice receipt PDF to your device.",
            uiElements: ["Download PDF button / icon", "Browser file download prompt"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Verified Product Behavior:",
        calloutText: "Your corporate billing address and GSTIN are stored with your workspace profile, and all completed transactions in your payment history table can be downloaded as PDF receipts."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "GSTIN fails to save or shows an error?",
            cause: "A GSTIN must follow the exact 15-character alphanumeric format: 2 digits (State Code) + 10 characters (PAN) + 1 entity code + 'Z' + 1 checksum digit.",
            solution: "Double-check your GST certificate for exact spelling and ensure no trailing spaces or special characters were pasted."
          },
          {
            issue: "Invoice PDF download does not start?",
            cause: "Browser popup blocker may be suppressing the download trigger.",
            solution: "Allow popups for the Orbion application URL in your browser settings and click the download button again."
          },
          {
            issue: "A past invoice does not show updated GST details?",
            cause: "Billing profile updates apply to transactions generated after saving the profile.",
            solution: "Past finalized transactions reflect the billing profile active at transaction time. If you need a previous invoice updated for accounting, contact billing support with the invoice ID."
          }
        ]
      }
    ],
    seo: {
      title: "GST Compliance & Invoices | OrbionAgents",
      description: "How to configure GSTIN details, manage billing profiles, and download invoice receipts in OrbionAgents.",
      keywords: ["GST invoice", "GSTIN OrbionAgents", "billing profile", "invoice download"]
    }
  }
};

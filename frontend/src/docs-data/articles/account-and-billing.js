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
    subtitle: "Compare platform tiers, monthly AI token quotas, WhatsApp conversation allowances, and add-on packs.",
    pageType: "billing",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "OrbionAgents operates on a transparent 3-tier subscription architecture engineered for rapid acquisition and enterprise scale: Free Starter (₹0 acquisition tier), Pro (₹199/month for growing businesses), and Enterprise (dedicated high-volume conversational AI infrastructure). Every plan bundles monthly AI credits, WhatsApp Conversation Credit (WCC) wallet balances, active automations, knowledge base document storage, and CRM capacity.",
        uiPreview: "PricingPreview"
      },
      {
        id: "what-this-manages",
        title: "What this console manages",
        type: "list",
        items: [
          { title: "Subscription Status & Quotas", description: "Inspect your active workspace tier (Free Starter, Pro, or Enterprise), monthly renewal date, and active billing status." },
          { title: "Monthly Quotas & Balances", description: "Track real-time burn against included AI credits (20K to 500K+), WhatsApp conversation wallets (₹50 to ₹500+), and flow limits." },
          { title: "Plan Upgrades & Checkout", description: "Seamlessly upgrade from Free Starter to Pro or Enterprise via Razorpay checkout with instant zero-downtime quota provisioning." },
          { title: "On-Demand Add-on Top-ups", description: "Pro and Enterprise workspaces can recharge WhatsApp wallets, buy AI credit top-ups, and add flow packs without altering base plan tiers." }
        ]
      },
      {
        id: "tier-matrix",
        title: "Official Plan Entitlements & Pricing Matrix",
        type: "table",
        headers: ["Platform Metric / Quota", "Free Starter", "Pro (Most Popular)", "Enterprise"],
        rows: [
          ["Subscription Price", "₹0 / month", "₹199 / month", "₹24,999 / month or Custom Quote"],
          ["Monthly AI Credits", "20,000 Credits", "250,000 Credits", "500,000+ Credits"],
          ["WhatsApp Wallet (WCC)", "₹50 (~45 messages)", "₹500 (~450 messages)", "₹500+ (Custom Enterprise Wallet)"],
          ["Active Automations (Wires)", "2 Active Automations", "50 Active Automations", "Unlimited Automations"],
          ["Flow Executions / month", "2 Executions / month", "10 Executions / month", "Unlimited Executions"],
          ["Knowledge Base Documents", "5 Documents", "100 Documents", "1,000 Documents"],
          ["Brain File Storage", "100 MB Storage", "5 GB File Storage", "100 GB Dedicated Storage"],
          ["Leads & CRM Limit", "50 Active Leads", "100 Active Leads", "Unlimited Leads"],
          ["Meetings Scheduled / month", "10 Meetings / month", "500 Meetings / month", "Unlimited Meetings"],
          ["Gmail Connections", "1 Connection", "5 Connections", "Unlimited Connections"],
          ["Team Members", "1 Member", "10 Members", "50 Members"],
          ["AI Credit Top-ups", "Locked (Upgrade required)", "Enabled", "Enabled"],
          ["WhatsApp Wallet Recharge", "Locked (Upgrade required)", "Enabled", "Enabled"],
          ["Flow Pack Add-ons", "Locked (Upgrade required)", "Enabled", "Enabled"]
        ]
      },
      {
        id: "addon-policy",
        title: "Add-on Packs & Top-up Policy",
        type: "checklist",
        checklistTitle: "Add-on Purchase & Wallet Entitlement Rules:",
        items: [
          "Free Starter workspaces operate in sandbox acquisition mode: wallet recharges and credit top-up packs require upgrading to Pro or Enterprise.",
          "Pro & Enterprise workspaces can perform on-demand WhatsApp WCC wallet recharges and buy AI credit top-ups directly under /user/admin/credits.",
          "Included plan AI credits and WhatsApp wallet allowances reset on your monthly renewal date following the workspace EXPIRE policy.",
          "Purchased top-up credits never expire during an active subscription and roll over continuously until consumed."
        ]
      },
      {
        id: "step-by-step",
        title: "Managing Plans & Upgrading Tiers",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Navigate to Billing or Plan Upgrade",
            instruction: "Open your workspace dashboard and navigate to Billing (/user/admin/billing). Click the 'Upgrade plan' button to enter the plan portal at /user/admin/billing/payment.",
            uiElements: ["Sidebar 'Billing' navigation link", "'Upgrade plan' button"]
          },
          {
            step: 2,
            title: "Review Monthly Pricing & Quotas",
            instruction: "Inspect the monthly subscription fee and included allocations. The Pro tier is billed monthly at ₹199/month with instant quota activation.",
            uiElements: ["Plan pricing card", "'₹199 / month' badge"]
          },
          {
            step: 3,
            title: "Select Desired Plan or Enterprise Consultation",
            instruction: "Click 'Choose this plan' under the Pro tier to launch payment checkout, or select 'Schedule a call' / 'Let's Talk' to submit an Enterprise inquiry.",
            uiElements: ["'Choose this plan' button", "'Let's Talk' consultation modal"]
          },
          {
            step: 4,
            title: "Complete Razorpay Checkout & Verification",
            instruction: "Review the order summary modal including GST breakdown, enter your preferred payment credentials (UPI, Cards, NetBanking), and confirm payment.",
            uiElements: ["Order Summary modal", "Razorpay Payment Gateway", "GST Breakdown"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Zero-Downtime Instant Quota Provisioning:",
        calloutText: "Upon successful Razorpay payment confirmation, updated quotas for AI credits, WhatsApp WCC wallet, automations, and file storage are provisioned immediately in your workspace without server restart or session downtime."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & Common Questions",
        type: "troubleshooting",
        items: [
          {
            issue: "Why are AI Credit top-ups and WCC wallet recharges disabled?",
            cause: "Your workspace is currently on the Free Starter tier. Standalone credit top-ups are restricted to paying Pro and Enterprise subscribers.",
            solution: "Upgrade to the Pro tier (starting at ₹199/month). Pro tier unlocks on-demand AI credit top-ups, WhatsApp wallet recharges, and flow packs."
          },
          {
            issue: "Payment succeeded but quotas did not reflect immediately?",
            cause: "Payment gateway webhooks may experience slight network latency (5 to 15 seconds) before synchronizing with your workspace state.",
            solution: "Wait 15 seconds and refresh the billing page. If quotas still do not reflect, check your transaction ID under Payment History in /user/admin/billing."
          },
          {
            issue: "Card payment was declined during plan checkout?",
            cause: "Issuing banks often require international or recurring e-mandate transaction permissions to be enabled on your debit or credit card.",
            solution: "Enable online transactions in your banking app, or complete the payment seamlessly using UPI (Google Pay, PhonePe, Paytm) inside the Razorpay modal."
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
    title: "GST Compliance & Tax Invoices",
    subtitle: "Configure corporate billing profiles, 15-digit GSTIN validation, automated CGST/SGST/IGST tax breakdowns, and PDF invoice receipts.",
    pageType: "gst",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Billing Profile & Invoice console (/user/admin/billing) enables workspace administrators to maintain corporate billing profiles, validate Indian Goods and Services Tax Identification Numbers (GSTIN), and access official B2B tax invoice receipts. All subscription payments and wallet top-ups generate compliant tax invoices with sequential numbering (AUR/YYYY-YY/XXXXXX), itemized tax breakups (CGST + SGST for Tamil Nadu intra-state orders vs IGST for inter-state orders), and instant PDF downloads for corporate accounting and Input Tax Credit (ITC) filing.",
        uiPreview: "GSTInvoicePreview"
      },
      {
        id: "what-this-manages",
        title: "What this console manages",
        type: "list",
        items: [
          { title: "Corporate Billing Identity", description: "Registered legal business name, primary billing contact, notification email, phone number, and entity business type." },
          { title: "Physical Address & Place of Supply", description: "Registered corporate street address, city, state, postal code, and country used to determine Indian GST jurisdiction." },
          { title: "15-Digit GSTIN Validation", description: "Official GSTIN format verification (2-digit state prefix + 10-character PAN + 1 entity code + 'Z' + 1 checksum digit) for B2B ITC claims." },
          { title: "Automated Tax Calculation Engine", description: "Dynamic derivation of 18% standard GST (9% CGST + 9% SGST for Tamil Nadu vs 18% IGST for interstate vs 0% Export)." },
          { title: "Payment History & PDF Receipts", description: "Downloadable ReportLab-compiled PDF tax invoices with verified sequential numbers for every completed transaction." }
        ]
      },
      {
        id: "gst-matrix",
        title: "GST Rate & Tax Jurisdiction Matrix",
        type: "table",
        headers: ["Supply Jurisdiction", "Place of Supply", "CGST (Rate)", "SGST (Rate)", "IGST (Rate)", "Total GST", "ITC Eligibility"],
        rows: [
          ["Intra-State (Within Tamil Nadu)", "Tamil Nadu (Code 33)", "9.0%", "9.0%", "0.0%", "18.0%", "Eligible for B2B Registered"],
          ["Inter-State (Other Indian States)", "Rest of India (e.g. KA, MH, DL)", "0.0%", "0.0%", "18.0%", "18.0%", "Eligible for B2B Registered"],
          ["Export / International", "Outside India (e.g. US, UK, UAE)", "0.0%", "0.0%", "0.0%", "0.0% (Zero-rated)", "Not Applicable"]
        ]
      },
      {
        id: "prerequisites",
        title: "Prerequisites",
        type: "checklist",
        checklistTitle: "Requirements Before Configuring Billing Profile:",
        items: [
          "Workspace Admin or Owner role in your Orbion organization.",
          "Your company's official registered business name and complete physical street address.",
          "A valid 15-character Indian GSTIN (e.g., 33ABCDE1234F1Z5) where the initial 2 digits strictly match your state code."
        ]
      },
      {
        id: "configure-profile",
        title: "Configuring Billing Profile & GSTIN",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Navigate to Billing Console",
            instruction: "Log in to your admin dashboard and open the Billing page at /user/admin/billing.",
            uiElements: ["Sidebar 'Billing' navigation link", "'Billing Profile' card"]
          },
          {
            step: 2,
            title: "Launch Profile Editor",
            instruction: "On the Billing Profile card, click the 'Edit Profile' button to open the configuration modal.",
            uiElements: ["'Edit Profile' button", "Billing Profile editor modal"]
          },
          {
            step: 3,
            title: "Enter Business & Address Details",
            instruction: "Fill in Business Name (required), Contact Name, Billing Email, Phone, Address (required), City (required), State (required text field), Country (e.g. IN), and Postal Code.",
            uiElements: ["'Business Name *' input", "'Address *' input", "'City *' & 'State *' text inputs", "'Country *' input"]
          },
          {
            step: 4,
            title: "Toggle GST Registration & Input GSTIN",
            instruction: "Check 'I have a GST Registration'. Enter your 15-character uppercase GSTIN, optional Legal Business Name, and select your Business Type (Private Limited, LLP, Proprietorship, etc.).",
            uiElements: ["'I have a GST Registration' checkbox", "'GSTIN *' uppercase field", "'Business Type' dropdown"]
          },
          {
            step: 5,
            title: "Save Changes",
            instruction: "Click 'Save Changes'. If you attempt to cancel or close with unsaved edits, the system displays an Unsaved Changes confirmation modal.",
            uiElements: ["'Save Changes' button", "'Unsaved Changes' confirmation safeguard"]
          }
        ]
      },
      {
        id: "invoice-history",
        title: "Viewing Payment History & Downloading Invoices",
        type: "steps",
        steps: [
          {
            step: 6,
            title: "Inspect Payment History",
            instruction: "Scroll down to the 'Payment History' section on /user/admin/billing to view all completed subscription renewals, AI credit purchases, and wallet recharges.",
            uiElements: ["'Payment History' card", "Invoice number, date, amount, and status pill"]
          },
          {
            step: 7,
            title: "Download Invoice PDF",
            instruction: "Click the 'PDF' download button on any completed transaction row. The platform streams a formatted, GST-compliant PDF receipt directly to your device.",
            uiElements: ["'PDF' download button", "ReportLab-generated PDF file (%PDF)"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Verified Tax Invoice Compliance:",
        calloutText: "All future subscription charges and wallet recharges automatically calculate correct intra-state or inter-state GST, record your corporate GSTIN on the invoice, and generate downloadable B2B tax receipts eligible for Input Tax Credit (ITC)."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & Common Questions",
        type: "troubleshooting",
        items: [
          {
            issue: "Why does my GSTIN show a validation error?",
            cause: "A GSTIN must strictly follow the 15-character format: 2-digit state code + 10-character PAN + 1 entity number + 'Z' + 1 checksum digit, with no spaces or symbols.",
            solution: "Check your GST certificate. Ensure the first 2 digits match your billing state (e.g., 33 for Tamil Nadu, 29 for Karnataka, 27 for Maharashtra)."
          },
          {
            issue: "Why is IGST charged instead of CGST + SGST?",
            cause: "Orbion Agents operates from Tamil Nadu. Any customer state outside Tamil Nadu is classified as an Inter-State supply subject to 18% IGST.",
            solution: "If your corporate business operates within Tamil Nadu, ensure 'Tamil Nadu' is entered in your billing state to apply 9% CGST + 9% SGST."
          },
          {
            issue: "Invoice PDF download does not start or opens a blank window?",
            cause: "Browser popup blockers or download restrictions may intercept the PDF file stream.",
            solution: "Allow popups and file downloads for the Orbion domain in your browser settings, then click 'PDF' again."
          },
          {
            issue: "Will updating my GSTIN update past invoice receipts?",
            cause: "Tax invoices are immutable legal documents recorded at the time of payment transaction.",
            solution: "Saved GST details apply automatically to all subsequent transactions. For accounting corrections on older invoices, contact support with the invoice reference ID."
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

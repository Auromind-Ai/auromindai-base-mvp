export const ACCOUNT_AND_BILLING_ARTICLES = {
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
        content: "OrbionAgents operates on a transparent multi-tier subscription architecture designed for every stage of growth: Free Starter (for initial setup and sandbox testing), Pro (for growing businesses with active conversational automation), and Enterprise (dedicated high-volume conversational AI infrastructure with custom allowances). Every plan bundles monthly AI credits, WhatsApp Conversation Credit (WCC) wallet balances, active automations, knowledge base document storage, and CRM capacity.",
        uiPreview: "PricingPreview"
      },
      {
        id: "what-this-manages",
        title: "What this console manages",
        type: "list",
        items: [
          { title: "Subscription Status & Quotas", description: "Inspect your active workspace tier (Free Starter, Pro, or Enterprise), monthly renewal date, and active billing status." },
          { title: "Monthly Quotas & Balances", description: "Track real-time usage against your plan's included AI credits, WhatsApp conversation wallet balances, and active flow execution limits." },
          { title: "Plan Upgrades & Checkout", description: "Seamlessly upgrade or customize your workspace tier with instant zero-downtime quota provisioning." },
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
        id: "troubleshooting",
        title: "Troubleshooting & Common Questions",
        type: "troubleshooting",
        items: [
          {
            issue: "Why are AI Credit top-ups and WCC wallet recharges disabled?",
            cause: "Your workspace is currently on the Free Starter tier. Standalone credit top-ups are restricted to paying Pro and Enterprise subscribers.",
            solution: "Upgrade to an active paid subscription tier (such as Pro or Enterprise). Upgrading unlocks on-demand AI credit top-ups, WhatsApp wallet recharges, and flow pack add-ons."
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
        content: "The Billing Profile & Invoice console (/user/admin/billing) enables workspace administrators to maintain corporate billing profiles, validate Indian Goods and Services Tax Identification Numbers (GSTIN), and access official tax invoice receipts. All subscription payments and wallet top-ups generate compliant tax invoices with sequential numbering (AUR/YYYY-YY/XXXXXX), itemized tax breakups (CGST + SGST for Tamil Nadu intra-state orders vs IGST for inter-state orders), and instant PDF downloads for corporate accounting and Input Tax Credit (ITC) filing.",
        uiPreview: "GSTInvoicePreview"
      },
      {
        id: "what-this-manages",
        title: "What this console manages",
        type: "list",
        items: [
          { title: "Corporate Billing Identity", description: "Registered legal business name, primary billing contact, notification email, phone number, and entity business type." },
          { title: "Physical Address & Place of Supply", description: "Registered corporate street address, city, state, postal code, and country used to determine Indian GST jurisdiction." },
          { title: "15-Digit GSTIN Validation", description: "Official GSTIN format verification (2-digit state prefix + 10-character PAN + 1 entity code + 'Z' + 1 checksum digit) for ITC claims." },
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
          ["Intra-State (Within Tamil Nadu)", "Tamil Nadu (Code 33)", "9.0%", "9.0%", "0.0%", "18.0%", "Eligible (Registered GSTIN)"],
          ["Inter-State (Other Indian States)", "Rest of India (e.g. KA, MH, DL)", "0.0%", "0.0%", "18.0%", "18.0%", "Eligible (Registered GSTIN)"],
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
        title: "Step-by-Step Configuration Guide",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Access Billing Profile Console",
            instruction: "Navigate to your admin dashboard and open the Billing console at /user/admin/billing. In the 'Billing Profile' card, review your current business name, billing contact, email, and GST registration status. Click 'Edit Profile' to launch the tax configuration modal.",
            uiElements: ["Sidebar 'Billing' navigation", "'Billing Profile' card", "'Edit Profile' button", "GST registration status badge"],
            screenshot: {
              src: "/images/docs/screenshots/gst-billing-profile-card.png",
              alt: "Billing Profile overview card interface",
              caption: "Billing Profile card on /user/admin/billing: Review current GST registration status and click 'Edit Profile'."
            }
          },
          {
            step: 2,
            title: "Configure Corporate Details & Validate 15-Digit GSTIN",
            instruction: "In the Edit Billing Profile modal, enter your official Business Name, contact details, physical address, city, and state. Check 'I have a GST Registration', enter your 15-character uppercase GSTIN (e.g., 33ABCDE1234F1Z5), optional Legal Business Name, and select your Business Type (Private Limited, LLP, etc.). Click 'Save Changes' to update your workspace tax profile.",
            uiElements: ["'Business Name *' input", "'Address *', 'City *' & 'State *'", "'I have a GST Registration' checkbox", "15-Digit 'GSTIN *' uppercase field", "'Save Changes' button"],
            screenshot: {
              src: "/images/docs/screenshots/gst-edit-billing-profile-modal.png",
              alt: "Edit Billing Profile Modal with GSTIN configuration",
              caption: "Edit Billing Profile modal: Check 'I have a GST Registration', enter 15-character GSTIN, and save changes."
            }
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Verified Tax Invoice Compliance:",
        calloutText: "All future subscription charges and wallet recharges automatically calculate correct intra-state or inter-state GST, record your corporate GSTIN on the invoice, and generate downloadable tax receipts eligible for Input Tax Credit (ITC)."
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

export const ACCOUNT_AND_BILLING_ARTICLES = {
  "account/workspace-management": {
    slug: "account/workspace-management",
    category: "Account & Governance",
    title: "Workspaces & Team Permissions",
    subtitle: "Manage multi-tenant organizations, invite team collaborators, and assign role-based access control.",
    readTime: "6 min read",
    lastUpdated: "May 2026",
    whatIsIt: "Workspace Management (/user/admin/settings) enables organization owners to manage multiple isolated environments under one master account. You can invite team members, assign granular permissions, and switch between departments or client accounts with one click.",
    whyUseIt: "Agencies serving multiple clients or enterprises managing multiple brands need strict boundaries. Workspaces prevent cross-contamination of customer conversations, proprietary Brain documents, API keys, and billing pools.",
    beforeYouStart: [
      "Workspace Owner or Admin privileges in your current organization."
    ],
    steps: [
      {
        step: 1,
        title: "Open Workspace Settings",
        instruction: "Click on 'Settings' in the lower-left sidebar and select 'Workspaces'.",
        uiElements: ["Sidebar Avatar / Settings gear", "'Workspaces' tab", "Current Workspace name card"]
      },
      {
        step: 2,
        title: "Create or Switch Workspaces",
        instruction: "To create a new workspace, click '+ Add Workspace', enter the name and timezone. To switch, click the workspace dropdown at the top of the sidebar.",
        uiElements: ["'+ Add Workspace' button", "Workspace switcher dropdown", "Organization selector"]
      },
      {
        step: 3,
        title: "Invite Team Members",
        instruction: "In the 'Team & Members' section, enter the email address of the team member you want to add.",
        uiElements: ["'Email Address' field", "'Send Invite' button", "Pending invites list"]
      },
      {
        step: 4,
        title: "Assign Role-Based Permissions (RBAC)",
        instruction: "Select the appropriate role: 'Admin' (full configuration and billing control), 'Agent' (access to Omni-Inbox, Leads, and AI Workspace), or 'Viewer' (read-only analytics).",
        uiElements: ["'Role' dropdown", "Permissions summary card"]
      },
      {
        step: 5,
        title: "Review Member Activity & Revoke Access",
        instruction: "Audit active team members and click the trash can icon or 'Revoke' button to immediately remove access when someone departs the organization.",
        uiElements: ["Active members table", "'Revoke' button", "'Save Changes' button"]
      }
    ],
    screenshots: [
      {
        src: "/images/documentation.webp",
        alt: "Workspace Management & Team Access Control",
        caption: "Managing team roles, member invitations, and multi-tenant workspace environments."
      }
    ],
    expectedResult: "Your team collaborates securely with assigned permission tiers, protecting sensitive API keys and administrative settings.",
    tips: [
      "Keep the Owner role tied to a shared company email (e.g., admin@company.com) rather than an individual employee's inbox.",
      "Agents do not see Billing, API Keys, or MCP safeguard policy editors, keeping operational views uncluttered."
    ],
    troubleshooting: [
      {
        issue: "Team member did not receive the invitation email?",
        solution: "Have them visit https://orbionagents.com/signup directly and register with the exact invited email; the system will attach them to your workspace automatically upon signup."
      }
    ],
    seo: {
      title: "Workspaces & Team Permissions | OrbionAgents",
      description: "Manage multi-tenant workspaces, invite team members, and configure role-based access control in OrbionAgents.",
      keywords: ["multi-tenant workspaces", "team permissions", "RBAC", "agency workspace setup"]
    }
  },

  "account/ai-governance": {
    slug: "account/ai-governance",
    category: "Account & Governance",
    title: "AI Governance & Safeguards (MCP)",
    subtitle: "Enforce Model Context Protocol policies, deterministic guardrails, PII redaction, and human escalation thresholds.",
    readTime: "7 min read",
    lastUpdated: "June 2026",
    whatIsIt: "AI Governance & Safeguards is OrbionAgents' proprietary implementation of the Model Context Protocol (MCP). It acts as an immutable deterministic security layer sitting between the large language model and your customer. Every response is evaluated (Allow, Block, Escalate) before transmission.",
    whyUseIt: "Deploying generative AI in public customer channels carries real risk: hallucinating unauthorized discounts, promising non-existent contract terms, disclosing competitor data, or leaking PII (Personally Identifiable Information). MCP guarantees enterprise compliance and brand safety.",
    beforeYouStart: [
      "Admin access to your workspace.",
      "Company compliance guidelines regarding prohibited topics or escalation triggers."
    ],
    steps: [
      {
        step: 1,
        title: "Access AI Governance Settings",
        instruction: "Navigate to 'Settings' -> 'AI Governance & Safeguards' (or Admin -> 'ai-governance').",
        uiElements: ["'AI Governance' menu item with Shield icon", "Governance policy status badge"]
      },
      {
        step: 2,
        title: "Configure Prohibited Topics & Blacklisted Words",
        instruction: "Specify banned keywords, competitors, and off-limit subjects (e.g., pricing guarantees, legal advice, adult topics).",
        uiElements: ["'Prohibited Keywords' tag input", "'Competitor Mention Policy' toggle (Block/Redirect)"]
      },
      {
        step: 3,
        title: "Enable Automatic PII Redaction",
        instruction: "Toggle 'PII Masking' to ON. The safeguard engine replaces credit card numbers, Social Security/Aadhaar numbers, and passwords with `[REDACTED]` before saving to chat logs.",
        uiElements: ["'PII Masking' switch", "Regex pattern inspector"]
      },
      {
        step: 4,
        title: "Define Human Escalation Thresholds",
        instruction: "Set rules for automatic bot surrender: e.g., if sentiment score drops below 0.3 (angry customer) or if the customer mentions 'lawyer' or 'manager', immediately trigger Human Takeover in Omni-Inbox.",
        uiElements: ["'Sentiment Escalation Threshold' slider", "'Escalate to Human' trigger terms list"]
      },
      {
        step: 5,
        title: "Simulate Policy Violations & Deploy",
        instruction: "Use the policy sandbox test box to input violation phrases and observe the MCP evaluation returning 'Action: Block & Fallback', then click 'Enforce Policy'.",
        uiElements: ["Policy simulation test box", "Evaluation verdict indicator", "'Enforce Policy' button"]
      }
    ],
    screenshots: [
      {
        src: "/images/wires-hero.webp",
        alt: "Model Context Protocol AI Governance Safeguards",
        caption: "Configuring deterministic MCP safeguards, PII redaction, and human escalation triggers."
      }
    ],
    expectedResult: "All outgoing agent communications pass through the governance validator in < 5ms. Unsafe generations are blocked and substituted with compliant fallback responses.",
    tips: [
      "Review the AI Activity audit log weekly to see which policies are being triggered most often.",
      "Always configure a friendly fallback message like: 'I want to make sure you get the exact details on this. Let me connect you with our specialist team.'"
    ],
    troubleshooting: [
      {
        issue: "Valid customer inquiries are getting blocked by the safeguard?",
        solution: "Inspect the blocked log in the audit view to see which keyword or policy rule was triggered, and refine your regex or keyword match sensitivity."
      }
    ],
    seo: {
      title: "AI Governance & Safeguards (MCP) | OrbionAgents",
      description: "Learn how OrbionAgents Model Context Protocol (MCP) safeguards conversational agents with PII redaction and policy guardrails.",
      keywords: ["AI governance", "Model Context Protocol", "MCP safeguards", "AI brand safety", "guardrails"]
    }
  },

  "billing/plans-pricing": {
    slug: "billing/plans-pricing",
    category: "Billing & Subscriptions",
    title: "Subscription Plans & Add-ons",
    subtitle: "Explore Free, Starter, Pro, and Enterprise tiers with quota limits and channel allowances.",
    readTime: "5 min read",
    lastUpdated: "June 2026",
    whatIsIt: "OrbionAgents offers transparent, tiered subscription plans tailored for individual creators, growing businesses, and high-volume enterprises. Plans bundle active messaging channels, Wires automation quotas, Knowledge Brain storage, and included LLM credits.",
    whyUseIt: "Understanding your plan limits ensures that your production messaging funnels never experience throttling or interruption during seasonal sales spikes.",
    beforeYouStart: [
      "Workspace Owner privileges to upgrade or downgrade subscription tiers."
    ],
    steps: [
      {
        step: 1,
        title: "Open the Billing Page",
        instruction: "Click 'Billing' in the left-hand navigation sidebar (/user/admin/billing).",
        uiElements: ["'Billing' menu item with CreditCard icon", "'Current Plan' summary card"]
      },
      {
        step: 2,
        title: "Compare Available Plan Tiers",
        instruction: "Review the comparison table: Free (1 Channel, 5 Wires, 50k Tokens), Starter (2 Channels, 15 Wires, 500k Tokens), Pro (All Channels, Unlimited Wires, 2.5M Tokens, Priority Support), and Enterprise (Custom SLA, Dedicated Vector Cluster).",
        uiElements: ["Plan cards (Free, Starter, Pro, Enterprise)", "'Upgrade Plan' button"]
      },
      {
        step: 3,
        title: "Choose Monthly vs Annual Billing",
        instruction: "Toggle the billing cycle switch. Annual commitments receive a 20% discount across all paid tiers.",
        uiElements: ["'Monthly / Yearly (Save 20%)' toggle switch"]
      },
      {
        step: 4,
        title: "Purchase Add-on Quotas",
        instruction: "If you only need extra Wires or additional WhatsApp numbers without upgrading your tier, select individual add-on packs from the bottom section.",
        uiElements: ["'Add-ons' section", "Extra Channels pack", "Extra Wires pack"]
      },
      {
        step: 5,
        title: "Complete Checkout",
        instruction: "Click 'Upgrade Now', review the order summary, and complete secure payment via Razorpay.",
        uiElements: ["Order summary modal", "Razorpay checkout modal", "Immediate confirmation banner"]
      }
    ],
    screenshots: [
      {
        src: "/images/documentation.webp",
        alt: "Subscription Plans & Pricing Tiers in Billing",
        caption: "Plan comparison matrix and upgrade checkout options in OrbionAgents Billing."
      }
    ],
    expectedResult: "Your workspace limits (channels, wires, and token quotas) are upgraded instantly without downtime.",
    tips: [
      "Start with the Pro plan if you plan to connect both WhatsApp and Instagram simultaneously.",
      "Unused included monthly plan tokens roll over for 30 days on Pro and Enterprise tiers."
    ],
    troubleshooting: [
      {
        issue: "Card payment was declined during checkout?",
        solution: "Verify that international or online transactions are enabled on your card, or choose UPI / Netbanking via the Razorpay modal."
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
    subtitle: "Configure your GSTIN, generate B2B compliant tax invoices, and download PDF receipts.",
    readTime: "5 min read",
    lastUpdated: "June 2026",
    whatIsIt: "The GST & Invoice manager (/user/admin/billing) enables Indian and international businesses to manage tax profiles, maintain compliance with Indian Goods and Services Tax (GST) regulations, claim Input Tax Credit (ITC), and download itemized PDF tax invoices.",
    whyUseIt: "Business customers in India require legally compliant tax invoices featuring their 15-digit GSTIN, legal business entity name, state code, and clear CGST/SGST/IGST tax breakdowns to file monthly GSTR-2B returns.",
    beforeYouStart: [
      "Your company's valid 15-digit GSTIN (e.g., `27AAPFU0939F1ZV`).",
      "Registered corporate address matching GST records."
    ],
    steps: [
      {
        step: 1,
        title: "Open Billing Profile",
        instruction: "Navigate to 'Billing' (/user/admin/billing) and locate the 'Billing Profile & GST Details' section.",
        uiElements: ["'Billing Profile' card", "'Edit Profile' button"]
      },
      {
        step: 2,
        title: "Enter Legal Entity Information",
        instruction: "Click 'Edit Profile'. Enter your Legal Business Name, registered street address, city, state, postal code, and country.",
        uiElements: ["'Legal Business Name' field", "'Billing Address' field", "'State' dropdown"]
      },
      {
        step: 3,
        title: "Toggle GST Registration & Input GSTIN",
        instruction: "Toggle 'I have a GST Registration' to ON, and type your 15-digit GSTIN. The system verifies the format and checks state code consistency.",
        uiElements: ["'GST Registration' toggle switch", "'GSTIN' input field", "Format validation indicator"]
      },
      {
        step: 4,
        title: "Save Profile",
        instruction: "Click 'Save Billing Profile'. All future charges and renewals will automatically generate compliant B2B tax invoices with appropriate CGST/SGST (intra-state) or IGST (inter-state) line items.",
        uiElements: ["'Save Profile' button", "Success toast notification"]
      },
      {
        step: 5,
        title: "Download Past Invoices",
        instruction: "Scroll down to 'Invoice & Payment History'. Click the download icon next to any transaction to retrieve a signed PDF invoice.",
        uiElements: ["'Payment History' table", "Download PDF icon", "Invoice modal preview"]
      }
    ],
    screenshots: [
      {
        src: "/images/documentation.webp",
        alt: "GST Profile and Invoice Download in Billing",
        caption: "Configuring GSTIN details and downloading compliant tax invoices in Billing."
      }
    ],
    expectedResult: "Compliant PDF invoices containing your GSTIN, supplier details (Orbion Agents Private Limited), and tax breakdowns are ready for your accounting department.",
    tips: [
      "Ensure your registered state matches the first two digits of your GSTIN (e.g., 33 for Tamil Nadu, 27 for Maharashtra) to avoid incorrect tax calculations.",
      "Invoices are emailed automatically to the designated billing contact upon successful payment."
    ],
    troubleshooting: [
      {
        issue: "GSTIN validation displays 'Invalid GSTIN format'?",
        solution: "A valid GSTIN must be exactly 15 characters long, following the standard pattern: 2 digits (state code) + 10 alphanumeric (PAN) + 1 entity code + 'Z' + 1 check digit."
      },
      {
        issue: "Invoice does not display your GSTIN?",
        solution: "GSTIN updates apply to future transactions. If you need a previous invoice reissued with your GSTIN, contact support at billing@orbionagents.com."
      }
    ],
    seo: {
      title: "GST Compliance & Invoices | OrbionAgents",
      description: "How to configure GSTIN for Input Tax Credit (ITC), manage billing profiles, and download tax invoices in OrbionAgents.",
      keywords: ["GST invoice", "GSTIN OrbionAgents", "B2B tax invoice", "Razorpay GST billing"]
    }
  }
};

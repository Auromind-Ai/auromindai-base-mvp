export const TROUBLESHOOTING_ARTICLES = {
  "troubleshooting/common-issues": {
    slug: "troubleshooting/common-issues",
    category: "Troubleshooting & Support",
    title: "Common Issues & Resolutions",
    subtitle: "Diagnostics and resolution matrix for Meta 24-hour windows, webhook delivery, RAG ingestion, and token limits.",
    pageType: "troubleshooting",
    sections: [
      {
        id: "overview",
        title: "Diagnostics & Resolution Matrix",
        type: "text",
        content: "This operational guide catalogs the most common technical and configuration bottlenecks encountered across messaging channels, workflow execution, knowledge retrieval, and token metering. Use the diagnostics below to identify root causes and restore active operations."
      },
      {
        id: "channel-diagnostics",
        title: "Channel & Webhook Issues",
        type: "troubleshooting",
        items: [
          {
            problem: "Meta WhatsApp Error 131047: Re-engagement message requires template",
            cause: "More than 24 hours have elapsed since the customer's last inbound message. Meta restricts free-form messaging outside this 24-hour customer care window.",
            solution: "You must dispatch an approved Meta Message Template (Marketing or Utility) to initiate contact. Once the customer replies, a new 24-hour free-form session begins."
          },
          {
            problem: "Inbound messages from WhatsApp or Instagram are not appearing in Omni-Inbox",
            cause: "The Webhook Callback URL or Verify Token in Meta Developer Console is misconfigured, or messaging fields are unsubscribed.",
            solution: "Navigate to Channels (/user/admin/channels). Copy the exact Webhook URL and Verify Token into your Meta App Dashboard > WhatsApp > Configuration. Ensure 'messages' and 'messaging_postbacks' are checked under Subscriptions."
          },
          {
            problem: "Twilio Error 21608: The number is unverified",
            cause: "The Twilio project is operating in Trial mode, which strictly restricts SMS sends to verified numbers.",
            solution: "Upgrade your Twilio project with a credit card balance or verify the target recipient phone number in Twilio Console > Verified Caller IDs."
          }
        ]
      },
      {
        id: "brain-diagnostics",
        title: "Knowledge Base & Agent Issues",
        type: "troubleshooting",
        items: [
          {
            problem: "Document ingestion hangs in 'Processing' or 'Indexing' status",
            cause: "The uploaded PDF may be an image-only scan without an embedded OCR text layer, or the file size exceeds workspace extraction limits.",
            solution: "Ensure the PDF contains selectable text (not flattened scanned images). For large manuals (>20MB), split into smaller chapters or convert into clean Markdown."
          },
          {
            problem: "Agent answers with generic knowledge instead of company document facts",
            cause: "The knowledge collection is not attached to the active agent in Agent Studio, or the similarity match threshold is set too high.",
            solution: "Open Agent Studio (/user/admin/ai) > Knowledge Sources tab. Verify that your uploaded collection is checked. In collection settings, ensure the match threshold is around 0.75."
          },
          {
            problem: "AI Studio returns 401 Unauthorized during testing",
            cause: "Your browser authentication token has expired.",
            solution: "Log out and sign back in to refresh your JWT token, or open an Incognito window to verify credentials."
          }
        ]
      },
      {
        id: "wallet-diagnostics",
        title: "Token & Financial Ledger Issues",
        type: "troubleshooting",
        items: [
          {
            problem: "AI replies suddenly pause and conversations switch to Human Takeover",
            cause: "Your AI compute credit balance has reached zero.",
            solution: "Navigate to Wallet (/user/admin/credits). Add funds to your credit balance or configure Auto-Reload Settings so an automated top-up triggers when balance drops below your safety buffer."
          }
        ]
      },
      {
        id: "support-escalation",
        title: "When to Contact Support",
        type: "checklist",
        checklistTitle: "If an issue persists after following these diagnostics, gather the following details before opening a support ticket:",
        items: [
          "Your Workspace ID (found under Settings > Workspaces).",
          "The affected channel type and registered phone number or handle.",
          "Exact error code or message received.",
          "Timestamp of the failing interaction with recipient phone number.",
          "Browser console error log screenshot if experiencing UI issues."
        ]
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
    title: "Frequently Asked Questions (FAQ)",
    subtitle: "Direct answers to common questions regarding architecture, Meta compliance, and billing.",
    pageType: "faq",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "Answers to frequently asked questions regarding platform architecture, channel connectivity, data privacy, and operational usage."
      },
      {
        id: "channels-faq",
        title: "Channels & Integrations",
        type: "faq",
        items: [
          {
            question: "Can I connect multiple WhatsApp Business numbers to a single workspace?",
            answer: "Yes. Pro and Enterprise workspaces support multiple connected numbers. Each number can operate with distinct agent personas or route to dedicated department queues."
          },
          {
            question: "Does OrbionAgents support WhatsApp Groups?",
            answer: "No. Meta's official WhatsApp Business Cloud API strictly restricts API phone numbers to direct 1-to-1 customer interactions to prevent group spam. Automated participation in user groups is not permitted by Meta's Terms of Service."
          },
          {
            question: "What is the Meta 24-Hour Customer Care Window?",
            answer: "Whenever a customer sends an inbound message to your business, Meta opens a 24-hour window where you can send free-form text and media responses. Once 24 hours elapse with no customer reply, you must use a pre-approved Message Template to contact them."
          }
        ]
      },
      {
        id: "security-faq",
        title: "Privacy & Model Grounding",
        type: "faq",
        items: [
          {
            question: "Is customer conversation data used to train public AI models?",
            answer: "No. Orbion enforces strict zero-retention data agreements with model providers. Your customer chats, uploaded PDF documents, and proprietary business knowledge are never used to train foundation models."
          },
          {
            question: "How does the AI Brain prevent hallucinations?",
            answer: "Orbion uses Retrieval-Augmented Generation (RAG). Inbound customer questions are embedded as dense vectors, matching relevant chunks in your uploaded documents. If the similarity score falls below threshold, the agent explicitly admits it does not know or triggers human handover."
          }
        ]
      },
      {
        id: "billing-faq",
        title: "Billing & Credits",
        type: "faq",
        items: [
          {
            question: "What is the difference between AI Credits and Meta WCC?",
            answer: "AI Credits cover LLM inference tokens (GPT-4o, Claude, Gemini). Meta WhatsApp Conversation Charges (WCC) cover Meta's official per-conversation rates billed directly for 24-hour service or marketing windows."
          },
          {
            question: "Can I download GST-compliant invoice receipts?",
            answer: "Yes. In /user/admin/billing, configure your Legal Business Name and 15-digit GSTIN under Billing Profile. Completed charges in the Payment History table can be downloaded as PDF receipts for your accounting records."
          }
        ]
      }
    ],
    seo: {
      title: "Frequently Asked Questions (FAQ) | OrbionAgents",
      description: "Answers to the most common questions about OrbionAgents AI agents, WhatsApp Cloud API, RAG Brain, and billing.",
      keywords: ["OrbionAgents FAQ", "WhatsApp bot questions", "AI agent FAQ", "conversational AI questions"]
    }
  }
};

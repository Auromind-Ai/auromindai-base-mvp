export const TROUBLESHOOTING_ARTICLES = {
  "troubleshooting/common-issues": {
    slug: "troubleshooting/common-issues",
    category: "Troubleshooting & Support",
    title: "Common Issues & Resolutions",
    subtitle: "Simple guides on customer care windows, channel connections, document uploads, and credit safeguards.",
    pageType: "troubleshooting",
    sections: [
      {
        id: "overview",
        title: "Diagnostics & Resolution Matrix",
        type: "text",
        uiPreview: "SystemDiagnosticsPreview",
        content: "This guide explains the most common questions regarding channel connections, customer care windows, document uploads, and automated safeguards. Use the interactive console on the right to see how Orbion automatically handles these situations to protect your business.",
        bullets: [
          { label: "WhatsApp 24-Hour Rule", text: "How Orbion protects your account and helps you send friendly follow-up templates when customer sessions expire." },
          { label: "1-Click Channel Connection", text: "Connecting WhatsApp and Instagram directly with official Meta login without manual technical setup." },
          { label: "Twilio Testing & Live Setup", text: "Testing SMS with verified numbers and switching to global live delivery." },
          { label: "Document Uploads & AI Memory", text: "Tips for uploading clear, readable PDFs so your AI agent learns your business facts accurately." },
          { label: "Zero-Drop Customer Safeguard", text: "Automatic handover to your human support team if AI credits run low." }
        ]
      },
      {
        id: "channel-diagnostics",
        title: "Messaging Channels & Connection",
        type: "troubleshooting",
        items: [
          {
            problem: "Why can't I send a normal message to a customer after 24 hours?",
            cause: "WhatsApp has an official 24-hour customer care rule to prevent spam. If 24 hours have passed since the customer's last reply, WhatsApp requires businesses to use an approved Message Template to reconnect.",
            solution: "Orbion protects your business number automatically! Instead of failing your message, the platform prompts you to send an approved follow-up template. In your Omni-Inbox, simply choose a template from the quick actions menu. As soon as the customer answers, your normal conversation window re-opens immediately."
          },
          {
            problem: "New customer messages are not appearing in my Omni-Inbox",
            cause: "The channel connection may have been interrupted or your Facebook login authorization needs a quick refresh.",
            solution: "Navigate to Channels (/user/admin/channels). Under WhatsApp or Instagram, click 'Reconnect' to refresh your official Meta connection. Orbion automatically re-synchronizes all inbound and outbound messages in seconds."
          },
          {
            problem: "Twilio test message only delivers to my own phone number",
            cause: "Your Twilio account is currently in Trial Mode, which telecom rules restrict to sending test messages only to phone numbers pre-registered in your account.",
            solution: "Orbion detects trial accounts automatically. For testing, add your phone number in Twilio Console > Phone Numbers > Verified Caller IDs. When you're ready to launch, add a balance to your Twilio account to upgrade to Live mode and send to anyone worldwide."
          },
          {
            problem: "Channel shows 'Disconnected' or needs reconnection",
            cause: "Your Meta password was changed, or account permissions were updated in your Meta Business Suite.",
            solution: "In Channels (/user/admin/channels), click 'Reconnect' to launch the official Meta login window. Log in and confirm permissions. Orbion will restore the connection instantly with all your chat history safe."
          }
        ]
      },
      {
        id: "brain-diagnostics",
        title: "Knowledge Base & Agent Uploads",
        type: "troubleshooting",
        items: [
          {
            problem: "Uploaded PDF stays in 'Processing' or AI cannot read it",
            cause: "The uploaded document might be a scanned photocopy image without selectable text, or the file size is over 20MB.",
            solution: "Ensure your PDF contains selectable text that you can highlight and copy with your mouse. If your document is a scanned image or photo, convert it to a Word document or text file before uploading in Agent Studio (/user/admin/ai). For large manuals over 20MB, split them into smaller chapters."
          },
          {
            problem: "AI agent gives generic answers instead of using my company documents",
            cause: "The uploaded document collection might not be turned on for that agent in your settings.",
            solution: "Go to Agent Studio (/user/admin/ai) > Knowledge Sources tab. Verify that your document collection is checked. In settings, ensure the match threshold is set to 0.75 so the agent accurately finds the right facts."
          },
          {
            problem: "AI testing session shows 'Session Expired'",
            cause: "Your login session in the browser has timed out.",
            solution: "Log out and sign back in to refresh your active login session."
          }
        ]
      },
      {
        id: "wallet-diagnostics",
        title: "Credits & Wallet Safeguards",
        type: "troubleshooting",
        items: [
          {
            problem: "Why did my AI agent stop replying and assign the chat to a team member?",
            cause: "Your AI compute credit balance reached zero.",
            solution: "This is a deliberate safety feature! Rather than leaving customers unanswered or dropping conversations, Orbion automatically forwards active chats to your human team in the Omni-Inbox. You can top up your balance anytime in Wallet (/user/admin/credits) or turn on Auto-Reload."
          },
          {
            problem: "Broadcast campaign paused due to insufficient wallet balance",
            cause: "The estimated cost to send the campaign to all recipients exceeds your current wallet balance.",
            solution: "Orbion automatically checks your balance before sending a campaign to prevent partial deliveries. Top up your wallet in /user/admin/credits to cover the audience size before launching the campaign."
          }
        ]
      },
      {
        id: "support-escalation",
        title: "When to Contact Support",
        type: "checklist",
        checklistTitle: "If an issue persists after following these steps, gather the following details before opening a support ticket:",
        items: [
          "Your Workspace ID (found under Settings > Workspaces or in your dashboard URL).",
          "The affected channel (WhatsApp, Twilio, Instagram) and registered phone number.",
          "A short description of what happened or what you saw on screen.",
          "Approximate time the issue occurred along with the customer phone number.",
          "A screenshot if you see an unexpected message on your screen."
        ]
      }
    ],
    seo: {
      title: "Common Issues & Resolutions | OrbionAgents",
      description: "User guide for resolving customer care window limits, webhook synchronization, knowledge base uploads, and credit safeguards.",
      keywords: ["OrbionAgents troubleshooting", "WhatsApp customer care window", "webhook sync", "knowledge base ingestion", "human takeover safeguard"]
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
            answer: "AI Credits cover LLM inference tokens (GPT, Claude, Gemini). Meta WhatsApp Conversation Charges (WCC) cover Meta's official per-conversation rates billed directly for 24-hour service or marketing windows."
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

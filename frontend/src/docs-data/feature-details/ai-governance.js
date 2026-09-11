export const aiGovernanceDetail = {
  slug: 'ai-governance',
  aliasSlugs: ['features/ai-governance', 'account/ai-governance'],
  featureNumber: '06',
  category: 'Account & AI Safety',
  title: 'AI Governance & Safeguards (MCP)',
  tagline: 'Real-time AI guardrails: automatic response evaluation, content filtering, and human escalation.',
  description: 'AI Governance & Safeguards (MCP) is our built-in safety gatekeeper for Orbion Agents. Before an AI Agent replies to a customer on WhatsApp, Instagram, or Email, the MCP engine automatically evaluates the message against strict safety rules. It decides whether to ALLOW safe responses, BLOCK harmful or abusive content, or ESCALATE sensitive customer issues (like refunds, complaints, or high-value leads) directly to a human team member in the Omni-Channel Inbox.',
  visualKey: 'governance',
  hideVisual: true,
  hideSimulator: true,
  benefits: [
    {
      title: 'Automated Response Safety (Allow / Block / Escalate)',
      description: 'Every AI reply is evaluated before reaching the customer. Safe inquiries receive instant autonomous answers, while inappropriate or harmful messages are blocked immediately.',
      highlight: 'Zero-Risk Automation'
    },
    {
      title: 'Human Escalation for High-Value & Sensitive Inquiries',
      description: 'When a customer requests a refund, files a major complaint, or asks about custom enterprise pricing, the AI pauses and immediately escalates the conversation to your team in the Omni-Channel Inbox.',
      highlight: 'Human-in-the-Loop'
    },
    {
      title: 'Blocked Keywords & Spam Filtering',
      description: 'Filter out competitor names, prohibited words, or spam. If a user attempts prompt injection tricks or sends abusive messages, the AI safely rejects the input and stays on topic.',
      highlight: 'Brand Safety Protection'
    },
    {
      title: 'Accurate Knowledge Base Answers (Confidence Scores)',
      description: 'The AI only answers when it is confident in the information retrieved from your business Knowledge Base (RAG). If confidence is low, it connects the user to a human agent instead of guessing.',
      highlight: 'No Hallucinations'
    }
  ],
  troubleshooting: [
    {
      question: 'What does the AI Safeguard do when it cannot find an answer in my Knowledge Base?',
      answer: 'If the AI\'s confidence score is low because the answer is not in your uploaded documents, the safeguard prevents the bot from guessing or making up false details. Instead, it politely informs the customer and escalates the chat to a human team member.'
    },
    {
      question: 'How does the system handle refund requests or angry customer messages?',
      answer: 'The MCP safeguard detects sensitive keywords (like \'refund\', \'cancel\', or complaint phrases) and flags the chat as an \'Escalation\'. An alert banner appears on the conversation in your Omni-Channel Inbox so a human agent can step in immediately.'
    },
    {
      question: 'Can I prevent the AI Agent from discussing certain topics or competitors?',
      answer: 'Yes. You can configure blocked keywords in your workspace settings. If a user asks about a blocked topic or competitor, the safeguard stops the AI from promoting or discussing those terms.'
    },
    {
      question: 'How do human agents take over an escalated conversation?',
      answer: 'When a chat is escalated, your team sees an \'Escalated by AI Safeguard\' badge in the Omni-Channel Inbox. Any human agent can simply click into the chat and start typing. The AI pauses automatically until handed back.'
    },
    {
      question: 'Does the AI safeguard delay responses to customers on WhatsApp or Instagram?',
      answer: 'No. The safeguard evaluates messages in real time in memory within a fraction of a second, so customers experience seamless, instant replies.'
    }
  ]
};

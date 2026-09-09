export const aiGovernanceDetail = {
  slug: 'ai-governance',
  aliasSlugs: ['features/ai-governance', 'account/ai-governance'],
  featureNumber: '06',
  category: 'Enterprise Compliance & Safety Guardrails',
  title: 'AI Governance & Safeguards (MCP)',
  tagline: 'Pre-flight MCP tool inspection, automatic PII redaction, prompt injection defense, and immutable audit logs.',
  description: 'Enterprise AI requires strict operational guardrails. OrbionAgents AI Governance enforces runtime boundary controls on every model turn and tool execution. Inspect incoming prompts for malicious jailbreaks, automatically redact sensitive PII (credit cards, passwords, SSNs), enforce human-in-the-loop approvals on financial transactions, and maintain an immutable HMAC-signed audit log.',
  visualKey: 'governance',
  videoPlaceholder: {
    title: 'Configuring MCP Guardrails & Compliance Policies',
    description: 'Learn how to enable PII scrubbing rules, configure tool authority permissions, set human approval triggers for financial actions, and inspect the tamper-proof audit log.',
    duration: '4:05 min walkthrough'
  },
  architecture: {
    title: 'Pre-Flight Inspection & MCP Authority Boundary Pipeline',
    description: 'Every input and output token stream is inspected by deterministic guardrail engines prior to executing sensitive tools or emitting customer-facing messages.',
    stages: [
      {
        number: '01',
        name: 'Inbound Sanitization & PII Filter',
        detail: 'Redacts social security numbers, credit card sequences, and passwords before text enters the model context window.'
      },
      {
        number: '02',
        name: 'Adversarial Prompt Defense',
        detail: 'Scans for system prompt jailbreak patterns, instruction override attempts, and unauthorized delimiter injections.'
      },
      {
        number: '03',
        name: 'MCP Tool Authority Verification',
        detail: 'Evaluates tool action classification: Read-Only tools pass automatically; High-Stakes tools (refunds, deletions) require human confirmation.'
      },
      {
        number: '04',
        name: 'HMAC-Signed Audit Logging',
        detail: 'Generates a tamper-proof cryptographic audit hash recording user input, tool execution parameters, and model response.'
      }
    ]
  },
  benefits: [
    {
      title: 'Automated PII & Entity Scrubbing',
      description: 'Prevent sensitive customer data from being exposed in logs or sent to external LLM providers. Card numbers and secrets are masked automatically.',
      highlight: 'Zero sensitive data leaks'
    },
    {
      title: 'Human-in-the-Loop Financial Boundaries',
      description: 'Never let autonomous bots execute high-dollar refunds or critical database deletions without human supervisor confirmation.',
      highlight: 'Deterministic action thresholds'
    },
    {
      title: 'Robust Prompt Injection & Jailbreak Shields',
      description: 'Protect against hostile prompts like "Ignore all previous rules". Built-in heuristic and semantic defenses reject hostile inputs instantly.',
      highlight: 'Enterprise adversarial defense'
    },
    {
      title: 'Tamper-Proof HMAC Audit Trail',
      description: 'Satisfy SOC2, GDPR, and HIPAA compliance requirements with cryptographically verified records of every agent action and tool execution.',
      highlight: 'Compliance-ready verification hashes'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Navigate to AI Governance & Enable Guardrail Engine',
      description: 'Open AI Governance under Account Settings. Toggle the Master Guardrail Engine to "Active".',
      screenshotPlaceholder: {
        title: 'AI Governance Main Dashboard & Status Indicator',
        description: 'Shows Master Guardrail toggle, active rule count, blocked event counter, and compliance status badge.'
      }
    },
    {
      step: 2,
      title: 'Configure PII Scrubbing & Data Masking Rules',
      description: 'Select which entity types to mask: Credit Cards, Phone Numbers, Email Addresses, and API Keys. Choose between Anonymize (replace with [REDACTED]) or Block.',
      screenshotPlaceholder: {
        title: 'PII Redaction Rules & Entity Checklist',
        description: 'Shows entity type checkboxes, replacement pattern selectors, and live sample test field.'
      }
    },
    {
      step: 3,
      title: 'Define MCP Tool Authority & Human Confirmation Rules',
      description: 'Classify your attached MCP tools. Set read tools (e.g. search_faq) to Autonomous, and write/financial tools (e.g. issue_refund) to "Requires Human Approval".',
      screenshotPlaceholder: {
        title: 'MCP Tool Permission Matrix & Approval Triggers',
        description: 'Shows list of registered MCP tools with permission badges (Autonomous, Challenge, Blocked).'
      }
    },
    {
      step: 4,
      title: 'Review Audit Logs & Incident Reports',
      description: 'Inspect the live Compliance Audit Trail. View flagged adversarial attempts, intercepted tool executions, and approving supervisor timestamps.',
      screenshotPlaceholder: {
        title: 'Audit Trail Inspector with Cryptographic Hashes',
        description: 'Shows tabular audit log with timestamp, event type, verdict (ALLOWED/BLOCKED), and HMAC hash.'
      }
    }
  ],
  useCases: [
    {
      title: 'Regulated Financial & Insurance Inquiries',
      scenario: 'Agents handling sensitive financial inquiries containing bank account numbers and account balances.',
      solution: 'PII scrubber masks account digits in transit, while MCP guards prevent any unauthenticated balance modifications.'
    },
    {
      title: 'Public-Facing Brand Safety & Jailbreak Protection',
      scenario: 'Adversarial users attempting prompt injection attacks to make the brand bot say offensive statements.',
      solution: 'Pre-flight heuristic filter catches override keywords, shuts down the session, and serves a neutral pre-approved fallback message.'
    },
    {
      title: 'E-Commerce Return & Refund Safeguards',
      scenario: 'Customer demanding an instant $500 refund via WhatsApp chat.',
      solution: 'Agent gathers return reasons and submits an approval ticket. The refund tool remains locked until an authorized manager clicks "Approve".'
    }
  ],
  expectedOutcome: '100% compliant and brand-safe AI operations, zero unauthorized tool executions, and full compliance readiness for enterprise audits.',
  troubleshooting: [
    {
      question: 'Why was a legitimate customer inquiry flagged as a prompt injection?',
      answer: 'Check the sensitivity slider under Jailbreak Defense. If set to "Extreme", technical queries mentioning code or system instructions might trigger false positives. Dialing it back to "Balanced" resolves this while keeping strong protection.'
    },
    {
      question: 'Where do human approval requests appear?',
      answer: 'Approval requests appear as prominent banner alerts at the top of the Omni-Channel Inbox and can also dispatch push notifications or Slack webhooks to managers.'
    },
    {
      question: 'Are audit logs retained permanently?',
      answer: 'Standard plans retain logs for 90 days. Enterprise plans include permanent encrypted storage and automated S3/GCS bucket exports.'
    }
  ]
};

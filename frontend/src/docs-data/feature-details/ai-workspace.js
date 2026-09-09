export const aiWorkspaceDetail = {
  slug: 'ai-workspace',
  aliasSlugs: ['features/ai-workspace'],
  featureNumber: '03',
  category: 'Autonomous Agent Engineering',
  title: 'AI Workspace & Agent Studio',
  tagline: 'Design, test, and deploy intelligent autonomous agents with custom system prompts, temperature controls, and MCP tool attachments.',
  description: 'The AI Workspace is your mission control for creating domain-specific AI agents. Configure personality instructions, select optimal LLM foundations (OpenAI GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Flash), bind external tools via Model Context Protocol (MCP), and simulate multi-turn interactions in an integrated live debugger before publishing.',
  visualKey: 'workspace',
  videoPlaceholder: {
    title: 'Building an Autonomous Agent in Agent Studio',
    description: 'Watch how to write a persona system prompt, attach database search tools, test live streaming output, and inspect function arguments in the debug inspector.',
    duration: '5:20 min walkthrough'
  },
  architecture: {
    title: 'Agent Studio Execution & Tool Calling Loop',
    description: 'Agents operate within a structured prompt-eval-act cycle. The LLM receives customer context and tool schemas, chooses an action, executes the tool via MCP, and synthesizes a natural answer.',
    stages: [
      {
        number: '01',
        name: 'Persona & System Directives',
        detail: 'Core behavioral constraints, tone of voice, allowed actions, and boundary guidelines are compiled into the system context.'
      },
      {
        number: '02',
        name: 'MCP Tool Schema Registration',
        detail: 'External APIs (CRM lookups, order tracking, calendar booking) are exposed as JSON Schema function declarations.'
      },
      {
        number: '03',
        name: 'Function Calling & Argument Parsing',
        detail: 'The model deterministically decides whether a tool is required and emits structured parameters with strict validation.'
      },
      {
        number: '04',
        name: 'Output Synthesis & Safety Filter',
        detail: 'The tool execution result is synthesized into conversational language and passed through output guardrails before delivery.'
      }
    ]
  },
  benefits: [
    {
      title: 'Multi-Model Freedom & Flexibility',
      description: 'Switch between GPT-4o for complex multi-step reasoning, Claude 3.5 Sonnet for deep document synthesis, or Gemini Flash for ultra-fast low-cost routing.',
      highlight: 'GPT-4o, Claude 3.5 Sonnet & Gemini Flash'
    },
    {
      title: 'Native MCP (Model Context Protocol) Tools',
      description: 'Connect agents to live databases, internal REST APIs, and third-party SaaS services without writing custom boilerplate integration glue.',
      highlight: 'Standardized tool integration'
    },
    {
      title: 'Interactive Studio Playground & Debugger',
      description: 'Simulate live conversations in the browser. Inspect raw token streaming, JSON tool call payloads, and latency breakdowns in real time.',
      highlight: 'Live inspector & token streaming'
    },
    {
      title: 'Version Control & Rollback Safety',
      description: 'Save prompt drafts, compare diffs across iterations, and revert to previous prompt configurations instantly if testing shows regressions.',
      highlight: 'Prompt versioning & audit logs'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Initialize a New Agent in Agent Studio',
      description: 'Navigate to AI Workspace > Agents > Create Agent. Choose a starting template (Customer Support Specialist, Lead Qualifier, or Technical Concierge) or start with a blank slate.',
      screenshotPlaceholder: {
        title: 'Agent Creation Template Selector',
        description: 'Shows pre-configured agent templates with predefined system prompts and recommended toolsets.'
      }
    },
    {
      step: 2,
      title: 'Craft the System Prompt & Behavioral Boundaries',
      description: 'In the Left Editor, write your core instructions. Use clear markdown headers for "Identity", "Operating Guidelines", and "Strict Negative Constraints" (e.g. "Never discuss competitors").',
      screenshotPlaceholder: {
        title: 'System Prompt Editor & Parameter Sliders',
        description: 'Shows markdown system prompt text area alongside Model selector, Temperature slider, and Max Tokens input.'
      }
    },
    {
      step: 3,
      title: 'Attach Tools & Knowledge Collections',
      description: 'Click the "Tools" tab to enable MCP servers (e.g., Order Lookup, Stripe Balance, Calendar Slots). In the "Knowledge" tab, bind your previously uploaded AI Brain collections.',
      screenshotPlaceholder: {
        title: 'Tool & Knowledge Source Binding Modal',
        description: 'Shows active tool cards with toggle switches and permission level selectors (Read-Only vs Write-Action).'
      }
    },
    {
      step: 4,
      title: 'Test in Playground & Publish to Channels',
      description: 'Engage with the agent in the right-hand simulation chat. Watch the Inspector tab to verify tool arguments. When confident, click "Publish" to deploy the agent to your active channels.',
      screenshotPlaceholder: {
        title: 'Studio Debug Playground & Live Inspector',
        description: 'Shows chat message on right, tool execution JSON block below, and the green "Publish to Production" button.'
      }
    }
  ],
  useCases: [
    {
      title: 'E-Commerce Order & Shipping Concierge',
      scenario: 'Customers asking "Where is my parcel?" and providing tracking codes or order numbers.',
      solution: 'Agent executes an `order.lookup` tool against Shopify/WooCommerce, retrieves tracking status, and sends a clear update with estimated delivery.'
    },
    {
      title: 'SaaS Technical Support & Setup Guide',
      scenario: 'Developers asking API questions, error message troubleshooting, or code snippet examples.',
      solution: 'Agent references API documentation from AI Brain, formats code blocks accurately, and verifies schema syntax before replying.'
    },
    {
      title: 'Automated Consultation Scheduling',
      scenario: 'Prospects wanting to book a discovery call or product demo.',
      solution: 'Agent checks calendar availability via Google Calendar / Cal.com tool, proposes 3 open slots, and creates the calendar event once agreed.'
    }
  ],
  expectedOutcome: 'Deploy reliable autonomous agents that strictly follow brand instructions, execute external tools accurately, and operate 24/7 with zero downtime.',
  troubleshooting: [
    {
      question: 'Why is the agent answering in an overly informal or overly robotic tone?',
      answer: 'Adjust the Temperature slider in your agent configuration. A temperature of 0.2 produces consistent, concise responses. Also explicitly specify your desired tone in the System Prompt (e.g. "Professional, friendly, and concise").'
    },
    {
      question: 'What happens if a tool execution fails or times out?',
      answer: 'Agent Studio includes automatic error handling. If a tool fails, the error message is fed back to the model, which gracefully informs the user and offers an alternative or human handoff.'
    },
    {
      question: 'Can one agent call another agent?',
      answer: 'Yes! Using Automation Wire (Flow Builder), you can set up supervisor agents that delegate specific sub-tasks to specialized domain agents.'
    }
  ]
};

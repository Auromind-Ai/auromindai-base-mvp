export const aiWorkspaceDetail = {
  slug: 'ai-workspace',
  aliasSlugs: ['features/ai-workspace'],
  featureNumber: '03',
  category: 'Conversational AI & Copilot',
  title: 'AI Workspace & Smart Copilot',
  tagline: 'Multi-model conversational workspace with real-time streaming, Brain RAG knowledge search, and multi-modal document analysis.',
  description: 'The AI Workspace is your dedicated command center for business intelligence, internal knowledge lookup, and drafting enterprise communications. Dynamically switch between top foundation models (Auto, Groq, Claude 3.5 Sonnet, Claude Opus, Gemini Flash), scope answers to your verified AI Brain documents, email threads, or web search, and attach PDF/image files for instant deep analysis.',
  visualKey: 'workspace',
  videoPlaceholder: {
    title: 'Navigating the AI Workspace & Multi-Model Copilot',
    description: 'Watch how to switch models, filter knowledge sources between Brain RAG and live web search, attach documents for instant summary, and manage chat sessions.',
    duration: '3:45 min walkthrough'
  },
  architecture: {
    title: 'AI Workspace RAG & Execution Pipeline',
    description: 'Every prompt flows through a governed execution pipeline: preflight credit verification, dynamic context retrieval from Brain RAG or selected sources, LLM model routing, and token-by-token NDJSON streaming.',
    stages: [
      {
        number: '01',
        name: 'Prompt Intake & Source Filtering',
        detail: 'Captures user query, active session ID, attached PDF/image documents, and scoped source filters (All Sources, Brain RAG, Email, or Web Search).'
      },
      {
        number: '02',
        name: 'Preflight & Credit Reservation',
        detail: 'Backend validates workspace subscription tier (Free vs. Pro/Enterprise), checks model entitlement, and temporarily reserves estimated token credits.'
      },
      {
        number: '03',
        name: 'Context Retrieval & LLM Routing',
        detail: 'Retrieves semantic vector embeddings from AI Brain pgvector if scoped, injects document context into system directives, and routes to the selected LLM provider (Groq, Anthropic, Gemini).'
      },
      {
        number: '04',
        name: 'NDJSON Streaming & Client Animation',
        detail: 'LLM emits application/x-ndjson token chunks streamed directly to the browser with dynamic typewriter pacing and instant stop controls.'
      }
    ]
  },
  benefits: [
    {
      title: 'Multi-Model Intelligence on Demand',
      description: 'Switch between lightning-fast Groq inference, balanced Claude 3.5 Sonnet reasoning, deep-thinking Claude Opus, or cost-efficient Gemini Flash depending on task complexity.',
      highlight: 'Auto, Groq, Sonnet, Opus & Gemini'
    },
    {
      title: 'Context-Scoped Knowledge Sources',
      description: 'Eliminate hallucinations by scoping queries strictly to your uploaded AI Brain knowledge base, synced email communications, real-time web search, or all sources combined.',
      highlight: 'Brain RAG, Email & Live Web'
    },
    {
      title: 'Multi-Modal Document & OCR Parsing',
      description: 'Attach contracts, technical specifications, financial reports, or screenshots directly into the prompt bar for instant summarization and data extraction.',
      highlight: 'PDF & Image Analysis'
    },
    {
      title: 'Persistent Session History & Instant Controls',
      description: 'Preserve dedicated conversation threads per project with auto-naming, instant generation interruption (Stop button), one-click copy, and response quality feedback.',
      highlight: 'Sessions & Stop Stream'
    }
  ],
  beforeYouStart: [
    {
      title: 'Active Workspace & User Account',
      description: 'Log in to your account and verify that you are within the intended active workspace from the top navigation.'
    },
    {
      title: 'Ingest Reference Documents into AI Brain (Optional)',
      description: 'If you require the copilot to cite proprietary company knowledge or SOPs, upload relevant PDFs or URLs into AI Brain (/user/admin/brain).'
    },
    {
      title: 'Verify Plan Model Access',
      description: 'Auto, Fast (Groq), and Smart (Sonnet) are accessible on Free tier. Deep (Opus) and Flash (Gemini) are unlocked on Pro and Enterprise subscriptions.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      stage: 'Step 1 — Open the Workspace',
      title: 'Navigate to AI Workspace',
      description: 'From the main navigation sidebar, click "AI Workspace" (/user/admin/ai) to launch the full-screen copilot environment.',
      details: 'Your previous conversations automatically load in the collapsible sessions sidebar.'
    },
    {
      step: 2,
      stage: 'Step 2 — Select AI Foundation Model',
      title: 'Choose Your LLM Engine',
      description: 'Click the model selector pill above the prompt input to switch between ✨ Auto, ⚡ Fast (Groq), 🧠 Smart (Sonnet), 🧪 Deep (Opus), or 💡 Flash (Gemini).',
      details: 'Auto dynamically selects the most efficient model based on query complexity and available plan tier.'
    },
    {
      step: 3,
      stage: 'Step 3 — Scope Knowledge Source & Attach Files',
      title: 'Select Context Source or Attach Documents',
      description: 'Click the source button to filter context: "All Sources", "Documents" (Brain RAG), "Email", or "Web Search". Click the paperclip icon to attach PDF or image files.',
      details: 'Note: If attaching images, select Sonnet or Gemini; Groq is text-specialized and will prompt to detach image files.'
    },
    {
      step: 4,
      stage: 'Step 4 — Prompt & Stream',
      title: 'Submit Prompt & Monitor Real-Time Streaming',
      description: 'Type your instruction or choose a quick-start starter card (e.g. "Meeting agenda", "Analyze PDFs"). Watch tokens stream with real-time typewriter effect.',
      details: 'Click the square "Stop" button at any point to halt generation immediately and conserve token credits.'
    },
    {
      step: 5,
      stage: 'Step 5 — Manage Sessions',
      title: 'Organize History & Project Threads',
      description: 'Click the "+" button or "New Chat" in the sidebar to start a clean thread. Switch between past topics, rename session headers, or delete completed investigations.',
      details: 'All conversation histories are securely partitioned and preserved per workspace.'
    }
  ],
  tips: [
    {
      title: 'Match Model to Query Complexity',
      description: 'Use ⚡ Fast (Groq) for rapid drafts and everyday questions. Choose 🧠 Smart (Sonnet) or 🧪 Deep (Opus) for nuanced logic, contract verification, and high-accuracy analysis.'
    },
    {
      title: "Scope to 'Documents' to Prevent Hallucinations",
      description: "When querying internal policies, product specifications, or company pricing, set the source strictly to 'Documents' to enforce pure Brain RAG grounding."
    },
    {
      title: 'Use High-Resolution Images for OCR',
      description: 'When extracting text from invoices or diagrams, upload clear, uncompressed PNG/JPG files and pair with multimodal models (Sonnet or Gemini) for accurate OCR.'
    }
  ],
  useCases: [
    {
      title: 'Vendor Contract & Compliance Audit',
      scenario: 'Legal or operations teams need to extract termination clauses, indemnity liabilities, and SLA penalties from a 35-page PDF agreement.',
      solution: 'Attach the PDF agreement, select "Documents" source, and ask the copilot to extract specific legal clauses with page references.'
    },
    {
      title: 'Internal Policy & Customer Support Grounding',
      scenario: 'Support reps answering complex questions about enterprise return policies, custom warranty coverage, or shipping exemptions.',
      solution: 'Copilot queries the company AI Brain vector database and provides verified, policy-compliant responses with zero fabricated statements.'
    },
    {
      title: 'Executive Meeting Agenda & Broadcast Drafting',
      scenario: 'Product managers needing to summarize recent release notes into an executive presentation outline and team broadcast.',
      solution: 'Select Smart (Sonnet) or Auto model with the "Meeting agenda" quick-start template to synthesize key milestones and action items into a clean markdown format.'
    }
  ],
  expectedOutcome: 'An intelligent, ultra-responsive conversational workspace that delivers grounded business answers from your verified documents, emails, and multi-model LLMs with real-time streaming and complete session management.',
  troubleshooting: [
    {
      question: 'Why was my attached image removed when I switched to Groq?',
      answer: 'Groq is an ultra-fast text-only inference model. The workspace automatically detaches images and alerts you to switch to multimodal models such as Claude 3.5 Sonnet or Gemini Flash for vision and image OCR analysis.'
    },
    {
      question: 'Why does a plan upgrade modal appear when selecting Claude Opus or Gemini Flash?',
      answer: 'Claude Opus (Deep) and Gemini Flash (Pro) are premium models reserved for Pro and Enterprise workspace plans. Free tier workspaces have full access to Auto, Fast (Groq), and Smart (Sonnet).'
    },
    {
      question: 'How do I stop a long or off-track response from consuming tokens?',
      answer: 'Click the square "Stop" button located in the prompt bar while generation is in progress. The streaming request is immediately aborted on both the server and client, stopping further token consumption.'
    }
  ]
};

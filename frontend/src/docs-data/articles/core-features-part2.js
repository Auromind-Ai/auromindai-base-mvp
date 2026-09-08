export const CORE_FEATURES_PART2 = {
  "features/conditional-logic": {
    slug: "features/conditional-logic",
    category: "Core Features",
    title: "Conditional Logic & Decision Nodes",
    subtitle: "Dynamic branching based on customer input keywords, urgency, sentiment, and qualification rules.",
    readTime: "6 min read",
    lastUpdated: "April 2026",
    video: {
      url: "/docs/videos/conditional-logic.mp4",
      title: "Decision Nodes: Conditional Branching & Urgency Routing",
      duration: "0:09",
      caption: "Examine the DECISION node checking 'IF urgency contains yes' branching into YES (Fast Options) vs NO (Regular Flow)."
    },
    whatIsIt: "Decision Nodes are conditional branching splitters inside the Agentic Orchestrator. When a customer sends a message or answers a question, the Decision Node evaluates rules (e.g., contains keyword, equals value, urgency match, or sentiment threshold) and immediately routes the conversation down the matching branch.",
    whyUseIt: "Not all customers have the same needs. A lead signaling high urgency ('I need this today!') should receive expedited options or an immediate call link, while a casual visitor should enter an educational nurturing flow. Decision nodes allow intelligent, automated segmentation without human intervention.",
    beforeYouStart: [
      "An existing flow in the Orchestrator with an upstream step that collects user input (such as an inquiry question or form)."
    ],
    steps: [
      {
        step: 1,
        title: "Add a Decision Node to the Canvas",
        instruction: "Right-click on the Orchestrator canvas or click '+ Add Step' and select node type = 'Condition / Decision'.",
        uiElements: ["Canvas context menu", "'Condition / Decision' node type", "Green/Dark decision card"]
      },
      {
        step: 2,
        title: "Define the Evaluation Rule",
        instruction: "Click on the Decision node to open the inspector. Under 'CONDITION', configure the variable or field to check (e.g., 'urgency' or 'user_reply') and the comparison operator ('contains', 'equals', 'starts with').",
        uiElements: ["'CONDITION' rule editor", "Variable name field", "Operator dropdown", "Target value input (e.g. 'yes')"]
      },
      {
        step: 3,
        title: "Configure Branch Ports (YES / NO)",
        instruction: "Notice the distinct branch ports on the right edge: green for 'YES' (condition met) and red for 'NO' (fallback default).",
        uiElements: ["Green 'YES' handle", "Red 'NO' handle"]
      },
      {
        step: 4,
        title: "Connect Destination Action Steps",
        instruction: "Wire the 'YES' port to your high-priority step (e.g., 'Fast Options: Expedited Delivery') and the 'NO' port to your nurturing step (e.g., 'Regular Flow: We have regular options available 🗂️').",
        uiElements: ["Target action node 'Fast Options'", "Target action node 'Regular Flow'", "Connecting cables"]
      },
      {
        step: 5,
        title: "Test with Sample Inbound Text",
        instruction: "Click the node 'Preview' button and enter sample inputs ('yes', 'asap', 'no') to verify that the conditional splitter routes correctly.",
        uiElements: ["'Preview' simulation box", "Branch match highlight", "'Sync Wire' button"]
      }
    ],
    screenshots: [
      {
        src: "/docs/screenshots/wires-decision-node.png",
        alt: "Decision Node Conditional Branching in Wires",
        caption: "Decision node evaluating 'IF urgency contains yes' branching to Fast Options vs Regular Flow."
      }
    ],
    expectedResult: "The flow automatically segments incoming customer dialogues based on exact keyword or sentiment criteria with zero manual triage.",
    tips: [
      "Use comma-separated values in the condition value field (e.g., 'yes, urgent, today, asap') to catch natural language variations.",
      "Always connect the 'NO' fallback branch to ensure no customer inquiry hits a dead end."
    ],
    troubleshooting: [
      {
        issue: "Condition evaluates to 'NO' even when the user typed 'Yes'?",
        solution: "Check if your rule has case sensitivity enabled. By default, OrbionAgents condition matching is case-insensitive, but exact string equality requires exact matches."
      }
    ],
    seo: {
      title: "Conditional Logic & Decision Nodes | OrbionAgents",
      description: "How to use decision nodes and conditional branching in OrbionAgents to segment customer conversations automatically.",
      keywords: ["conditional logic", "decision node", "bot branching", "lead qualification rules"]
    }
  },

  "features/interactive-menus": {
    slug: "features/interactive-menus",
    category: "Core Features",
    title: "Interactive Button Menus & Bots",
    subtitle: "Create WhatsApp interactive button menus, e-commerce catalog flows, and guided customer paths.",
    readTime: "6 min read",
    lastUpdated: "April 2026",
    video: {
      url: "/docs/videos/ecommerce-bot.mp4",
      title: "Interactive Menus: E-Commerce Catalog & Service Routing",
      duration: "0:11",
      caption: "Interactive button menus with options like 'Browse Products 🛍️', 'My Orders 📦', and 'Support 💬' branching to dedicated sub-flows."
    },
    whatIsIt: "Interactive Button Menus present customers on WhatsApp and Instagram with clean clickable options (up to 3 interactive reply buttons or 10 list menu items) instead of requiring them to type text. Clicking a button triggers an instant, deterministic action step.",
    whyUseIt: "Clickable buttons increase customer response rates by over 60% compared to open-ended text questions. They eliminate typing typos, reduce friction on mobile screens, and ensure that customers discover products, check orders, or request support effortlessly.",
    beforeYouStart: [
      "A WhatsApp Cloud API or Instagram Business integration connected to your workspace.",
      "An active flow in the Agentic Orchestrator."
    ],
    steps: [
      {
        step: 1,
        title: "Add a Message Step to Your Flow",
        instruction: "Select or add an Action node on the canvas and set Action Type = 'Send Message'.",
        uiElements: ["'Action Type' dropdown", "'Send Message' option"]
      },
      {
        step: 2,
        title: "Switch Message Type to Interactive Buttons",
        instruction: "Under 'Message Type', choose 'Interactive Buttons' (or 'List Menu' for > 3 items).",
        uiElements: ["'Message Type' selector", "'Interactive Buttons' option"]
      },
      {
        step: 3,
        title: "Add Button Titles and Payload Identifiers",
        instruction: "Click '+ Add Button'. Enter the visible button title (e.g., 'Browse Products 🛍️', 'My Orders 📦', 'Support 💬') and unique payload identifier.",
        uiElements: ["'+ Add Button' link", "Button title inputs", "Payload fields"]
      },
      {
        step: 4,
        title: "Connect Each Button to Its Respective Sub-Flow",
        instruction: "Notice that each button creates its own dedicated output port on the node card. Connect each port to its corresponding sub-flow node.",
        uiElements: ["Individual button handles", "Destination nodes: 'Products', 'Orders', 'AI Support'"]
      },
      {
        step: 5,
        title: "Preview the Mobile Rendering",
        instruction: "Click 'Preview' to see how the WhatsApp interactive bubble looks on an iOS/Android smartphone screen, then click 'Sync Wire'.",
        uiElements: ["WhatsApp Preview Modal", "Clickable simulated buttons", "'Sync Wire' button"]
      }
    ],
    screenshots: [
      {
        src: "/docs/screenshots/wires-ecommerce-menu.png",
        alt: "Interactive Button Menu in Agentic Orchestrator",
        caption: "Main Menu node branching to Browse Products, My Orders, and Support sub-flows."
      }
    ],
    expectedResult: "Customers receive native WhatsApp interactive buttons. Clicking any option immediately advances the conversation to the intended sub-flow.",
    tips: [
      "Meta allows a maximum of 20 characters per button title on WhatsApp. Keep button labels punchy and add emojis for visual clarity.",
      "Always include an 'Other / Help' button so users seeking custom assistance are not trapped."
    ],
    troubleshooting: [
      {
        issue: "WhatsApp buttons fail to deliver and appear as plain text?",
        solution: "Ensure your WhatsApp Business Account has approved interactive messaging permissions and that message body text is not blank."
      }
    ],
    seo: {
      title: "Interactive Button Menus & Bots | OrbionAgents",
      description: "Build WhatsApp interactive reply buttons and list menus for e-commerce, catalog browsing, and service bots.",
      keywords: ["WhatsApp buttons", "interactive menus", "e-commerce chatbot", "quick replies"]
    }
  },

  "features/brain-rag": {
    slug: "features/brain-rag",
    category: "Core Features",
    title: "AI Brain (RAG & Knowledge Base)",
    subtitle: "Ingest company PDFs, sync live web URLs, and crawl sitemaps with pgvector embeddings.",
    readTime: "7 min read",
    lastUpdated: "May 2026",
    whatIsIt: "The AI Brain (/user/admin/brain) is your workspace's cognitive knowledge store. It uses a high-performance pgvector embedding pipeline that segments your business documents, policy manuals, product catalogs, and website pages into semantically searchable vectors.",
    whyUseIt: "LLMs by themselves do not know your private business pricing, internal policies, or up-to-date catalog specs. By grounding the AI in your Brain, every agent answer is retrieved directly from verified sources, eliminating hallucinations and ensuring factual compliance.",
    beforeYouStart: [
      "Company collateral in PDF, DOCX, CSV, or TXT format (max 50MB per file).",
      "Or a public website URL / sitemap link."
    ],
    steps: [
      {
        step: 1,
        title: "Open the Brain Tab",
        instruction: "Click on 'Brain' in the left-hand navigation sidebar (/user/admin/brain).",
        uiElements: ["'Brain' menu item with Brain icon", "Knowledge stats counter (Indexed Chunks, Total Entries)"]
      },
      {
        step: 2,
        title: "Choose Ingestion Method",
        instruction: "Select between 'Upload Document', 'Sync URL', or 'Crawl Website / Sitemap'.",
        uiElements: ["'Upload Document' dropzone", "'Sync URL' input field", "'Crawl Sitemap' toggle"]
      },
      {
        step: 3,
        title: "Upload or Enter URL",
        instruction: "Drag and drop your file into the dropzone, or paste your HTTPS URL and click 'Ingest Knowledge'.",
        uiElements: ["File selector", "Upload progress bar", "'Ingest Knowledge' button"]
      },
      {
        step: 4,
        title: "Monitor Real-Time Chunking & Vectorization",
        instruction: "Watch the entry status transition from 'Pending' -> 'Processing' -> 'Ready'. The table displays the exact number of vectorized chunks generated.",
        uiElements: ["Status badge ('Ready' in green)", "Indexed Chunks counter", "File progress bar"]
      },
      {
        step: 5,
        title: "Test Retrieval in AI Workspace",
        instruction: "Switch to 'AI Workspace' (/user/admin/ai) and ask a question that can only be answered by the document you just uploaded to confirm high-confidence retrieval.",
        uiElements: ["AI Workspace query box", "Source chunk preview"]
      }
    ],
    screenshots: [
      {
        src: "/images/ai-brain-hero.webp",
        alt: "OrbionAgents AI Brain RAG Knowledge Ingestion",
        caption: "Brain Knowledge Base indexing documents, URLs, and sitemaps into vector embeddings."
      }
    ],
    expectedResult: "Your documents are tokenized, embedded with vector models, stored in pgvector, and instantly retrievable by all live conversational agents.",
    tips: [
      "For structured product pricing, CSV format provides the highest retrieval precision.",
      "Re-sync website URLs whenever you publish changes to your marketing or pricing pages."
    ],
    troubleshooting: [
      {
        issue: "Document status shows 'Failed'?",
        solution: "Ensure the PDF is not password-protected and contains extractable text (scanned image-only PDFs require OCR before upload)."
      },
      {
        issue: "URL crawling stops after 5 pages?",
        solution: "Check your workspace plan limits. Free plans allow up to 10 pages per crawl, while Pro and Enterprise plans allow up to 500 pages."
      }
    ],
    seo: {
      title: "AI Brain (RAG & Knowledge Base) | OrbionAgents",
      description: "Ground conversational agents in your company data using OrbionAgents pgvector RAG Brain with document and URL ingestion.",
      keywords: ["RAG knowledge base", "AI Brain", "pgvector", "document ingestion", "sitemap crawling"]
    }
  },

  "features/omni-inbox": {
    slug: "features/omni-inbox",
    category: "Core Features",
    title: "Omni-Inbox & Human Takeover",
    subtitle: "Unified multi-channel inbox across WhatsApp, Instagram, and Web with 1-click human intervention.",
    readTime: "7 min read",
    lastUpdated: "June 2026",
    whatIsIt: "The Omni-Inbox (/user/admin/inbox) is a real-time collaborative inbox uniting all customer conversations from WhatsApp, Instagram DMs, Twilio SMS, and Webchat into a single unified stream. It features instant WebSocket synchronization, audio voice note recording, and automated agent-to-human escalation.",
    whyUseIt: "Switching between WhatsApp Web, Meta Business Suite, and email causes missed messages and sluggish response times. Omni-Inbox provides a single cockpit for your entire support and sales staff with transparent AI co-piloting and instant human takeover whenever complex negotiation is needed.",
    beforeYouStart: [
      "At least one messaging channel connected.",
      "Browser notification and audio permissions enabled for incoming message chimes."
    ],
    steps: [
      {
        step: 1,
        title: "Open the Omni-Inbox",
        instruction: "Click on 'Omni-Inbox' in the left-hand sidebar navigation (/user/admin/inbox).",
        uiElements: ["'Omni-Inbox' menu item with MessageSquare icon", "Unread badge counter"]
      },
      {
        step: 2,
        title: "Filter by Channel or Conversation Status",
        instruction: "Use the top channel filter pills (WhatsApp, Instagram, Twilio, All) and status tabs ('Open', 'Converted', 'Closed') to locate specific dialogues.",
        uiElements: ["Channel filter buttons", "Status tabs ('Open', 'Converted', 'Closed')", "Search bar"]
      },
      {
        step: 3,
        title: "Select a Conversation Thread",
        instruction: "Click on any conversation card in the left list to view the full chat history, message timestamps, delivery tick marks, and customer details.",
        uiElements: ["Conversation list card", "Message stream pane", "Contact sidebar (Name, Phone, Lead Tier)"]
      },
      {
        step: 4,
        title: "Toggle Human Takeover vs AI Agent",
        instruction: "Look at the header toggle bar. Click 'Pause AI / Human Takeover' when you want to intervene. The AI stops answering automatically, giving you exclusive control to type or record voice notes.",
        uiElements: ["'AI Active' / 'Human Takeover' switch", "Takeover banner notification", "Text input / Mic icon"]
      },
      {
        step: 5,
        title: "Convert to Lead or Close Thread",
        instruction: "Once the inquiry is resolved, click 'Convert to Lead' to save the contact into your CRM pipeline, or click 'Close Conversation' to archive.",
        uiElements: ["'Convert to Lead' button", "'Close Conversation' button", "Canned responses dropdown"]
      }
    ],
    screenshots: [
      {
        src: "/images/inbox-hero.webp",
        alt: "Omni-Inbox Multi-Channel Chat Cockpit",
        caption: "Unified multi-channel inbox with real-time streaming, human takeover, and contact details."
      }
    ],
    expectedResult: "Effortless, seamless collaboration where AI handles 80% of routine questions, and human agents step in instantly for high-value negotiations.",
    tips: [
      "Press '/' in the message input field to trigger pre-saved canned responses and quick reply templates.",
      "Leave internal notes on customer profiles in the right sidebar so other team members have context during shifts."
    ],
    troubleshooting: [
      {
        issue: "Incoming WhatsApp messages do not appear in the inbox?",
        solution: "Verify that your Meta Cloud API webhook URL and verify token are active and returning HTTP 200 responses in Meta App Dashboard."
      },
      {
        issue: "Sound notification does not play when a new message arrives?",
        solution: "Click anywhere on the page to activate browser audio autoplay policies and check your computer's speaker volume."
      }
    ],
    seo: {
      title: "Omni-Inbox & Human Takeover | OrbionAgents",
      description: "Manage WhatsApp, Instagram, and SMS conversations in one unified inbox with real-time human takeover.",
      keywords: ["Omni-Inbox", "unified messaging", "human takeover", "WhatsApp shared inbox", "customer support cockpit"]
    }
  }
};

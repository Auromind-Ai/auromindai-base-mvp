export const CORE_FEATURES_PART2 = {
  "features/conditional-logic": {
    slug: "features/conditional-logic",
    category: "Core Features",
    title: "Conditional Logic & Decision Nodes",
    subtitle: "Dynamic branching based on customer input keywords, urgency, sentiment, and qualification rules.",
    pageType: "workflow",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "Decision Nodes are conditional branching splitters inside the visual canvas. When a customer sends a message or responds to a prompt, the Decision Node evaluates rules (e.g. contains keyword, matches regex, sentiment threshold, or lead score value) and immediately routes execution down the matching branch."
      },
      {
        id: "rule-types",
        title: "Supported Operators & Match Types",
        type: "list",
        items: [
          { title: "String Matching", description: "'contains', 'equals', 'starts_with', or 'case_insensitive_regex' against customer text." },
          { title: "Numerical Scoring", description: "Evaluates extracted budget or lead scores (e.g. 'lead_score >= 80' for Hot Leads)." },
          { title: "Temporal Conditions", description: "Checks whether the interaction occurs during business hours or on weekends." },
          { title: "Boolean Flags", description: "Inspects customer tags in CRM (e.g. 'is_vip_customer == true')." }
        ]
      },
      {
        id: "step-by-step",
        title: "Configuring a Decision Node",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Place Decision Node on Canvas",
            instruction: "Add a new node and select type 'Condition / Decision'. Place it downstream from an inquiry step.",
            uiElements: ["Node library", "'Condition / Decision' node card"]
          },
          {
            step: 2,
            title: "Configure Condition Parameters",
            instruction: "In the node inspector, specify the variable name (e.g. 'urgency'), select the operator ('contains'), and target value ('yes').",
            uiElements: ["Variable selector", "Operator dropdown", "Target value input"]
          },
          {
            step: 3,
            title: "Wire Branch Output Ports",
            instruction: "Notice the two distinct ports: green for YES (condition satisfied) and red for NO (fallback default). Wire each to its respective next step.",
            uiElements: ["Green YES port", "Red NO port", "Target action cards"]
          },
          {
            step: 4,
            title: "Simulate & Verify",
            instruction: "Use the canvas simulation runner with sample user replies ('yes', 'asap', 'no') to verify that branches activate accurately.",
            uiElements: ["Simulation test runner", "Active branch visual highlight"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Branching Verified:",
        calloutText: "Customer conversations are routed down the appropriate journey based on real-time evaluation with sub-second execution."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "User input 'YES' fails condition 'yes'?",
            cause: "Condition was configured with case-sensitive matching.",
            solution: "Change the match operator to 'contains (case insensitive)' to handle varied capitalization from mobile keypads."
          }
        ]
      }
    ],
    seo: {
      title: "Conditional Logic & Decision Nodes | OrbionAgents",
      description: "Branching workflows based on user intent, keywords, sentiment, or urgency detection in OrbionAgents.",
      keywords: ["decision nodes", "conditional logic", "workflow branching", "if else bot rules"]
    }
  },

  "features/interactive-menus": {
    slug: "features/interactive-menus",
    category: "Core Features",
    title: "Interactive Button Menus & Bots",
    subtitle: "Deliver native WhatsApp interactive quick-reply buttons and multi-choice list pickers.",
    pageType: "conversation",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "Interactive menus replace manual text typing with structured WhatsApp and Instagram UI elements. By sending native quick-reply buttons (up to 3 per message) or multi-choice list pickers (up to 10 options), customers tap to choose their intent, drastically reducing response friction and typos."
      },
      {
        id: "menu-types",
        title: "Supported Interactive Elements",
        type: "list",
        items: [
          { title: "Quick-Reply Buttons", description: "Up to 3 high-contrast clickable buttons for binary or short selections (e.g. Yes / No / Talk to Human)." },
          { title: "List Pickers", description: "Structured popup menu supporting up to 10 categorized rows with titles and descriptions." },
          { title: "Call-to-Action (CTA) Buttons", description: "Direct URL links or one-tap phone call buttons." },
          { title: "Product Catalog Cards", description: "Multi-product catalog items synced from Facebook Commerce Manager." }
        ]
      },
      {
        id: "step-by-step",
        title: "Adding Buttons to a Workflow Node",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Select Node & Set Message Type",
            instruction: "Click on any action node in Wires. In the inspector, set Message Type to 'Interactive Buttons'.",
            uiElements: ["Node inspector", "Message Type dropdown"]
          },
          {
            step: 2,
            title: "Add Button Labels & Payloads",
            instruction: "Click '+ Add Button'. Input the button label (max 20 characters) and the unique payload identifier.",
            uiElements: ["Button label input", "Payload identifier field"]
          },
          {
            step: 3,
            title: "Wire Button Ports to Target Actions",
            instruction: "Each button generates an individual output port on the node card. Wire each button port to its specific continuation step.",
            uiElements: ["Individual button port handles", "Connecting cables"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Native Mobile UI Delivered:",
        calloutText: "Customers see native tappable WhatsApp buttons on iOS and Android with single-tap routing."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "WhatsApp button exceeds 20 characters?",
            cause: "Meta enforces a strict 20-character limit on quick-reply button text.",
            solution: "Shorten the button text (e.g. use 'Book Demo' instead of 'Schedule a Live Product Demonstration')."
          }
        ]
      }
    ],
    seo: {
      title: "Interactive Button Menus & Bots | OrbionAgents",
      description: "Deliver native WhatsApp interactive quick-reply buttons and multi-choice list pickers.",
      keywords: ["WhatsApp buttons", "quick reply menu", "interactive list picker", "Meta interactive messages"]
    }
  },

  "features/brain-rag": {
    slug: "features/brain-rag",
    category: "Core Features",
    title: "AI Brain (RAG Knowledge Base)",
    subtitle: "Multi-source document ingestion, semantic vector search, and grounded citations that eliminate AI hallucinations.",
    pageType: "ai-feature",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The AI Brain acts as the authoritative knowledge base for all your agents. Ingest product catalogs, company policy PDFs, technical markdown documentation, or live URLs. Orbion parses, chunks, and vectorizes content using high-dimensional embeddings, allowing your agents to retrieve verified snippets and cite exact paragraph sources in real time."
      },
      {
        id: "capabilities",
        title: "Key Grounding Capabilities",
        type: "list",
        items: [
          { title: "Guaranteed Grounded Answers", description: "Agents never invent policies or guess terms. If an answer is not in the Brain, the agent safely declares it or escalates." },
          { title: "Multi-Format Ingestion", description: "Upload PDFs, DOCX files, Markdown documentation, CSVs, or crawl live website URLs." },
          { title: "Vector Similarity Matching", description: "Cosine similarity search with inspectable match scores and chunk previews in the admin console." },
          { title: "Collection Isolation", description: "Separate public customer-facing documents from internal team SOPs using distinct collections." }
        ]
      },
      {
        id: "step-by-step",
        title: "Uploading & Querying Documents",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Create Knowledge Collection",
            instruction: "Open AI Brain (/user/admin/brain). Click 'Create Collection' and name your document group.",
            uiElements: ["AI Brain dashboard", "'Create Collection' button"]
          },
          {
            step: 2,
            title: "Upload Documents",
            instruction: "Drag and drop your PDF manuals or input your documentation URL for automated indexing.",
            uiElements: ["Document dropzone", "Vectorizing progress indicator"]
          },
          {
            step: 3,
            title: "Test with Query Simulator",
            instruction: "Enter sample customer inquiries to inspect retrieved chunks and similarity percentages.",
            uiElements: ["Query test box", "Cosine match cards"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Grounded Knowledge Live:",
        calloutText: "Agents reference exact document chunks with verifiable source citations, eliminating hallucinations."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Agent says it cannot find info present in the PDF?",
            cause: "Similarity threshold may be too strict, or the PDF is an image-only scan without OCR text.",
            solution: "Verify that the PDF has extractable text, and lower the similarity match threshold to 0.75 in collection settings."
          }
        ]
      }
    ],
    seo: {
      title: "AI Brain (RAG & Knowledge Base) | OrbionAgents",
      description: "Upload PDFs, sync live web URLs, and crawl full sitemaps with pgvector embeddings.",
      keywords: ["AI Brain", "RAG knowledge base", "vector search", "pgvector embeddings"]
    }
  },

  "features/omni-inbox": {
    slug: "features/omni-inbox",
    category: "Core Features",
    title: "Omni-Inbox & Human Takeover",
    subtitle: "Single unified console for WhatsApp, Instagram, Twilio & Web chat with real-time AI copilot and one-click human takeover.",
    pageType: "inbox",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Omni-Channel Inbox aggregates customer messages across WhatsApp Cloud API, Instagram Direct, Twilio SMS, and webchat into a single synchronized queue. Support agents collaborate alongside an AI Copilot that drafts contextual answers, retrieves CRM data, and yields control smoothly when human intervention is needed."
      },
      {
        id: "features-list",
        title: "Operational Capabilities",
        type: "list",
        items: [
          { title: "Universal Queue", description: "Consolidates WhatsApp, Instagram, and SMS into one workspace without switching tabs." },
          { title: "AI Copilot Drafts", description: "Generates real-time suggested answers with documentation citations for human agents to accept or tweak." },
          { title: "One-Click Takeover", description: "Toggle AI Autonomous Mode OFF at any moment to pause the bot and handle complex escalations manually." },
          { title: "Internal Team Notes", description: "Leave private internal comments on customer threads visible only to team members." }
        ]
      },
      {
        id: "step-by-step",
        title: "Managing Inbound Conversations",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Open Live Queue",
            instruction: "Click 'Inbox' in the sidebar (/user/admin/inbox) to view the chronological conversation list.",
            uiElements: ["Inbox navigation item", "Conversation thread list"]
          },
          {
            step: 2,
            title: "Select Thread & Review Copilot Draft",
            instruction: "Click any conversation to open the chat timeline. Review AI-suggested drafts in the composer area.",
            uiElements: ["Chat history pane", "AI Copilot draft box", "'Accept' hotkey"]
          },
          {
            step: 3,
            title: "Engage Human Takeover",
            instruction: "To speak directly with the customer, flip the AI Takeover toggle in the thread header. The bot enters standby mode.",
            uiElements: ["Takeover switch", "'Human Operator Active' banner"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Queue Operational:",
        calloutText: "Zero dropped messages across channels with sub-minute first response times and seamless agent collaboration."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Customer messages not appearing in queue?",
            cause: "Webhook URL in Meta or Twilio is disconnected.",
            solution: "Inspect the Channels tab to verify that the webhook connection status indicates green Connected."
          }
        ]
      }
    ],
    seo: {
      title: "Omni-Inbox & Human Takeover | OrbionAgents",
      description: "Unified inbox across WhatsApp, Instagram, Twilio, and Web with 1-click human intervention.",
      keywords: ["Omni-Inbox", "unified inbox", "human takeover", "WhatsApp inbox"]
    }
  }
};

export const CORE_FEATURES_PART1 = {
  "features/ai-workspace": {
    slug: "features/ai-workspace",
    category: "Core Features",
    title: "AI Workspace & Agent Studio",
    subtitle: "Real-time conversational agent testing, streaming tokens, multi-model routing, and dynamic tool-calling.",
    readTime: "6 min read",
    lastUpdated: "August 2026",
    video: {
      url: "/docs/videos/ai-workspace.mp4",
      title: "AI Workspace: Real-Time Streaming & Dynamic Tool Selection",
      duration: "0:38",
      caption: "Watch real-time token streaming, automated model selection, tool badges ('Selecting tool...'), and context switching."
    },
    whatIsIt: "The AI Workspace (/user/admin/ai) is an interactive testing and engineering environment where you interact directly with your workspace's AI agent. It allows developers and business admins to test how the agent reasons, stream responses token-by-token, observe dynamic tool execution, switch underlying LLM models, and simulate customer scenarios before deploying live.",
    whyUseIt: "Deploying an unvalidated conversational bot directly to customers on WhatsApp can lead to hallucinations, broken customer journeys, or policy violations. The AI Workspace allows you to simulate edge-case questions, verify knowledge retrieval, and inspect the exact API endpoints triggered (such as `/chat/stream`, `/sessions`, and `/messages`).",
    beforeYouStart: [
      "An active OrbionAgents workspace.",
      "At least one knowledge document or URL ingested into the Brain (recommended for grounded responses).",
      "Sufficient credit token balance in your Credits & Wallet."
    ],
    steps: [
      {
        step: 1,
        title: "Open the AI Workspace",
        instruction: "Click on 'AI Workspace' in the left-hand sidebar navigation (/user/admin/ai).",
        uiElements: ["'AI Workspace' nav item with Sparkles icon", "Session history drawer toggle"]
      },
      {
        step: 2,
        title: "Select or Configure the AI Model",
        instruction: "Click the model pill in the bottom action bar. By default, '✨ Auto' is selected, which intelligently selects the fastest and most cost-effective model (e.g., Claude 3.5 Sonnet, GPT-4o, or Groq Llama 3) based on query complexity.",
        uiElements: ["'✨ Auto' dropdown pill", "Model list (Claude, GPT-4o, Llama 3)", "Temperature slider in Settings"]
      },
      {
        step: 3,
        title: "Select Knowledge Source Filter",
        instruction: "Use the 'Sources' dropdown to constrain the agent's knowledge scope to 'All Sources', or specific document collections uploaded in the Brain.",
        uiElements: ["'All Sources' dropdown", "Collection filters"]
      },
      {
        step: 4,
        title: "Submit a Test Inquiry and Observe Tool Selection",
        instruction: "Type a detailed query into the prompt input box ('Reply to Auromind...') and press Enter or click the Send button. Notice the purple 'Selecting tool...' indicator when the agent calls Brain retrieval or external search.",
        uiElements: ["Chat input textarea", "Paperclip attachment icon", "'Selecting tool...' animated badge", "Stop streaming button"]
      },
      {
        step: 5,
        title: "Review Streaming Output & Follow-Up Suggestions",
        instruction: "Verify the token-by-token response, markdown formatting, bullet points, and AI-generated follow-up questions at the bottom of the reply.",
        uiElements: ["Message bubble", "Follow-up question pill buttons", "Copy message button"]
      }
    ],
    screenshots: [
      {
        src: "/docs/screenshots/ai-workspace-tool-calling.png",
        alt: "Tool Calling Badge in AI Workspace",
        caption: "AI Agent autonomously invoking retrieval tools during live conversation."
      },
      {
        src: "/docs/screenshots/ai-workspace-streaming.png",
        alt: "Live Streaming Conversation in AI Workspace",
        caption: "Token streaming with markdown formatting and suggested follow-ups."
      }
    ],
    expectedResult: "The agent generates an accurate, policy-compliant response grounded in your business data, with clear citation references and suggested next customer actions.",
    tips: [
      "Use 'Shift + Enter' in the input box to create multi-line prompts.",
      "Click on suggested follow-up questions to immediately test sequential context retention across multi-turn dialogues.",
      "Check the Network tab in DevTools if you want to inspect raw Server-Sent Events (SSE) streaming chunks from `/chat/stream`."
    ],
    troubleshooting: [
      {
        issue: "AI Workspace responds with 'Credit limit exceeded'?",
        solution: "Visit '/user/admin/credits' to top up your wallet or ensure your monthly plan quota is active."
      },
      {
        issue: "Agent hallucinates or does not use uploaded documents?",
        solution: "Confirm in the Brain tab that the relevant document shows 'Ready' status and ensure the Sources filter is set to 'All Sources'."
      }
    ],
    seo: {
      title: "AI Workspace & Agent Studio | OrbionAgents Documentation",
      description: "How to use the OrbionAgents AI Workspace to test streaming conversational agents, auto model routing, and dynamic tool-calling.",
      keywords: ["AI Workspace", "Agent Studio", "LLM tool calling", "real-time AI streaming", "OrbionAgents chat"]
    }
  },

  "features/agentic-orchestrator": {
    slug: "features/agentic-orchestrator",
    category: "Core Features",
    title: "Agentic Orchestrator (Flows)",
    subtitle: "Visual graph canvas for constructing automated conversational logic, triggers, delays, and validation.",
    readTime: "7 min read",
    lastUpdated: "June 2026",
    video: {
      url: "/docs/videos/agentic-orchestrator.mp4",
      title: "Agentic Orchestrator: Node Construction & Flow Health Validation",
      duration: "0:18",
      caption: "Step-by-step demonstration of initializing an automated wire, configuring step delay, and validating Flow Health."
    },
    whatIsIt: "The Agentic Orchestrator (/user/admin/automation) is a visual node-based graph editor (often referred to as 'Wires') where you build deterministic, branching conversation funnels. Unlike rigid legacy chatbots, the Agentic Orchestrator seamlessly blends deterministic step-by-step logic (menus, delays, forms) with cognitive AI Agent handover.",
    whyUseIt: "Certain customer workflows require strict compliance and predictable sequences (such as collecting lead details, sending pricing PDFs, or scheduling a demo) before handing off to open-ended AI. The Orchestrator gives you 100% control over the user path while maintaining Flow Health validation to eliminate dead ends.",
    beforeYouStart: [
      "At least one active channel (WhatsApp, Instagram, or Webchat).",
      "Clear understanding of your ideal customer journey (greeting -> qualification -> offer -> booking)."
    ],
    steps: [
      {
        step: 1,
        title: "Open the Orchestrator Canvas",
        instruction: "Navigate to 'Automations' (/user/admin/automation) and click '+ New Wire' or select an existing flow from the dashboard.",
        uiElements: ["'+ New Wire' button", "Flows repository list", "Canvas grid background"]
      },
      {
        step: 2,
        title: "Configure the Init Trigger Node",
        instruction: "Click on the green 'Init Trigger' node. In the right-hand Configuration panel, choose whether this flow fires on 'All incoming messages' or specific keyword triggers (e.g., 'pricing', 'demo', 'catalog').",
        uiElements: ["'Init Trigger' node", "'Trigger Messages' section", "Keyword tags input", "'Preview' button"]
      },
      {
        step: 3,
        title: "Add and Configure an Action Step Node",
        instruction: "Drag an output port from the Init Trigger or click '+ Add Step'. Set the Step Label (e.g., 'Welcome Greeting'), configure Delay Before This Step (in minutes), and select Action Type = 'Send Message'.",
        uiElements: ["'New Step' purple node", "'New Label' input", "'Delay Before This Step' counter", "'Action Type' dropdown"]
      },
      {
        step: 4,
        title: "Enter Message Text & Buttons",
        instruction: "In the Configuration sidebar, type your message copy and optionally add interactive quick-reply buttons (e.g., 'Buy a Property', 'Rent a Property', 'Talk to Human').",
        uiElements: ["'Message Text' textarea", "'+ Add Button' option", "Button title inputs"]
      },
      {
        step: 5,
        title: "Check Flow Health and Sync Wire",
        instruction: "Observe the top 'Flow Health' bar. If any node has missing text or unconnected branches, a red warning appears ('Validation Required'). Fix any issues until it displays 'Execution preview reaches all nodes', then click 'Sync Wire'.",
        uiElements: ["'Flow Health' diagnostic bar", "'Validation Required' banner", "'Sync Wire' button", "'Zen mode' toggle"]
      }
    ],
    screenshots: [
      {
        src: "/docs/screenshots/wires-orchestrator-init.png",
        alt: "Agentic Orchestrator Flow Canvas & Configuration Panel",
        caption: "Building nodes on the Agentic Orchestrator canvas with real-time Flow Health validation."
      }
    ],
    expectedResult: "Your wire is validated, compiled into the execution engine, and marked 'Operational'. Any customer messaging your channel will immediately trigger this automated workflow.",
    tips: [
      "Use 'Zen Mode' in the upper right header to collapse sidebars and maximize your canvas working area.",
      "Add a 1-minute delay before follow-up message steps to make the conversational rhythm feel natural and human-like.",
      "Click the 'Preview' button on any node to view how the bubble renders on mobile devices."
    ],
    troubleshooting: [
      {
        issue: "Flow Health says: 'Node has no message text. Please add text before saving'?",
        solution: "Click on the flagged node on the canvas to open the right-side Configuration sidebar and fill in the 'Message Text' field."
      },
      {
        issue: "Changes do not reflect when testing on WhatsApp?",
        solution: "Make sure you clicked 'Sync Wire' in the top right header after making graph changes."
      }
    ],
    seo: {
      title: "Agentic Orchestrator & Visual Flow Builder | OrbionAgents",
      description: "Visual node graph editor for automated customer journeys, triggers, delay timers, and Flow Health validation.",
      keywords: ["visual bot builder", "Agentic Orchestrator", "conversational flows", "WhatsApp bot editor", "Wires automation"]
    }
  },

  "features/flow-linking": {
    slug: "features/flow-linking",
    category: "Core Features",
    title: "Multi-Step Sequential Linking",
    subtitle: "Connecting graph nodes, configuring execution paths, and eliminating orphan steps.",
    readTime: "5 min read",
    lastUpdated: "June 2026",
    video: {
      url: "/docs/videos/flow-linking.mp4",
      title: "Multi-Step Sequential Linking & Port Wiring",
      duration: "0:17",
      caption: "Learn how to connect sequential action steps, unlink existing connections, and preview execution paths."
    },
    whatIsIt: "Multi-step sequential linking defines the flow of execution from one node to the next in the Agentic Orchestrator. Nodes communicate through output ports (handles) on the right side of cards connected via curved bezier cables to input ports on subsequent nodes.",
    whyUseIt: "Linear or branching funnels require robust routing so that customer replies advance to the correct next step. Proper wiring ensures that user responses, button clicks, and delays transition smoothly without loops or dead ends.",
    beforeYouStart: [
      "An open wire in the Agentic Orchestrator canvas with at least two nodes."
    ],
    steps: [
      {
        step: 1,
        title: "Identify Source and Target Ports",
        instruction: "Locate the purple output handle on the right edge of the preceding node and the input handle on the left edge of the destination node.",
        uiElements: ["Right output handle (purple circle)", "Left input handle (purple circle)"]
      },
      {
        step: 2,
        title: "Drag and Drop the Connection Cable",
        instruction: "Click and hold the source handle, drag the cursor toward the destination handle, and release when the snap indicator activates.",
        uiElements: ["Dynamic bezier connection cable", "Port highlight glow"]
      },
      {
        step: 3,
        title: "Alternative: Use the Configuration Dropdown",
        instruction: "Alternatively, click on the node to open the right sidebar, scroll to 'Next Step Connection', and select the target node from the '-- Link to existing step --' dropdown.",
        uiElements: ["'Next Step Connection' card", "'Link to existing step' selector", "'Connected To: [Step Name]' badge"]
      },
      {
        step: 4,
        title: "Unlink or Re-route When Needed",
        instruction: "To disconnect a step, click the red 'UNLINK' button in the Configuration panel or click the cable connection on the canvas and press Delete.",
        uiElements: ["'UNLINK' red button", "Connection line highlight"]
      },
      {
        step: 5,
        title: "Verify Execution Path in Flow Health",
        instruction: "Confirm that the top diagnostic bar displays 'Execution preview reaches N of N nodes' with zero unreachable steps.",
        uiElements: ["'Flow Health' counter", "Green operational checkmark"]
      }
    ],
    screenshots: [
      {
        src: "/docs/screenshots/wires-multi-step-link.png",
        alt: "Multi-Step Sequential Linking in Agentic Orchestrator",
        caption: "Connecting Init Trigger through sequential action steps with delay timers."
      }
    ],
    expectedResult: "A clean, acyclic graph structure with verified execution paths from the trigger to final completion.",
    tips: [
      "Keep node cards spaced at least 200 pixels apart horizontally for easy visual tracing.",
      "Use descriptive node labels (e.g., 'Ask Budget', 'Provide Brochure') instead of default names like 'New Step'."
    ],
    troubleshooting: [
      {
        issue: "Cannot connect a node back to an earlier step (Cycle detected)?",
        solution: "The Orchestrator disallows infinite loops. To loop users back to a main menu, use an interactive button pointing to the menu node instead of a direct wire cycle."
      }
    ],
    seo: {
      title: "Multi-Step Sequential Linking | OrbionAgents Docs",
      description: "How to connect and link nodes in the OrbionAgents visual workflow canvas, manage ports, and validate execution paths.",
      keywords: ["flow linking", "workflow nodes", "bot graph wiring", "conversational logic"]
    }
  },

  "features/magic-wire": {
    slug: "features/magic-wire",
    category: "Core Features",
    title: "Magic Wire (AI Flow Generation)",
    subtitle: "Turn plain-English descriptions into complete production-ready node graphs instantly.",
    readTime: "5 min read",
    lastUpdated: "May 2026",
    video: {
      url: "/docs/videos/magic-wire.mp4",
      title: "Magic Wire: Generating Complete Bot Funnels via AI Prompts",
      duration: "0:17",
      caption: "Prompting Magic Wire to automatically build a real estate bot with menus, location filters, and human handover."
    },
    whatIsIt: "Magic Wire is an AI-powered conversational workflow generator embedded directly inside the Agentic Orchestrator canvas. Instead of manually dragging, connecting, and writing copy for dozens of nodes, you type a natural language prompt, and Magic Wire constructs the entire graph automatically.",
    whyUseIt: "Building complex conversational funnels by hand can take hours. Magic Wire reduces this setup to under 10 seconds, generating best-practice bot structures with triggers, branch conditions, interactive buttons, and human handover nodes ready to deploy.",
    beforeYouStart: [
      "An open wire canvas in '/user/admin/automation'.",
      "A brief concept of the workflow you want to build (e.g., 'Real estate qualification bot' or 'Dental appointment booking')."
    ],
    steps: [
      {
        step: 1,
        title: "Locate the Magic Wire Bar",
        instruction: "Look at the bottom floating prompt bar on the Orchestrator canvas.",
        uiElements: ["Bottom floating bar with Sparkles icon", "Prompt textarea", "'MAGIC WIRE' purple button"]
      },
      {
        step: 2,
        title: "Write Your Flow Specification Prompt",
        instruction: "Type a descriptive prompt detailing the bot's goal, e.g.: 'If lead is vip, send ai personal video and ask budget. Include a main menu with Buy a Property, Rent a Property, and Need Support, then route to AI Support or Human Handover.'",
        uiElements: ["Natural language input area"]
      },
      {
        step: 3,
        title: "Execute Generation",
        instruction: "Click the 'MAGIC WIRE' button or press Enter to trigger the agentic graph synthesis engine.",
        uiElements: ["'MAGIC WIRE' button with loading spinner", "Canvas auto-layout animation"]
      },
      {
        step: 4,
        title: "Review the Auto-Generated Nodes",
        instruction: "Observe how Magic Wire places the Init Trigger, Welcome step, Main Menu with interactive buttons, inquiry steps, and Human Handover node with optimal auto-layout spacing.",
        uiElements: ["Generated node cards", "Execution preview paths", "Button options"]
      },
      {
        step: 5,
        title: "Fine-Tune and Sync Wire",
        instruction: "Click into any generated node to customize specific copy or timing, then click 'Sync Wire' to publish.",
        uiElements: ["Node inspector sidebar", "'Sync Wire' header button"]
      }
    ],
    screenshots: [
      {
        src: "/docs/screenshots/wires-magic-wire.png",
        alt: "Magic Wire Generated Bot Architecture",
        caption: "Complete real-estate bot architecture synthesized from a single prompt via Magic Wire."
      }
    ],
    expectedResult: "A fully populated, connected, and valid conversation graph rendered instantly on your canvas with zero missing fields.",
    tips: [
      "Include key button choices directly in your prompt (e.g., 'with 3 options: Pricing, Book Demo, Contact Support') for precise button creation.",
      "Mention 'handover to human' in your prompt if you want Magic Wire to automatically add a Human Intervention node."
    ],
    troubleshooting: [
      {
        issue: "Magic Wire generation takes more than 15 seconds?",
        solution: "Complex prompts with > 10 steps may take up to 20 seconds. Ensure your internet connection is stable and avoid navigating away from the tab."
      }
    ],
    seo: {
      title: "Magic Wire (AI Flow Generation) | OrbionAgents",
      description: "Build complete conversational workflows from natural language prompts using OrbionAgents Magic Wire.",
      keywords: ["Magic Wire", "AI bot generator", "prompt to workflow", "automated conversational design"]
    }
  }
};

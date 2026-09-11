export const agenticOrchestratorDetail = {
  slug: 'agentic-orchestrator',
  aliasSlugs: [
    'features/agentic-orchestrator',
    'features/flow-linking',
    'features/magic-wire',
    'features/conditional-logic',
    'features/interactive-menus',
    'features/automation',
  ],
  featureNumber: '05',
  category: 'Visual Workflow Automation',
  title: 'Automation Wire (Flow Builder)',
  tagline: 'Visual drag-and-drop orchestration canvas connecting triggers, AI intent classifiers, decision branches, and automated actions.',
  description: 'Design multi-step customer journeys without writing code. Connect inbound triggers, AI classification gates, conditional logic, and automated WhatsApp or webhook actions seamlessly on an interactive canvas.',
  heroVideo: {
    url: '/docs/videos/Screen Recording 2026-09-11 104247.mp4',
    title: 'Automation Wire (Flow Builder) Walkthrough',
    asGif: true,
    objectFit: 'cover',
    caption: 'Visual workflow orchestration: drag-and-drop triggers, AI classification nodes, and decision branches in action.',
  },
  visualKey: 'automation',
  subModules: [
    {
      id: 'flow-linking',
      badge: 'Visual Graph & Cable Routing',
      title: 'Multi-Step Sequential Linking',
      subtitle: 'Connect graph nodes via directional bezier cables and validate execution path health.',
      description: 'Multi-step sequential linking defines the flow of execution from one node to the next in the visual canvas. Nodes communicate through circular output ports connected via directional bezier cables to input ports on subsequent steps, forming a deterministic directed acyclic execution graph.',
      image: '/docs/screenshots/flow-tool-linking.png',
      caption: 'Multi-step sequential linking: Connect nodes using directional bezier cables to form an execution path.',
      keyPoints: [
        'Drag-and-Drop Cable Routing: Click the circular output handle (right side) of any node and drag a purple bezier cable to the input port (left side) of the target node.',
        'Deterministic Execution Order: Cables define the exact chronological sequence customer conversations follow, eliminating ambiguity and skipped steps.',
        'Automatic Loop Prevention: Built-in graph validation prevents circular loops and recursive deadlocks that could trap users in endless messaging loops.',
        'Real-Time Flow Health Audit: The top status bar continuously validates that all placed nodes have active connections before allowing you to sync.'
      ],
      steps: [
        {
          step: 1,
          title: 'Identify Source Port',
          description: 'Locate the circular output port handle on the right edge of any configured node card.'
        },
        {
          step: 2,
          title: 'Drag Cable to Destination',
          description: 'Click and drag from the source port toward the input port on the target node until the snap indicator highlights.'
        },
        {
          step: 3,
          title: 'Audit Flow Health',
          description: 'Check the Flow Health diagnostic bar at the top of the canvas to confirm all placed nodes have active connections.'
        }
      ]
    },
    {
      id: 'magic-wire',
      badge: 'AI Flow Generation',
      title: 'Magic Wire (AI Flow Generation)',
      subtitle: 'Turn plain-English descriptions into complete production-ready node graphs instantly.',
      description: 'Magic Wire is an agentic workflow synthesis engine embedded inside the visual canvas. Instead of manually dragging, positioning, and configuring dozens of nodes, you provide a plain English prompt describing your desired customer journey, and Magic Wire generates the complete node graph automatically in seconds.',
      image: '/docs/screenshots/flow-tool-magic-wire.png',
      caption: 'Magic Wire AI generation: Generate complete, wired node graphs from natural language prompts.',
      keyPoints: [
        'Plain-English Flow Prompting: Type what you want the chatbot to do in simple conversational language (e.g. "Ask requirements, evaluate budget, route VIPs to support").',
        'Instant Autonomous Synthesis: AI synthesizes the entire multi-node graph with triggers, reply messages, question nodes, and logic branches automatically.',
        'Automated Layout & Wiring: Magic Wire automatically calculates optimal card spacing and connects all directional bezier cables with zero manual effort.',
        '100% Fully Customizable: Inspect, edit copy, fine-tune conditions, or add extra nodes to the generated graph at any time before publishing.'
      ],
      steps: [
        {
          step: 1,
          title: 'Open Magic Wire Bar',
          description: 'In the Wires canvas, locate the bottom floating Magic Wire prompt input bar.'
        },
        {
          step: 2,
          title: 'Type Flow Specification',
          description: 'Describe your workflow goals, key questions, decision logic, and escalation conditions in natural language.'
        },
        {
          step: 3,
          title: 'Review & Fine-Tune Graph',
          description: 'Click "Generate". Magic Wire auto-arranges and wires all steps. Inspect any node to customize copy, then click "Sync Wire" to publish.'
        }
      ]
    },
    {
      id: 'conditional-logic',
      badge: 'Logic & Decision Engine',
      title: 'Conditional Logic & Decision Nodes',
      subtitle: 'Dynamic branching based on customer input keywords, urgency, sentiment, and qualification rules.',
      description: 'Decision Nodes are conditional branching splitters inside the visual canvas. When a customer sends a message or responds to a prompt, the Decision Node evaluates rules (e.g. contains keyword, matches regex, sentiment threshold, or lead score value) and immediately routes execution down the matching branch with sub-second latency.',
      image: '/docs/screenshots/flow-tool-conditional.png',
      caption: 'Conditional Logic & Decision Nodes: Evaluate rules to split execution down True and False paths.',
      keyPoints: [
        'Smart Rule Evaluation: Split customer journeys based on user input, keywords, numeric thresholds (e.g. budget > 5000), or sentiment tags.',
        'Color-Coded Dual Ports: Green output port (+) for True / condition satisfied, and Red output port (-) for False / automated fallback route.',
        'Sub-Second Execution Speed: Conditions evaluate in under 50ms at runtime, ensuring instant, seamless customer conversational transitions.',
        'Personalized Escalation Paths: Automatically escalate high-value VIP inquiries to live human specialists while handling routine tasks via automated self-service.'
      ],
      steps: [
        {
          step: 1,
          title: 'Place Decision Node',
          description: 'Add a new node from the library, select type "Condition / Decision", and place it downstream from an inquiry step.'
        },
        {
          step: 2,
          title: 'Configure Condition Parameters',
          description: 'In the node inspector, specify the variable name (e.g. "urgency"), select the operator ("contains"), and target value.'
        },
        {
          step: 3,
          title: 'Wire Branch Output Ports',
          description: 'Wire the green YES port to your qualifying action and the red NO port to your fallback action or agent takeover.'
        }
      ]
    },
    {
      id: 'interactive-menus',
      badge: 'Native Mobile UX',
      title: 'Interactive Button Menus & Bots',
      subtitle: 'Deliver native WhatsApp interactive quick-reply buttons and multi-choice list pickers.',
      description: 'Interactive menus replace manual text typing with structured WhatsApp and Instagram UI elements. By sending native quick-reply buttons (up to 3 per message) or multi-choice list pickers (up to 10 options), customers tap to choose their intent, drastically reducing response friction and typos.',
      image: '/docs/screenshots/flow-tool-interactive.png',
      caption: 'Interactive Button Menus: WhatsApp Quick Replies and structured List Pickers with dedicated output ports.',
      keyPoints: [
        'WhatsApp Quick-Reply Buttons: Present up to 3 high-contrast clickable buttons for instant one-touch choices without manual typing.',
        'Structured List Pickers: Deliver rich popup menus supporting up to 10 categorized rows with titles and descriptive subtitles.',
        'Individual Port Cable Routing: Every button creates a separate output port on the node card, letting each selection branch to a unique continuation path.',
        'Zero Friction & Typo Prevention: Tapping buttons eliminates spelling errors, speeds up user responses, and dramatically boosts customer conversions.'
      ],
      steps: [
        {
          step: 1,
          title: 'Select Node & Set Message Type',
          description: 'Click on any message action node in Wires. In the inspector, set Message Type to "Interactive Buttons" or "List Picker".'
        },
        {
          step: 2,
          title: 'Add Button Labels & Payloads',
          description: 'Click "+ Add Button". Input the button label (max 20 chars for WhatsApp) and unique payload identifier.'
        },
        {
          step: 3,
          title: 'Wire Button Ports to Target Actions',
          description: 'Each button generates an individual output port on the node card. Wire each button port to its specific continuation step.'
        }
      ]
    }
  ],
  videoPlaceholder: {
    title: 'Building Multi-Branch Workflows in Automation Wire',
    description: 'Watch how to drag and drop an Inbound Trigger node, wire it into an AI Intent Classifier, create conditional forks for VIP vs Standard routing, and trigger automated webhook actions.',
    duration: '4:45 min walkthrough'
  },
  architecture: {
    title: 'Build Drag-and-Drop Chatbot Flows in 6 Simple Steps',
    description: 'Learn how to build, test, and deploy conversational workflows using our visual drag-and-drop Flow Builder. Create interactive message sequences, trigger bots via keywords or ads, collect user inputs, set dynamic If/Else conditional logic, and go live on WhatsApp 24/7.',
    stages: [
      {
        number: '01',
        name: 'Inbound Triggers & Keyword Listeners',
        detail: 'Activates the chatbot when users send keywords, scan QR codes, or click WhatsApp Ads.'
      },
      {
        number: '02',
        name: 'Conversational Content & Interactive Nodes',
        detail: 'Sends automated greetings, quick-reply buttons, list pickers, and rich media blocks.'
      },
      {
        number: '03',
        name: 'Customer Input & Dynamic Variables',
        detail: 'Prompts questions and captures user responses into runtime session variables.'
      },
      {
        number: '04',
        name: 'Conditional Branching & Automated Execution',
        detail: 'Evaluates If/Else rules to branch into automated resolutions or human agent handover.'
      }
    ]
  },
  benefits: [
    {
      title: 'No-Code Visual Node Canvas',
      description: 'Drag, connect, and re-wire triggers, AI evaluation nodes, and actions. Clear visual connectors make multi-step workflows easy to audit and understand.',
      highlight: 'Interactive drag-and-drop graph editor'
    },
    {
      title: 'AI Intent-Based Routing Gates',
      description: 'Move beyond rigid keyword matching. Let AI understand the underlying goal of the customer to intelligently route them down the right path.',
      highlight: 'Semantic intent classification'
    },
    {
      title: 'Deterministic Retry & Fallback Safe-guards',
      description: 'If a third-party API or webhook fails, Automation Wire executes configured fallback paths or alerts an on-call agent automatically.',
      highlight: 'Automatic error handling & retries'
    },
    {
      title: 'Live Flow Testing & Step-Through Debugger',
      description: 'Simulate workflow runs with mock payloads before publishing. Watch nodes illuminate in green as data traverses each branch.',
      highlight: 'Visual step-by-step debugger'
    }
  ],
  beforeYouStart: [
    {
      title: 'Chart the Business Logic Flow',
      description: 'Map out your decision branches, trigger conditions, and desired customer escalation paths in advance.'
    },
    {
      title: 'Active Messaging Channel or Webhook',
      description: 'Connected WhatsApp/Instagram account or external webhook endpoint to trigger the workflow.'
    },
    {
      title: 'Prepared Action Targets',
      description: 'Registered MCP tools, WhatsApp message templates, or CRM endpoints to execute upon branch completion.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      stage: 'Step 01 — Create Flow',
      title: 'Create a New Chatbot Flow',
      subtitle: 'Open the Flow Builder inside your dashboard and give your flow a name.',
      description: 'Navigate to "Automation" (/user/admin/flows) from your dashboard sidebar and click "Create Flow". In the setup dialog, enter a descriptive name for your flow (e.g., "Customer Inquiry & Support" or "Lead Qualification Flow") and click "Create Flow" to launch the interactive visual canvas.',
      actionItems: [
        'Navigate to "Automation" (/user/admin/flows) in your dashboard',
        'Click the "Create Flow" button to open the setup modal',
        'Enter a descriptive name for your chatbot flow and confirm to open the canvas'
      ],
      linkText: 'Explore Flow Templates',
      linkUrl: '/user/admin/flows',
      image: '/docs/screenshots/flow-step-1.png',
      caption: 'Step 1: Flows dashboard with "+ Create Flow" button to initialize a new chatbot flow.'
    },
    {
      step: 2,
      stage: 'Step 02 — Set Triggers',
      title: 'Set Inbound Triggers and Conditions',
      subtitle: 'Add keywords, regex triggers, or connect the bot to Click-to-WhatsApp Ads.',
      description: 'Drag a Trigger node onto your canvas to determine what starts your chatbot. Configure incoming keyword listeners (such as "hi", "hello", "product", "help"), regex patterns, or connect the flow directly to Click-to-WhatsApp Ads and inbound webhooks. Whenever a user sends a matching message, the flow activates automatically.',
      actionItems: [
        'Place a Trigger node onto the starting point of your canvas',
        'Add keyword triggers (e.g. "hi", "product", "catalog", "help")',
        'Select your connected WhatsApp Business number and channel filters'
      ],
      linkText: 'About Triggers & Channels',
      linkUrl: '#flow-tools',
      image: '/docs/screenshots/flow-step-2.png',
      caption: 'Step 2: Configuring inbound trigger messages and keyword conditions.'
    },
    {
      step: 3,
      stage: 'Step 03 — Design Chatbot',
      title: 'Design Your Chatbot Content & Messages',
      subtitle: 'Drag and drop elements from the Content block to build your conversational flow.',
      description: 'Drag and drop elements from the Content panel to design your chatbot. Connect the purple directional wire from the Trigger port to a "Reply Message" node to greet users automatically. Use interactive elements like Quick Replies, List Pickers, and sequential follow-up blocks to deliver an engaging, zero-friction customer experience.',
      actionItems: [
        'Drag a "Reply Message" action node onto the canvas',
        'Connect the purple directional wire from the Trigger output port to the message node',
        'Enter your greeting text and attach interactive reply buttons or category options'
      ],
      linkText: 'Designing Interactive Messages',
      linkUrl: '#flow-tools',
      image: '/docs/screenshots/flow-step-3.png',
      caption: 'Step 3: Connecting the Trigger node to interactive greeting and message blocks.'
    },
    {
      step: 4,
      stage: 'Step 04 — Collect Input',
      title: 'Collect User Input with "Ask Question" Node',
      subtitle: 'Prompt users for key details and dynamically save their responses into variables.',
      description: 'Drag an "Ask Question" node onto the canvas to gather key information from the customer (such as inquiry details, budget, or service needs). Define the Question prompt and assign a variable name (e.g. "user_input" or "budget"). The customer\'s answer is automatically saved in real-time session memory for downstream logic and routing.',
      actionItems: [
        'Drag an "Ask Question" action node downstream in your workflow',
        'Define the question prompt to collect essential customer details',
        'Capture user responses into dynamic session variables for decision logic'
      ],
      linkText: 'Variables & User Attributes',
      linkUrl: '#flow-tools',
      image: '/docs/screenshots/flow-step-4.png',
      caption: 'Step 4: Using the Ask Question node to capture customer input into variables.'
    },
    {
      step: 5,
      stage: 'Step 05 — Logic & Branching',
      title: 'Set Conditional Logic & Branching (If / Else)',
      subtitle: 'Route conversations dynamically based on customer inputs, values, or attributes.',
      description: `Add an "If / Else" decision node to evaluate rules and split the conversation into separate branches based on customer input:
• If True: Wire the positive branch (+) to your designated action path (e.g., escalating high-priority requests to a live agent: "our agent will contact you").
• If False: Wire the alternative branch (-) to automated self-service (e.g., displaying relevant product lists or self-help options for instant resolution).`,
      actionItems: [
        'Add an "If / Else" condition block and specify your rule criteria',
        'Wire the True branch (+) to your primary or escalation action path',
        'Wire the False branch (-) to an automated self-service or fallback path'
      ],
      linkText: 'Conditional Routing & Decision Gates',
      linkUrl: '#flow-tools',
      image: '/docs/screenshots/flow-step-5.png',
      caption: 'Step 5: If / Else branching node splitting the flow into True and False paths.'
    },
    {
      step: 6,
      stage: 'Step 06 — Sync Wire & Enable',
      title: 'Sync Wire, Test and Enable Your Chatbot',
      subtitle: 'Click "Sync Wire" to commit your workflow and activate 24/7 live engagement.',
      description: 'Once all nodes and branching logic are wired, click the "Sync Wire" button in the top toolbar to sync and commit your workflow changes to the runtime engine. Review your full visual node graph to ensure all routes and fallback paths are securely connected, then toggle the chatbot to Active to engage customers 24/7!',
      actionItems: [
        'Click "Sync Wire" in the top canvas toolbar to commit and save the workflow',
        'Verify "Flow Health" confirms execution preview reaches all nodes',
        'Toggle chatbot status to Active to launch live on WhatsApp 24/7'
      ],
      linkText: 'Testing & Simulator Tools',
      linkUrl: '#verification',
      image: '/docs/screenshots/flow-step-6.png',
      caption: 'Step 6: Click "Sync Wire" in the top bar to save and sync your complete workflow.'
    }
  ],
  tips: [
    {
      title: 'Always Include Fallback Branches',
      description: 'Add an "Other / Unrecognized" fallback path to human handover so unexpected customer inputs never get stuck in limbo.'
    },
    {
      title: 'Use Magic Wire for Quick Starts',
      description: 'Type a plain English description into the Magic Wire generator to automatically construct a 5-node skeleton flow in seconds.'
    },
    {
      title: 'Check Node Execution Latencies',
      description: 'Review the Execution History tab periodically to identify slow external webhooks or bottleneck decision nodes.'
    }
  ],
  useCases: [
    {
      title: 'Intelligent Inbound Triage & Escalation',
      scenario: 'High-volume incoming chats containing a mix of billing questions, new sales inquiries, and urgent outages.',
      solution: 'Flow analyzes intent in real time. Billing questions get instant invoice links, outages trigger SMS alerts to DevOps, and sales chats alert reps.'
    },
    {
      title: 'Off-Hours Automated Lead Engagement',
      scenario: 'Customers messaging late at night when live support agents are offline.',
      solution: 'Workflow detects out-of-office hours, greets the customer via AI, collects contact details, and schedules a callback for 9:00 AM the next morning.'
    },
    {
      title: 'VIP Customer High-Priority Routing',
      scenario: 'High-value enterprise customers need immediate white-glove assistance without waiting in standard queues.',
      solution: 'Branch checks CRM lifetime value or VIP tag. If VIP, the flow skips the bot and routes directly to a dedicated Account Executive.'
    }
  ],
  expectedOutcome: 'Automated, deterministic execution of customer journeys 24/7 with zero dropped steps, complete visual auditability, and immediate human escalations when needed.',
  troubleshooting: [
    {
      question: 'Why did an incoming message not trigger the workflow?',
      answer: 'Ensure the workflow toggle is switched to "Active" (not Draft). Also verify that the trigger node channel filter matches the incoming phone number or social handle.'
    },
    {
      question: 'Can two workflows trigger on the same message?',
      answer: 'If multiple flows share the same trigger conditions, Orbion executes them in order of priority (configurable in Flow Settings), or you can use an Intent Router as a single master flow.'
    },
    {
      question: 'Where can I see the execution logs of past workflow runs?',
      answer: 'Click the "Execution History" tab in Automation Wire to view every transaction, including the exact path taken, input data, and node latencies.'
    }
  ]
};

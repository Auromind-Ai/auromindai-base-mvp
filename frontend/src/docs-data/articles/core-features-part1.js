export const CORE_FEATURES_PART1 = {
  "features/ai-workspace": {
    slug: "features/ai-workspace",
    category: "Core Features",
    title: "AI Workspace & Agent Studio",
    subtitle: "Design, test, and deploy intelligent autonomous agents with prompt controls, token streaming, and MCP tool attachments.",
    pageType: "ai-feature",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The AI Workspace (/user/admin/ai) provides an interactive development and testing environment where you configure agent system prompts, select foundation LLMs (GPT-4o, Claude 3.5 Sonnet, Gemini Flash), inspect real-time token streaming, and debug tool execution payloads before publishing live."
      },
      {
        id: "capabilities",
        title: "Key Capabilities",
        type: "list",
        items: [
          { title: "Multi-Model Selection", description: "Switch between GPT-4o for complex reasoning, Claude 3.5 Sonnet for document synthesis, and Gemini Flash for fast triage." },
          { title: "MCP Tool Attachments", description: "Bind external tools (database lookups, order tracking, calendar booking) via standardized Model Context Protocol schemas." },
          { title: "Interactive Studio Debugger", description: "Simulate multi-turn dialogues with token streaming inspector and JSON tool invocation displays." },
          { title: "Knowledge Source Binding", description: "Attach specific vector collections from AI Brain to ground agent responses with paragraph citations." }
        ]
      },
      {
        id: "step-by-step",
        title: "Configuring & Testing an Agent",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Access Agent Studio",
            instruction: "Open AI Workspace in the main navigation (/user/admin/ai) to enter the agent editor.",
            uiElements: ["Sidebar 'AI Workspace' link", "Studio layout panel"]
          },
          {
            step: 2,
            title: "Configure Persona & System Instructions",
            instruction: "In the Prompt Editor, write your agent's identity, guidelines, and strict boundary rules. Set temperature according to task predictability.",
            uiElements: ["Prompt textarea", "Temperature slider", "Max tokens input"]
          },
          {
            step: 3,
            title: "Bind MCP Tools & Knowledge Sources",
            instruction: "Click 'Tools' to enable external tools (e.g. order lookup). In 'Knowledge Sources', select your uploaded Brain collections.",
            uiElements: ["Tools checklist", "Knowledge collections selector"]
          },
          {
            step: 4,
            title: "Test Live in Studio Playground",
            instruction: "Send test messages in the right-hand chat simulation. Observe the token streaming inspector and tool execution blocks.",
            uiElements: ["Simulation chat", "Tool execution payload block", "'Publish' button"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Agent Verified:",
        calloutText: "Your agent follows prompt constraints, invokes attached tools with valid arguments, and is ready for live channel deployment."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Agent answers in an overly verbose tone?",
            cause: "Temperature may be set too high or prompt lacks concise guidelines.",
            solution: "Lower temperature to 0.2 and explicitly instruct: 'Provide concise, professional responses in 2-3 sentences.'"
          }
        ]
      }
    ],
    seo: {
      title: "AI Workspace & Agent Studio | OrbionAgents",
      description: "Interactive AI agent testing, real-time streaming, auto model routing, and tool-calling.",
      keywords: ["AI Workspace", "Agent Studio", "LLM playground", "MCP tool calling"]
    }
  },

  "features/agentic-orchestrator": {
    slug: "features/agentic-orchestrator",
    category: "Core Features",
    title: "Agentic Orchestrator (Automation Wire)",
    subtitle: "Visual node graph canvas for building multi-step logic, intent triggers, delay timers, and human handoffs.",
    pageType: "workflow",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Agentic Orchestrator (Wires) is a visual drag-and-drop workflow canvas for automating customer journeys. Wire triggers (inbound WhatsApp chats, Instagram DMs, webhooks) to AI intent classifiers, conditional decision forks, and automated actions without writing code."
      },
      {
        id: "node-types",
        title: "Available Node Types",
        type: "list",
        items: [
          { title: "Trigger Nodes", description: "Inbound WhatsApp message, Instagram DM, tag added, or scheduled cron timer." },
          { title: "AI Intent Classifiers", description: "Evaluates user message semantic intent and outputs discrete routing signals." },
          { title: "Decision Forks", description: "Evaluates boolean conditions (lead score, business hours, customer tags) to branch the conversation." },
          { title: "Action Nodes", description: "Send WhatsApp template, dispatch SMS, invoke MCP database tool, or assign to human operator." }
        ]
      },
      {
        id: "workflow-steps",
        title: "Building an Automation Workflow",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Create a New Flow",
            instruction: "Navigate to Wires (/user/admin/automation) and click 'New Flow'. Select a template or start from an empty canvas.",
            uiElements: ["'New Flow' button", "Template selector"]
          },
          {
            step: 2,
            title: "Place Trigger Node",
            instruction: "Drag 'Inbound WhatsApp Message' onto the canvas. Configure channel filters and operating hours.",
            uiElements: ["Trigger node", "Channel dropdown"]
          },
          {
            step: 3,
            title: "Wire to AI Intent Classifier",
            instruction: "Connect the trigger output port to an AI Intent Classifier. Define branches: Sales Lead, Support Inquiry, and Billing.",
            uiElements: ["Bezier connection wire", "Intent branch inputs"]
          },
          {
            step: 4,
            title: "Attach Actions & Sync Wire",
            instruction: "Connect outcomes to 'Send Message' or 'Assign to Human'. Click 'Sync Wire' in the top header to publish.",
            uiElements: ["Action nodes", "'Sync Wire' header button"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Workflow Active:",
        calloutText: "Inbound messages matching trigger criteria execute automatically along the defined graph path, logging execution traces in real time."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Incoming message does not trigger the flow?",
            cause: "The flow may still be in Draft mode, or channel filters do not match the incoming sender.",
            solution: "Ensure the flow status toggle is set to Active, and verify that the target phone number is selected in the trigger node."
          }
        ]
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
    subtitle: "Connecting graph nodes, port routing, and validating execution paths.",
    pageType: "workflow",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "Multi-step sequential linking defines the flow of execution from one node to the next in the visual canvas. Nodes communicate through output ports connected via directional bezier cables to input ports on subsequent steps, forming a directed acyclic execution graph."
      },
      {
        id: "linking-rules",
        title: "Port Connection Principles",
        type: "list",
        items: [
          { title: "Source & Target Ports", description: "Right handles represent output triggers; left handles represent receiving entrypoints." },
          { title: "Conditional Split Ports", description: "Decision nodes provide multiple color-coded output ports for True/False or Intent branches." },
          { title: "Loop Prevention", description: "The graph engine prevents infinite recursion; return users to main menus using menu action steps." },
          { title: "Unlink & Re-Route", description: "Disconnect cables by selecting the connection line and pressing Delete or clicking Unlink in the inspector." }
        ]
      },
      {
        id: "step-by-step",
        title: "Connecting & Validating Nodes",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Identify Source Port",
            instruction: "Locate the circular output port on the right edge of the preceding node card.",
            uiElements: ["Source port handle"]
          },
          {
            step: 2,
            title: "Drag Cable to Destination",
            instruction: "Click and drag from the source port toward the input port on the target node. Release when the snap indicator highlights.",
            uiElements: ["Directional bezier cable", "Port snap highlight"]
          },
          {
            step: 3,
            title: "Verify Execution in Flow Health",
            instruction: "Check the Flow Health diagnostic bar at the top of the canvas to confirm all placed nodes have active connections.",
            uiElements: ["Flow Health bar", "Unreachable nodes counter"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Graph Verified:",
        calloutText: "Execution path traverses connected nodes sequentially without orphan or unreachable steps."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Cable snaps back and does not connect?",
            cause: "Attempting to connect two input ports or two output ports together.",
            solution: "Ensure you drag from a right output port to a left input port."
          }
        ]
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
    pageType: "workflow",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "Magic Wire is an agentic workflow synthesis engine embedded inside the visual canvas. Instead of manually dragging, positioning, and configuring dozens of nodes, you provide a plain English prompt describing your desired customer journey, and Magic Wire generates the complete node graph automatically."
      },
      {
        id: "prompt-examples",
        title: "Sample Flow Prompts",
        type: "list",
        items: [
          { title: "Real Estate Buyer Qualification", description: "'Create an inbound WhatsApp bot that asks property preference (Buy vs Rent), budget bracket, and books a weekend walkthrough.'" },
          { title: "E-Commerce Order Concierge", description: "'Build a flow with main menu: Track Parcel, Return Policy, and Talk to Agent. If returning, ask order ID and photo.'" },
          { title: "Off-Hours Consultation Booking", description: "'If outside business hours, greet the user, collect their name and email, and schedule a 30-min discovery call via Google Calendar.'" }
        ]
      },
      {
        id: "step-by-step",
        title: "Generating a Flow with Magic Wire",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Open Magic Wire Bar",
            instruction: "In Wires canvas, locate the bottom floating Magic Wire prompt input bar.",
            uiElements: ["Magic Wire floating bar", "Prompt textarea"]
          },
          {
            step: 2,
            title: "Type Flow Specification",
            instruction: "Describe your workflow goals, key questions, options, and escalation conditions in natural language.",
            uiElements: ["Prompt textarea", "'Magic Wire' submit button"]
          },
          {
            step: 3,
            title: "Review Synthesized Graph",
            instruction: "Click 'Generate'. Watch Magic Wire auto-place Triggers, AI intent nodes, decision branches, and action steps with clean layout spacing.",
            uiElements: ["Canvas auto-layout animation", "Generated node cards"]
          },
          {
            step: 4,
            title: "Inspect & Publish",
            instruction: "Click into any generated node to customize exact copy or delays, then click 'Sync Wire' to activate.",
            uiElements: ["Node inspector drawer", "'Sync Wire' header button"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Outcome",
        type: "callout",
        calloutTitle: "Complete Graph Generated:",
        calloutText: "A fully wired, valid conversation flow appears on the canvas ready for immediate testing and deployment."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Generated flow is missing a specific branch?",
            cause: "Prompt did not explicitly specify the desired branch condition.",
            solution: "Re-prompt Magic Wire with explicit requirements (e.g. 'Add a branch for VIP customers with budget > $5,000') or add the node manually on the canvas."
          }
        ]
      }
    ],
    seo: {
      title: "Magic Wire (AI Flow Generation) | OrbionAgents",
      description: "Build complete conversational workflows from natural language prompts using OrbionAgents Magic Wire.",
      keywords: ["Magic Wire", "AI bot generator", "prompt to workflow", "automated conversational design"]
    }
  }
};

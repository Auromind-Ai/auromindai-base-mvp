export const aiWorkspaceDetail = {
  slug: 'ai-workspace',
  aliasSlugs: ['features/ai-workspace'],
  featureNumber: '03',
  category: 'Conversational AI & Copilot',
  title: 'AI Workspace & Smart Copilot',
  tagline: 'Multi-model conversational workspace with real-time streaming, Brain RAG knowledge search, and multi-modal document analysis.',
  description: 'The AI Workspace is your dedicated command center for business intelligence, internal knowledge lookup, and drafting enterprise communications. Dynamically switch between top foundation models (Auto, Groq, Claude 3.5 Sonnet, Claude Opus, Gemini Flash), scope answers to your verified AI Brain documents, email threads, or web search, and attach PDF/image files for instant deep analysis.',
  visualKey: 'workspace',
  heroScreenshot: '/images/docs/workspace/workspace_hero.png',
  heroCaption: 'AI Workspace Home — Clean conversational chat interface with quick-start suggestion cards and multi-mode AI assistant.',
  activeConsoleScreenshot: '/images/docs/workspace/explain_2.png',
  stepsBadge: '7 Step Guided Visual Tour',
  copy: {
    setupLabel: 'Interactive Visual Walkthrough',
    stepsLabel: 'How to Use Your AI Workspace:',
    verificationTitle: 'Live Chat Assistant Capabilities',
    outcomeLabel: 'What You Can Accomplish:'
  },
  architecture: {
    title: 'How Your Chat Assistant Works',
    description: 'Every time you send a message, the assistant quickly searches relevant documents, chooses the right AI mode, and streams a structured answer back in real time.',
    stages: [
      {
        number: '01',
        name: 'You Ask a Question',
        detail: 'Type any question in the chat bar, pick a starter template, or upload a document/image you want to analyze.'
      },
      {
        number: '02',
        name: 'Context & Knowledge Search',
        detail: 'The assistant checks your selected source—whether company documents, past emails, or live web search—to find relevant facts.'
      },
      {
        number: '03',
        name: 'Smart Answer Generation',
        detail: 'Routes your question to your chosen AI mode (Fast, Smart, or Deep) to formulate a clear, well-structured answer.'
      },
      {
        number: '04',
        name: 'Live Typing & Instant Actions',
        detail: 'Types the answer word-by-word with neat tables and bullet points. Copy the text, ask to try again, or rate the response.'
      }
    ]
  },
  benefits: [
    {
      title: 'Works Just Like Gemini & ChatGPT',
      description: 'Chat naturally in plain language to brainstorm ideas, draft emails, organize meeting notes, and solve everyday work tasks.',
      highlight: 'Simple & Friendly Chat'
    },
    {
      title: 'Search Company Documents & Web',
      description: 'Get accurate answers grounded in your company manuals, shared PDFs, synced team emails, or live internet search.',
      highlight: 'Files, Email & Web Search'
    },
    {
      title: 'Attach Files, Photos & PDFs',
      description: 'Upload contracts, invoices, or screenshots directly into the chat for instant summaries, key points, and clear breakdowns.',
      highlight: 'Document & Photo Upload'
    },
    {
      title: 'Saved Chat History & Easy Controls',
      description: 'All your past chats are safely saved with titles and timestamps. Start fresh anytime or pick up right where you left off.',
      highlight: 'History & One-Click Copy'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Open AI Workspace & Pick a Quick Starter Card',
      highlight: 'Starter Suggestion Cards',
      description: 'When you open AI Workspace, you are greeted by a clean chat screen just like Gemini. Under "Get started with", you can see helpful suggestion cards. In the center, locate the "Writing meeting agenda" card (highlighted in the red box). Clicking this card immediately asks the assistant to prepare an organized meeting agenda. Alternatively, you can type any custom question into the "Ask me Anything..." chat bar at the bottom.',
      screenshot: '/images/docs/workspace/explain_1.png',
      caption: 'Workspace Launchpad — Click the "Writing meeting agenda" starter card (highlighted in the red box) to begin drafting right away.',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: [
        'Personalized Welcome Banner',
        "'Ask me Anything...' Chat Input Bar",
        "'+' Attachment & Options Button",
        "'Writing meeting agenda' Card (Highlighted in Red)",
        'Chat History Clock Button (Top-Left)'
      ]
    },
    {
      step: 2,
      title: 'Watch the Assistant Type Your Answer in Real Time',
      highlight: 'Live Typing Stream',
      description: 'Once you submit your message, the assistant types out your answer word-by-word on the screen (highlighted in the red box). Notice how it formats your meeting agenda with bold headings, attendee lists, bullet points, and neat structured tables. If you scroll up while it is typing, a floating "Scroll to latest" button appears, letting you jump straight back to the new lines anytime.',
      screenshot: '/images/docs/workspace/explain_2.png',
      caption: 'Live Response Stream — The assistant types out a structured meeting agenda word-by-word with clean tables and a floating "Scroll to latest" button (highlighted in the red box).',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: [
        "Your Sent Question ('Writing meeting agenda')",
        'Live Word-by-Word Typing Stream (Highlighted in Red)',
        'Formatted Tables & Clear Bulleted Items',
        "Floating 'Scroll to latest' Quick Jump Button",
        'Bottom Chat Bar for Follow-up Replies'
      ]
    },
    {
      step: 3,
      title: 'Copy, Regenerate, or Rate the Response',
      highlight: 'Action Toolbar',
      description: 'Underneath each completed answer, an action bar appears with helpful one-click buttons (highlighted in the red box). Click the Copy icon to copy the entire formatted response to your clipboard so you can paste it anywhere. Click the Regenerate icon if you would like the assistant to rewrite a new version. You can also click the thumbs-up "Helpful" button (shown in green) or thumbs-down button to rate the answer.',
      screenshot: '/images/docs/workspace/explain_3.png',
      caption: 'Action Buttons Toolbar — Copy to clipboard, rewrite with Regenerate, and rate answers with thumbs-up/down (highlighted in the red box).',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: [
        'One-Click Copy to Clipboard Icon',
        'Regenerate / Rewrite Icon',
        "'Helpful' Thumbs-Up Button (Highlighted in Green)",
        'Thumbs-Down Rating Button',
        "'Reply to Orbionagents...' Follow-up Input"
      ]
    },
    {
      step: 4,
      title: 'Click the "+" Button to Add Files and Change Settings',
      highlight: 'Quick Options (+)',
      description: 'Click the round "+" button on the left of the chat bar to open the quick options menu (highlighted in the red box). From here, click "Add files or photos" to upload PDFs, documents, or screenshots for the assistant to inspect. You can also switch AI engines with "Skills (Model)", choose your search scope with "Add connector", or toggle live "Web search" on or off.',
      screenshot: '/images/docs/workspace/explain_4.png',
      caption: 'Quick Options Menu — Click the "+" button to upload documents, pick AI modes, choose knowledge sources, or toggle Web search (highlighted in the red box).',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: [
        "'+' Plus Menu Trigger Button",
        "'Add files or photos' Document Uploader",
        "'Skills (Model)' AI Mode Selector",
        "'Add connector' Knowledge Source Filter",
        "'Web search' Live Internet Toggle"
      ]
    },
    {
      step: 5,
      title: 'Choose the Best AI Mode for Your Work',
      highlight: 'Select AI Mode',
      description: 'Hover or click "Skills (Model)" in the options menu to open the "SELECT MODEL" list (highlighted in the red box). Pick the assistant style that fits what you are doing: "✨ Auto" (intelligently chooses the best mode for your question), "⚡ Groq Llama 3.3 (Fast)" for ultra-fast replies to everyday questions, "🧠 Claude 3.5 Sonnet (Smart)" for balanced high-quality writing, "🧪 Claude 3 Opus (Deep)" for complex problem-solving, or "💡 Gemini Flash" for fast analysis.',
      screenshot: '/images/docs/workspace/explain_5.png',
      caption: 'SELECT MODEL Submenu — Easily switch between ✨ Auto, Fast, Smart, Deep, and Gemini Flash modes (highlighted in the red box).',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: [
        "'SELECT MODEL' Menu Header",
        "'✨ Auto' (Default Smart Mode)",
        "'⚡ Groq Llama 3.3 (Fast)' for Instant Answers",
        "'🧠 Claude 3.5 Sonnet (Smart)' for High-Quality Writing",
        "'🧪 Claude 3 Opus (Deep)' & '💡 Gemini Flash'"
      ]
    },
    {
      step: 6,
      title: 'Choose Where the Assistant Searches for Answers',
      highlight: 'Knowledge Sources',
      description: 'Click "Add connector" in the menu to open the "DATA SOURCE" list (highlighted in the red box). Control where the assistant pulls facts from: choose "All Sources" to search everywhere, "Documents" to strictly answer from your uploaded company guides and files, "Email" to check connected team messages, or "Web Search" to look up live facts on the internet.',
      screenshot: '/images/docs/workspace/explain_6.png',
      caption: 'DATA SOURCE Connectors — Choose whether the assistant looks in All Sources, Company Documents, Email, or Web Search (highlighted in the red box).',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: [
        "'DATA SOURCE' Menu Header",
        "'All Sources' (Searches across all connected files)",
        "'Documents' (Strictly searches uploaded company documents)",
        "'Email' (Searches connected email discussions)",
        "'Web Search' (Searches the live web)"
      ]
    },
    {
      step: 7,
      title: 'Manage Your Past Chats and Start Fresh',
      highlight: 'Chat History Drawer',
      description: 'Click the clock icon at the top-left corner of your workspace to open the "Chat history" sidebar (highlighted in the red box). Click "New Chat +" whenever you want to begin a fresh conversation. You can also use the search box to find past conversations, or click on any previous chat in the list (such as "Writing meeting agenda", "tnpl 2026 winners", or "who is auromind ai") to immediately view and continue that discussion.',
      screenshot: '/images/docs/workspace/explain_7.png',
      caption: 'Chat History Sidebar — Slide out past conversations, create a "New Chat +", or search previous discussions (highlighted in the red box).',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: [
        'Top-Left History Clock Toggle',
        "'Chat history' Slide-Out Drawer (Highlighted in Red)",
        "'New Chat +' Button for a Clean Start",
        'Instant Search Bar for Past Chats',
        'Saved Chats List with Titles and Timestamps'
      ]
    }
  ],
  tips: [
    {
      title: 'Match the AI Mode to Your Task',
      description: 'Use Fast mode for quick answers, translations, and short emails. Use Smart or Deep mode when you need in-depth research, careful analysis, or long reports.'
    },
    {
      title: "Select 'Documents' for Company Truth",
      description: "When asking about internal leave policies, pricing, or product specs, select 'Documents' to ensure the assistant only answers from your official uploaded files."
    },
    {
      title: 'Upload Clear Photos and PDFs',
      description: 'When uploading document images or PDFs, ensure the text is legible so the assistant can read and summarize the details accurately.'
    }
  ],
  useCases: [
    {
      title: 'Drafting Meeting Agendas & Summaries',
      scenario: 'Managers needing to prepare an executive meeting outline with time slots and attendee checklists.',
      solution: 'Click the "Writing meeting agenda" template or ask the assistant to generate a polished, ready-to-share markdown agenda in seconds.'
    },
    {
      title: 'Checking Company Policies & Guides',
      scenario: 'Team members looking for quick answers on leave policies, travel rules, or customer support guidelines.',
      solution: 'Select "Documents" as the data source and ask your question to get immediate, verified answers directly from your company files.'
    },
    {
      title: 'Summarizing Long Reports & Documents',
      scenario: 'Employees needing to quickly digest lengthy contracts, market reports, or invoices.',
      solution: 'Click "+" to upload the PDF or document, and ask the assistant to extract key takeaways, dates, and action items.'
    }
  ],
  expectedOutcome: 'A powerful, friendly, and reliable chat workspace—working just like Google Gemini—where you can ask questions, write content, review files, and find company knowledge instantly.',
  verificationChecklist: [
    'Quick starter cards help you begin writing tasks with a single click.',
    'Answers stream word-by-word with clean headings, tables, and bullet points.',
    'Copy, regenerate, and thumbs-up/down buttons give you instant control over answers.',
    'The "+" menu lets you attach files and photos, switch AI modes, and choose data sources.',
    'You can easily switch between Fast, Smart, and Deep AI modes based on what you need.',
    'Data connectors allow you to scope answers strictly to company documents, emails, or web search.',
    'The chat history sidebar keeps all your past conversations organized, searchable, and easy to resume.'
  ],
  troubleshooting: [
    {
      question: 'How do I start a brand new chat without previous context?',
      answer: 'Click the clock icon in the top-left corner to open the Chat History sidebar, then click the "New Chat +" button. This opens a fresh, clean conversation.'
    },
    {
      question: 'Can I ask questions about uploaded photos or PDF files?',
      answer: 'Yes! Click the "+" button in the chat bar and select "Add files or photos". Select your file, and the assistant will inspect and answer questions about it.'
    },
    {
      question: 'How do I stop the assistant if it is still typing?',
      answer: 'While the assistant is typing an answer, a square "Stop" button appears in the chat bar. Click it anytime to immediately stop writing.'
    }
  ]
};

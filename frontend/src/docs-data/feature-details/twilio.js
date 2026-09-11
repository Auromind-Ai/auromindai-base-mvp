export const twilioDetail = {
  slug: 'integrations/twilio',
  aliasSlugs: ['features/twilio', 'twilio'],
  featureNumber: '10',
  category: 'Omni-Gateway & Channel Connectivity',
  title: 'Twilio SMS & WhatsApp Gateway',
  tagline: 'Power your WhatsApp and international SMS communications with our native Twilio bridge.',
  description: 'The Twilio Gateway integration connects your Twilio account directly to orbionagents. Deploy 24/7 AI agents across global SMS and WhatsApp, build visual multi-channel workflows with automated SMS fallback, and test rapidly using Twilio Sandbox before launching dedicated business phone numbers.',
  visualKey: 'twilio',
  heroScreenshot: '/images/docs/whatsapp-connect/twilio/t_step_1.png',
  connectionRules: [
    {
      ruleNumber: '01',
      title: 'Twilio Account SID',
      badge: 'Core Credential',
      status: 'Required',
      description: 'Your Twilio Account SID is the unique string identifier for your Twilio account, found directly on the Twilio Console dashboard.',
      details: 'Location: Twilio Console > Develop > Account Dashboard > Account Info > Account SID (starts with "AC...").'
    },
    {
      ruleNumber: '02',
      title: 'Twilio Auth Token',
      badge: 'Secret Key',
      status: 'Required',
      description: 'The secret API token used to securely authenticate inbound and outbound messages between Twilio and orbionagents.',
      details: 'Location: Twilio Console > Account Info > Auth Token. Click "Show" or the copy icon. Never share this token publicly.'
    },
    {
      ruleNumber: '03',
      title: 'Twilio Phone Number (WhatsApp / SMS)',
      badge: 'Sender Handle',
      status: 'Required',
      description: 'An active Twilio phone number enabled for WhatsApp or SMS (or the Twilio Sandbox test number).',
      details: 'For testing: Use the assigned Twilio Sandbox test phone number shown in your Twilio Console. For production: Purchase a dedicated number under Phone Numbers > Buy a number.'
    },
    {
      ruleNumber: '04',
      title: 'Sandbox Webhook Configuration',
      badge: 'Required Action',
      status: 'Action Needed',
      description: 'Official orbionagents webhook endpoint URLs must be saved in your Twilio Sandbox settings to route incoming messages to your AI agent.',
      details: 'In Twilio Console > Messaging > Try it out > Send a WhatsApp message > Sandbox settings: set "When a message comes in" to https://api.orbionagents.com/twilio/webhook and "Status callback URL" to https://api.orbionagents.com/twilio/status-callback.'
    }
  ],
  architecture: {
    title: 'Step-by-Step Twilio Onboarding Guide',
    description: 'Follow these video-verified steps to retrieve your credentials from Twilio and activate your SMS & WhatsApp gateway.',
  },
  benefits: [
    {
      title: '24/7 Autonomous AI Agent SMS & WhatsApp Replies',
      description: 'Deploy intelligent AI agents that answer inbound SMS and WhatsApp inquiries 24/7, pulling accurate responses directly from your business knowledge base.',
      highlight: 'Global 24/7 AI Ingestion'
    },
    {
      title: 'Multi-Channel Automation with SMS Fallback',
      description: 'Deliver high-priority notifications, OTPs, and alerts via WhatsApp with automatic fallback to international SMS if data delivery fails.',
      highlight: 'Carrier Auto-Fallback'
    },
    {
      title: 'Instant Developer Sandbox Testing',
      description: 'Start developing and testing WhatsApp workflows immediately using the shared Twilio Sandbox without waiting for Meta business account verification.',
      highlight: 'Zero-Wait Sandbox'
    },
    {
      title: 'Global International Carrier Coverage',
      description: 'Send and receive SMS messages across 180+ countries with tier-1 carrier redundancy, ultra-low latency, and reliable high-throughput delivery.',
      highlight: '180+ Countries Covered'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Channels Console & Initiate Twilio Connection',
      description: 'In your orbionagents dashboard, navigate to Channels & Integration. Locate the "Twilio (Twilio Powered)" card and click the "Connect >" button to launch the guided integration modal.',
      screenshot: '/images/docs/whatsapp-connect/twilio/t_step_1.png',
      caption: 'Channels Dashboard — Click "Connect >" on the Twilio Powered card.',
      highlight: '1-Click Initiation',
      uiElements: ['Channels Dashboard', 'Twilio card', 'Connect > button']
    },
    {
      step: 2,
      title: 'Connect Twilio Modal & Open Twilio Console',
      description: 'The "Connect Twilio (Step 1 of 2: Get Your Credentials)" modal opens with guided setup instructions. Click the "Open Twilio Console" button to navigate to console.twilio.com and log in.',
      screenshot: '/images/docs/whatsapp-connect/twilio/t_step_2.png',
      caption: 'Guided Credentials Modal — Click "Open Twilio Console" to access your Twilio dashboard.',
      highlight: 'Console Access',
      uiElements: ['Step 1 of 2 modal', 'Open Twilio Console button', 'I Have My Credentials button']
    },
    {
      step: 3,
      title: 'Twilio Console Dashboard — Copy Account SID & Auth Token',
      description: 'In the Twilio Console (Develop tab > Account Dashboard), scroll down to the "Account Info" section. Click the copy icon next to your Account SID (starts with "AC...") and Auth Token to copy them to your clipboard.',
      screenshot: '/images/docs/whatsapp-connect/twilio/t_step_3.png',
      caption: 'Twilio Account Info — Copy your Account SID and Auth Token.',
      highlight: 'Credential Retrieval',
      uiElements: ['Account Info card', 'Account SID copy button', 'Auth Token copy button']
    },
    {
      step: 4,
      title: 'WhatsApp Sandbox Test Number vs Buying Dedicated Number',
      description: 'Navigate to Messaging > Try it out > Send a WhatsApp message. Twilio displays your assigned developer Sandbox test number along with your unique Sandbox join code. For testing, copy the displayed test number. For live production, navigate to Phone Numbers > Buy a number to purchase a permanent, brand-owned business number.',
      screenshot: '/images/docs/whatsapp-connect/twilio/t_step_4.png',
      caption: 'Try WhatsApp — View your assigned Sandbox test number and unique join code, or purchase a dedicated number.',
      highlight: 'Sender Number Selection',
      uiElements: ['Sandbox test number', 'Join code banner', 'Buy a Number link']
    },
    {
      step: 5,
      title: 'Set Official Webhook URLs in Sandbox Settings',
      description: 'In the Twilio Console, click the "Sandbox settings" tab under "Try WhatsApp". Set "When a message comes in" to https://api.orbionagents.com/twilio/webhook (Method: POST), and set "Status callback URL" to https://api.orbionagents.com/twilio/status-callback (Method: POST). Click "Save".',
      screenshot: '/images/docs/whatsapp-connect/twilio/t_step_5.png',
      caption: 'Sandbox Settings — Configure official orbionagents webhook URLs and click "Save".',
      highlight: 'Webhook Configuration',
      uiElements: ['When a message comes in URL', 'Status callback URL', 'Save button']
    },
    {
      step: 6,
      title: 'Enter Credentials & Complete Connection in Channels',
      description: 'Return to the orbionagents Channels modal and click "I Have My Credentials >" to proceed to Step 2 of 2. Paste your Twilio Account SID, Twilio Auth Token, and Twilio Phone Number, then click the red "Connect >" button.',
      screenshot: '/images/docs/whatsapp-connect/twilio/t_step_6.png',
      caption: 'Enter Credentials — Paste Account SID, Auth Token, Phone Number, and click "Connect >".',
      highlight: '1-Click Activation',
      uiElements: ['TWILIO ACCOUNT SID field', 'TWILIO AUTH TOKEN field', 'TWILIO PHONE NUMBER field', 'Connect > button']
    }
  ],
  activeConsoleScreenshot: '/images/docs/whatsapp-connect/twilio/verify.png',
  expectedOutcome: 'Your Twilio SMS & WhatsApp Gateway is connected and active. Inbound messages from your Twilio number route directly into the Omni-Channel Inbox, and your 24/7 AI agents and visual automation workflows respond instantly.',
  verificationChecklist: [
    'Connection confirmation modal displays "Twilio Connected Successfully".',
    'Channels dashboard displays a verified status for the Twilio gateway.',
    'AI Agent replies conversationally to incoming SMS and WhatsApp inquiries 24/7.',
    'Automated workflows and status callbacks update delivery states in real time.'
  ],
  troubleshooting: [
    {
      question: "Why am I not receiving messages when testing with the Twilio WhatsApp Sandbox?",
      answer: "With Twilio Sandbox, you must first opt in from your personal WhatsApp. Send the unique join code displayed on your Twilio screen (e.g., 'join <sandbox-keyword>') from your phone to your assigned Sandbox test number. Once Twilio confirms the opt-in reply, your messages will route directly to orbionagents."
    },
    {
      question: "What is the difference between the Twilio Sandbox and a Dedicated Twilio Number?",
      answer: "The Sandbox is a shared test environment for rapid prototyping and requires an opt-in join keyword. A dedicated purchased number (Phone Numbers > Buy a number) is exclusive to your business, has no join code requirement, and can be registered for your official business profile."
    },
    {
      question: "Where can I find my Twilio Auth Token if it is masked or hidden?",
      answer: "In the Twilio Console (Develop > Account Dashboard > Account Info), click the 'Show' link next to Auth Token. Copy the token carefully. You can also generate an API Key under Account Settings if preferred."
    },
    {
      question: "Can I manage both Twilio SMS and WhatsApp in the same Omni-Channel Inbox?",
      answer: "Yes! orbionagents unifies all incoming SMS and WhatsApp conversations into one central inbox with channel tags, customer contact profiles, message history, and automated AI assistance."
    },
    {
      question: "Why are inbound messages not reaching my orbionagents platform?",
      answer: "Ensure you configured the webhook URLs under Sandbox settings: 'When a message comes in' must be set to 'https://api.orbionagents.com/twilio/webhook' with Method set to 'POST', and click 'Save' in the Twilio Console."
    }
  ]
};

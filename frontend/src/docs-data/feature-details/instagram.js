export const instagramDetail = {
  slug: 'integrations/instagram',
  aliasSlugs: ['features/instagram', 'instagram'],
  featureNumber: '09',
  category: 'Omni-Gateway & Channel Connectivity',
  title: 'Instagram Direct & Story Automation',
  tagline: 'Connect your Instagram Professional account to automate direct messages, deploy 24/7 AI agents, and turn story mentions into leads.',
  description: 'The Instagram Graph API integration connects your Instagram Business or Creator account directly to orbionagents. Once connected, your platform automatically powers 24/7 AI agent replies to direct messages (DMs), triggers visual automation flows when customers comment or mention you in stories, and routes qualified leads directly into the Omni-Channel Inbox — all managed in one unified console without third-party aggregator costs.',
  visualKey: 'instagram',
  heroScreenshot: '/images/docs/whatsapp-connect/instagram/step_1.png',
  connectionRules: [
    {
      ruleNumber: '01',
      title: 'Business or Creator Account Only',
      badge: 'Mandatory Requirement',
      status: 'Required',
      description: 'Personal Instagram accounts cannot connect to Meta Graph API. Your account must be converted to a Professional Account (Business or Creator tier).',
      details: 'Meta Guideline: Open Instagram app > Settings > Account > Switch to professional account > Select Business or Creator category.'
    },
    {
      ruleNumber: '02',
      title: 'Facebook Business Page Mandatory',
      badge: 'Meta Prerequisite',
      status: 'Required',
      description: 'Meta Graph API requires an active Facebook Business Page to manage permissions and route API tokens for Instagram Direct messaging.',
      details: 'Meta Guideline: You must have administrator rights to at least one active Facebook Page within your Meta Business Portfolio.'
    },
    {
      ruleNumber: '03',
      title: 'Instagram & Facebook Page Connected Mandatory',
      badge: 'Critical Requirement',
      status: 'Action Needed',
      description: 'Your Instagram Professional account must be linked directly to your Facebook Business Page. Without this link, Meta authorization will fail to detect your Instagram handle.',
      details: 'Required Action: In Facebook Page Settings > Linked Accounts > Instagram > Connect Account. Alternatively, in Instagram app > Settings > Business > Connect a Facebook Page.'
    }
  ],
  architecture: {
    title: 'Step-by-Step Instagram Onboarding Guide',
    description: 'Follow these video-verified steps to authenticate with Meta and activate your Instagram Direct integration.',
  },
  benefits: [
    {
      title: '24/7 Autonomous AI Agent DM Replies',
      description: 'Your AI agent instantly responds to direct messages around the clock, answering customer questions from your business knowledge base and guiding followers to purchase.',
      highlight: 'Instant 24/7 DM Answers'
    },
    {
      title: 'Story Mention & Reaction Triggers',
      description: 'Automatically detect when followers or influencers mention your handle in Instagram Stories. Trigger instant thank-you DMs, special promo codes, and capture new leads.',
      highlight: 'Auto-Engage Story Mentions'
    },
    {
      title: 'Post & Reel Comment-to-DM Automation',
      description: 'Trigger automated workflows when users comment on your Instagram Posts or Reels (e.g. comment "LINK" or "PRICE"), instantly sending a DM with checkout links.',
      highlight: 'Comment Keyword Automation'
    },
    {
      title: 'Direct Official Meta Graph API Connection',
      description: 'Connect directly to Meta\'s official Instagram Graph API without expensive broker markups. Enjoy maximum message delivery speed, rich media support, and verified brand security.',
      highlight: 'Zero Middleman Fees'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Channels Console & Initiate Instagram Connection',
      description: 'In your orbionagents dashboard, navigate to Channels & Integration. Locate the "Instagram (Meta Business)" card and click the "Connect >" button to launch the Meta authorization flow.',
      screenshot: '/images/docs/whatsapp-connect/instagram/step_1.png',
      caption: 'Channels Dashboard — Click "Connect >" on the Instagram Meta Business card.',
      highlight: '1-Click Initiation',
      uiElements: ['Channels Dashboard', 'Instagram card', 'Connect > button']
    },
    {
      step: 2,
      title: 'Select Linked Facebook Business Page',
      description: 'The Meta OAuth window opens prompting "Choose the Pages you want orbionagents to access". Select the Facebook Page that is linked to your Instagram account (e.g., "Auromind Ai") and click "Continue".',
      screenshot: '/images/docs/whatsapp-connect/instagram/step_2.png',
      caption: 'Choose Facebook Pages — Select your linked Facebook Page and click "Continue".',
      highlight: 'Page Selection',
      uiElements: ['Page selector radio', 'Connected Facebook Page', 'Continue button']
    },
    {
      step: 3,
      title: 'Choose Meta Business Portfolio',
      description: 'Select your designated Meta Business Portfolio (e.g., "orbionagents") that manages your business assets, then click "Continue" to proceed.',
      screenshot: '/images/docs/whatsapp-connect/instagram/step_3.png',
      caption: 'Choose Business Portfolio — Select your Meta Business Portfolio and click "Continue".',
      highlight: 'Portfolio Binding',
      uiElements: ['Business portfolio list', 'Portfolio selection checkbox', 'Continue button']
    },
    {
      step: 4,
      title: 'Select Instagram Professional Account',
      description: 'Meta displays the Instagram accounts linked to your business. Select your target Instagram professional account (e.g., "auromind_ai") and click "Continue".',
      screenshot: '/images/docs/whatsapp-connect/instagram/step_4.png',
      caption: 'Choose Instagram Account — Select your Instagram professional handle and click "Continue".',
      highlight: 'Handle Selection',
      uiElements: ['Instagram account list', 'Account checkbox', 'Continue button']
    },
    {
      step: 5,
      title: 'Review & Grant Required Meta Permissions',
      description: 'Review the permissions requested by orbionagents: Manage business, Access profile and posts, Manage comments, and Manage & access messages for the Instagram account. Click "Save" to authorize.',
      screenshot: '/images/docs/whatsapp-connect/instagram/step_5.png',
      caption: 'Review Access Request — Verify requested permissions and click "Save".',
      highlight: 'Permissions Grant',
      uiElements: ['Permissions checklist', 'Messages access toggle', 'Save button']
    },
    {
      step: 6,
      title: 'Confirm Authorization & Complete Connection',
      description: 'The popup displays confirmation: "Auromind Ai has been connected to orbionagents". Click the "Got it" button. The modal closes and returns you to your Channels dashboard.',
      screenshot: '/images/docs/whatsapp-connect/instagram/step_6.png',
      caption: 'Connection Completed — Confirmation screen displaying account connected to orbionagents.',
      highlight: 'Handshake Complete',
      uiElements: ['Confirmation banner', 'Business integrations link', 'Got it button']
    }
  ],
  activeConsoleScreenshot: '/images/docs/whatsapp-connect/instagram/expected-result.png',
  expectedOutcome: 'Your official Instagram Professional account is connected and active. Direct messages, story mentions, and comment inquiries automatically route to your 24/7 AI agent and trigger visual automation flows in the Omni-Channel Inbox.',
  troubleshooting: [
    {
      question: "Why doesn't my Instagram account appear in the Meta login list in Step 4?",
      answer: "Ensure your Instagram account is switched to a Professional account (Business or Creator tier) and is linked to an active Facebook Page. Personal Instagram accounts are not supported by Meta's API."
    },
    {
      question: "How do I enable the AI Agent to access Instagram Direct Messages?",
      answer: "In the Instagram mobile app, open Settings > Privacy > Messages, and ensure the toggle for 'Allow Access to Messages' is switched ON. Without this mobile setting enabled, Meta restricts third-party message access."
    },
    {
      question: "Can the AI Agent reply to Instagram Story mentions?",
      answer: "Yes! When a customer or follower mentions your Instagram handle in their story, orbionagents automatically detects the mention and can trigger an AI thank-you reply or promotional link directly in their DM."
    },
    {
      question: "Can I manage both WhatsApp and Instagram conversations in the same inbox?",
      answer: "Yes! All customer messages from WhatsApp and Instagram Direct are unified seamlessly in the Omni-Channel Inbox with channel badges, customer history, and full team collaboration tools."
    },
    {
      question: "Will automated comment replies cause my account to be flagged by Instagram?",
      answer: "No. orbionagents uses Meta's official Graph API and adheres strictly to Instagram's rate limits and messaging policies, ensuring 100% compliant and safe automation."
    }
  ]
};

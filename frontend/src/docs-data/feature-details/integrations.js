export const integrationsDetail = {
  slug: 'integrations',
  aliasSlugs: ['features/integrations', 'integrations/whatsapp-cloud-api'],
  featureNumber: '08',
  category: 'Omni-Gateway & Channel Connectivity',
  title: 'WhatsApp Business & Multi-Channel Messaging',
  tagline: 'Connect your official WhatsApp Business number to automate conversations, deploy 24/7 AI agents, and send interactive templates.',
  description: 'The WhatsApp Cloud API integration connects your official WhatsApp Business account directly to orbionagents. Once connected, your platform automatically powers 24/7 AI agent replies, triggers visual automation flows, and broadcasts pre-approved interactive message templates with quick-reply buttons — all managed seamlessly in one unified console without expensive third-party tools.',
  visualKey: 'integrations',
  videoUrl: '/videos/IMG_3477.mp4',
  videoFallbackUrl: '/videos/IMG_3477.MOV',
  videoPlaceholder: {
    title: 'Connecting WhatsApp Business via Meta Cloud API',
    description: 'Official end-to-end video walkthrough demonstrating 1-click WhatsApp connection using Meta Facebook Login for Business embedded onboarding.',
    duration: '1:03 min walkthrough',
    url: '/videos/IMG_3477.mp4',
    fallbackUrl: '/videos/IMG_3477.MOV',
    poster: '/images/docs/whatsapp-connect/step-1-channels-dashboard.png'
  },
  connectionRules: [
    {
      ruleNumber: '01',
      title: 'New WhatsApp Number',
      badge: 'Mandatory Requirement',
      status: 'Required',
      description: 'A fresh, dedicated phone number with active SMS or voice capability to receive the 6-digit OTP verification code. This number must not be currently active on any personal WhatsApp or WhatsApp Business mobile app.',
      details: 'Meta Cloud API requires sole ownership of the phone number. Landline or mobile numbers are both supported as long as they can receive verification calls or text messages.'
    },
    {
      ruleNumber: '02',
      title: 'Facebook Account Mandatory',
      badge: 'Meta Authentication',
      status: 'Required',
      description: 'An active Facebook personal profile is strictly required to authenticate into Meta Business Manager and complete the Facebook Login for Business onboarding modal.',
      details: 'Your Facebook profile must have administrator rights or permission to create and manage the designated Meta Business Portfolio.'
    },
    {
      ruleNumber: '03',
      title: 'Already Existing Number? Delete WhatsApp Account First',
      badge: 'Critical Action',
      status: 'Action Needed',
      description: 'If your phone number is currently active on personal WhatsApp or WhatsApp Business app on your mobile phone, you MUST delete the WhatsApp account from the mobile app settings before connecting.',
      details: 'Open WhatsApp on mobile > Settings > Account > Delete my account. Once deleted, the number is freed up for Meta Cloud API registration. Make sure to back up any personal chat histories before deletion.'
    }
  ],
  architecture: {
    title: 'Step-by-Step WhatsApp Onboarding Guide',
    description: 'Follow these video-verified steps to authenticate with Meta and activate your WhatsApp Cloud API integration.',
  },
  benefits: [
    {
      title: '24/7 Autonomous AI Agent Reply',
      description: 'Your AI agent instantly understands customer questions, references your business knowledge base, and replies in natural language — resolving inquiries, capturing leads, and booking appointments 24/7.',
      highlight: 'Instant 24/7 AI Answers'
    },
    {
      title: 'Visual Automation Flows & Triggers',
      description: 'Design custom automation journeys that trigger automatically when customers message. Collect contact details, assign tags, send scheduled follow-ups, and route complex chats to team members.',
      highlight: 'No-Code Automated Flows'
    },
    {
      title: 'Interactive WhatsApp Message Templates',
      description: 'Send pre-approved Meta message templates for welcome notifications, order updates, reminders, and marketing broadcasts featuring interactive quick-reply buttons and clickable links.',
      highlight: 'Rich Media & Quick Buttons'
    },
    {
      title: 'Direct Official Meta Connection',
      description: 'Connect directly to WhatsApp through Meta\'s official Cloud API. Enjoy the lowest messaging costs with zero broker markups, maximum delivery speed, and official WhatsApp verified branding.',
      highlight: 'Zero Middleman Fees'
    }
  ],
  beforeYouStart: [
    {
      title: 'Meta Business Manager Admin Access',
      description: 'Admin access to your Meta Business portfolio to create apps and generate System User tokens.'
    },
    {
      title: 'Dedicated Phone Number',
      description: 'A clean phone number not currently registered to a personal WhatsApp account for WhatsApp Business Cloud API.'
    },
    {
      title: 'Valid Business Documents',
      description: 'Official business registration documents if lifting Meta tier messaging limits from 250 to 1,000+ chats/day.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Channels Console & Initiate Connection',
      description: 'In your dashboard, navigate to Channels & Integration. Locate the "WhatsApp Business (Meta Cloud API)" card and click the "Connect >" button to initiate Meta Embedded Signup.',
      screenshot: '/images/docs/whatsapp-connect/step-1-channels-dashboard.png',
      caption: 'Channels Dashboard — Click "Connect >" on the WhatsApp Business Meta Cloud API card.',
      highlight: '1-Click Initiation',
      uiElements: ['Channels Dashboard', 'WhatsApp Business card', 'Connect button']
    },
    {
      step: 2,
      title: 'Meta Facebook Login for Business Window',
      description: 'A secure popup window from Meta (Facebook Login for Business) opens displaying "Seamlessly connect your account to orbionagents". Review permissions and click "Continue" to authorize the integration.',
      screenshot: '/images/docs/whatsapp-connect/step-2-meta-login-continue.png',
      caption: 'Meta Facebook Login for Business modal — Review terms and click "Continue".',
      highlight: 'Meta OIDC Auth',
      uiElements: ['Facebook Login Modal', 'Permissions Overview', 'Continue Button']
    },
    {
      step: 3,
      title: 'Select or Create Meta Business Portfolio',
      description: 'Choose an existing Meta Business Portfolio or select "Create a business portfolio". Then select or create your WhatsApp Business Account and click "Next".',
      screenshot: '/images/docs/whatsapp-connect/step-3-select-portfolio.png?v=2',
      caption: 'Asset Selection — Select your Business Portfolio and WhatsApp Business Account.',
      highlight: 'Portfolio Binding',
      uiElements: ['Business portfolio dropdown', 'WhatsApp Business account dropdown', 'Next button']
    },
    {
      step: 4,
      title: 'Enter Business Profile Information',
      description: 'Enter your business profile details: Business Name, Official Email, Category (e.g. Professional services), Country (e.g. India), Website, and Time Zone (GMT+05:30 Asia/Kolkata), then click "Next".',
      screenshot: '/images/docs/whatsapp-connect/step-4-business-information.png?v=2',
      caption: 'Business Info Form — Fill in Name, Email, Category, Country, and Timezone.',
      highlight: 'Profile Setup',
      uiElements: ['Business Name', 'Category selector', 'Country & Timezone', 'Next button']
    },
    {
      step: 5,
      title: 'Add WhatsApp Phone Number & Display Name',
      description: 'Provide your WhatsApp Business Display Name (adhering to Meta guidelines). Select country code (e.g. IN +91), enter your dedicated phone number, choose OTP verification method (Text message or Phone call), and click "Next".',
      screenshot: '/images/docs/whatsapp-connect/step-5-phone-number-entry.png?v=2',
      caption: 'Phone Registration — Input WhatsApp Display Name, Phone Number, and verification method.',
      highlight: 'Dedicated Number',
      uiElements: ['Display Name input', 'Country code selector', 'Phone number input', 'Text/Call verification radio']
    },
    {
      step: 6,
      title: 'Verify Phone Number via 6-Digit Code',
      description: 'Check your mobile device for the 6-digit verification code sent by Meta via SMS or voice call. Enter the 6 digits into the verification input fields to confirm number ownership.',
      screenshot: '/images/docs/whatsapp-connect/step-6-otp-verification.png',
      caption: 'OTP Verification — Enter the 6-digit confirmation code received on your phone.',
      highlight: 'Instant Verification',
      uiElements: ['6-Digit OTP inputs', 'Resend code link', 'Code sent notification']
    },
    {
      step: 7,
      title: 'Finalize Permissions & Compliance Review',
      description: 'The modal confirms "Your account is connected to orbionagents". Meta performs a brief compliance review against the WhatsApp Business Messaging Policy. Optionally add a payment method or click "Finish".',
      screenshot: '/images/docs/whatsapp-connect/step-7-connection-complete.png',
      caption: 'Connection Completed — Confirmation screen displaying account connected to orbionagents.',
      highlight: 'Meta Compliant',
      uiElements: ['Success Confirmation', 'Policy Compliance notice', 'Finish button']
    }
  ],
  activeConsoleScreenshot: '/images/docs/whatsapp-connect/step-8-connected-status.png',
  expectedOutcome: 'Your official WhatsApp Business number is connected and active. Incoming customer messages automatically route to your 24/7 AI agent, trigger visual automation flows, and enable interactive template messaging.',
  troubleshooting: [
    {
      question: "Why didn't I receive the 6-digit OTP verification code on my phone?",
      answer: 'Ensure your phone number has active mobile network coverage and can receive SMS or voice calls. If SMS does not arrive within 60 seconds, choose the "Phone call" option to receive the OTP via an automated voice call. Also confirm the number is not currently registered on a personal WhatsApp or WhatsApp Business mobile app.'
    },
    {
      question: 'Can I connect my existing personal or business WhatsApp number?',
      answer: 'Yes! However, you must first delete your WhatsApp account from your mobile phone app (Open WhatsApp > Settings > Account > Delete my account) before connecting. Once deleted, the number is freed up for Meta Cloud API registration. Be sure to back up important chat history before deleting.'
    },
    {
      question: 'How does the AI Agent know how to reply to my customers?',
      answer: "Your AI agent automatically references your business knowledge base, uploaded product catalogs, FAQs, and workspace documents. You can customize the agent's prompt, tone of voice, and answering guidelines anytime in the AI Agent Settings."
    },
    {
      question: 'Why are automated message templates not reaching customers?',
      answer: 'WhatsApp requires business-initiated messages sent outside the 24-hour customer window to use pre-approved Meta message templates. Check your Templates tab in the admin dashboard to confirm your template is approved by Meta with an active status.'
    },
    {
      question: 'Do I need to keep my computer or phone turned on for AI agent replies?',
      answer: 'No. Orbion Agents operates 24/7 on high-availability cloud servers. Once connected, your AI agents and automated flows reply to customer inquiries instantly around the clock, even when your computer or phone is turned off.'
    }
  ]
};

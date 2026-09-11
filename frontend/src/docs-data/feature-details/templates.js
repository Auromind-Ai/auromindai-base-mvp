export const templatesDetail = {
  slug: 'features/templates',
  aliasSlugs: ['templates', 'whatsapp-templates', 'features/whatsapp-templates'],
  featureNumber: '05',
  category: 'Channel Automation & Messaging',
  title: 'WhatsApp Message Templates & AI Studio',
  tagline: 'Design, preview, and dispatch Meta-approved WhatsApp broadcast and transactional templates with AI assistance.',
  description: 'The WhatsApp Message Template Studio in Orbion Agents enables businesses to compose, customize, and submit Meta-compliant message templates for official approval. Powered by built-in AI copy generation, dynamic variable injection ({{1}}, {{2}}), and interactive CTA buttons, your team can easily initiate customer conversations outside the standard 24-hour service window and launch high-converting marketing or transactional campaigns directly from the Omni-Channel Inbox.',
  visualKey: 'templates',
  heroScreenshot: '/images/docs/whatsapp_template/wt_step_1.png',
  activeConsoleScreenshot: '/images/docs/whatsapp_template/wt_step_11.png',

  rulesPolicyBadge: 'Strict Meta Policy',
  rulesTitle: 'WhatsApp Template Creation Prerequisites & Rules',
  rulesDescription: 'Before creating or submitting message templates, ensure your WhatsApp account is connected and your message structure complies with Meta\'s official guidelines.',
  rulesBadge: '3 Mandatory Rules',

  connectionRules: [
    {
      ruleNumber: '01',
      title: 'WhatsApp Business Account Connected (Mandatory)',
      badge: 'Mandatory Prerequisite',
      status: 'Required',
      description: 'You must have an active WhatsApp Business number connected via WhatsApp Cloud API or Twilio before creating templates. Without a connected WhatsApp account, templates cannot be submitted or reviewed by Meta.',
      details: 'Meta Guideline: Complete your WhatsApp Cloud API or Twilio connection in the Channels & Integration console before accessing the Template Studio.'
    },
    {
      ruleNumber: '02',
      title: 'Consecutive Variable Ordering ({{1}}, {{2}})',
      badge: 'Meta Formatting Rule',
      status: 'Required',
      description: 'Dynamic variables must strictly follow sequential numerical order starting at {{1}} (e.g. {{1}}, {{2}}, {{3}}). Skipping numbers, starting at {{0}}, or placing variables inside headers/footers will cause instant Meta rejection.',
      details: 'Formatting Rule: Placeholders must be enclosed in double curly braces: {{1}} for Name, {{2}} for Order ID, {{3}} for Date/Time.'
    },
    {
      ruleNumber: '03',
      title: 'Accurate Category & Content Compliance',
      badge: 'Policy Compliance',
      status: 'Required',
      description: 'Select the exact category that matches your message intent: Utility (transactional alerts, receipts, reminders), Marketing (promotions, offers, product launches), or Authentication (one-time passwords OTP).',
      details: 'Meta Policy: Marketing content disguised as Utility templates will be automatically flagged and rejected by Meta\'s automated review system.'
    }
  ],

  benefits: [
    {
      title: 'AI-Powered Template Generation',
      description: 'Generate high-converting, professional WhatsApp copy in seconds. Simply input a short prompt, pick a tone (Exciting, Normal, or Funny), and get 3 polished variations instantly.',
      highlight: 'Instant 10 WCC AI Copy'
    },
    {
      title: 'Real-Time Smartphone Live Preview',
      description: 'Preview exactly how your template looks on iOS and Android devices in real time, including custom header text, emojis, bold/italic text, variable placeholders, and interactive CTA buttons.',
      highlight: 'Pixel-Perfect Preview'
    },
    {
      title: 'Interactive CTA Buttons & Quick Replies',
      description: 'Boost customer response rates by up to 3x with clickable action buttons (e.g., "Buy Now" website URLs) and one-tap quick replies for instantaneous customer engagement.',
      highlight: 'High-Conversion CTAs'
    },
    {
      title: '1-Click Omni-Channel Inbox Dispatch',
      description: 'Launch approved templates directly from the Omni-Channel Inbox. Fill dynamic variables in a simple modal and send personalized WhatsApp notifications outside the 24-hour window.',
      highlight: 'Zero-Friction Sending'
    }
  ],

  architecture: {
    title: 'Step-by-Step Template Creation, Approval & Dispatch Guide',
    description: 'Follow this comprehensive 13-step visual tutorial to build, preview, submit, and dispatch Meta-approved WhatsApp message templates in Orbion Agents.'
  },

  setupSteps: [
    {
      step: 1,
      title: 'Navigate to Message Templates & Click "+ New Template"',
      description: 'Open the Message Templates console in your Orbion Agents admin dashboard (/user/admin/templates). To begin creating a new WhatsApp template, click the purple "+ New Template" button located at the top-right corner of the dashboard (highlighted in the red box).',
      screenshot: '/images/docs/whatsapp_template/wt_step_1.png',
      caption: 'Templates Dashboard — Click the purple "+ New Template" button in the top right.',
      highlight: 'Initiate Creation',
      uiElements: ["Message Templates Dashboard", "'+ New Template' Button (Top Right)", "Template Metrics Overview"]
    },
    {
      step: 2,
      title: 'Select Category, Template Type & Language',
      description: 'On the left configuration sidebar (highlighted in the red box), configure your template parameters: choose the Category (Utility or Authentication), select the Template Type (Text, Image, or Video), and pick your target Language (e.g., English (US), Tamil, or Hindi). Meta evaluates your template against these exact settings.',
      screenshot: '/images/docs/whatsapp_template/wt_step_2.png',
      caption: 'Left Configuration Sidebar — Select Category, Template Type, and Language.',
      highlight: 'Sidebar Configuration',
      uiElements: ["Category Selector (Utility / Authentication)", "Template Type (Text / Image / Video)", "Language Selector (English / Tamil / Hindi)"]
    },
    {
      step: 3,
      title: 'Enter AI Prompt & Click Generate',
      description: 'Save time by using the built-in AI Template Generator. Type a short description of the message you want to create into the "Write your prompt here" field (for example, "create new product launch template"), select your desired tone (Normal, Exciting, or Funny), and click the "Generate (10 WCC)" button. The AI crafts 3 tailored template variations with optimal variable placement.',
      screenshot: '/images/docs/whatsapp_template/wt_step_3.png',
      caption: 'AI Generator — Enter your prompt, select tone, and click "Generate (10 WCC)".',
      highlight: 'AI Copywriting',
      aspectRatio: 'aspect-[16/10]',
      objectFit: 'contain',
      uiElements: ["'Write your prompt here' Box", "Tone Chips (Normal / Exciting / Funny)", "'Generate (10 WCC)' Button", "3 Generated Variations"]
    },
    {
      step: 4,
      title: 'Review Generated Samples & Click "Use this"',
      description: 'Review the 3 generated template options. Identify the copy that best fits your campaign and click the "Use this" button (highlighted in the red box) on that card. The selected template content will instantly update the smartphone preview on the right and fill the editing fields below.',
      screenshot: '/images/docs/whatsapp_template/wt_step_4.png',
      caption: 'Template Variations — Click "Use this" to load the copy into the editor and preview.',
      highlight: 'Select Variation',
      aspectRatio: 'aspect-[16/9]',
      objectFit: 'contain',
      uiElements: ["3 AI Template Cards", "'Use this' Button (Highlighted in Red)", "Live Smartphone Preview Sync"]
    },
    {
      step: 5,
      title: 'Set Template Name, Header Text & Edit Message Content',
      description: 'Enter a mandatory Template Name using only lowercase alphanumeric characters and underscores (e.g., "product_launch" — Meta does not allow spaces or special symbols). Optionally add an attention-grabbing Header Text (up to 60 characters), and review or edit the message body using bold (*text*), italic (_text_), and variables like {{1}} and {{2}}.',
      screenshot: '/images/docs/whatsapp_template/wt_step_5.png',
      caption: 'Template Details — Enter lowercase Template Name, optional Header, and Message Content.',
      highlight: 'Content & Name',
      aspectRatio: 'aspect-[16/10]',
      objectFit: 'contain',
      uiElements: ["Lowercase Template Name ('product_launch')", "Optional Header Text (Max 60 chars)", "Message Content Editor", "Dynamic Variables ({{1}}, {{2}})"]
    },
    {
      step: 6,
      title: 'Configure Interactive Action Buttons & Quick Replies',
      description: 'Elevate engagement by attaching interactive actions. Under "Interactive Actions", select "Quick to Actions", choose "URL" as the Action Type, enter a concise Button Title (such as "Buy Now"), and provide your target Website URL. You can also configure Quick Replies for fast one-tap customer answers.',
      screenshot: '/images/docs/whatsapp_template/wt_step_6.png',
      caption: 'Interactive Actions — Add Call to Action URL button with "Buy Now" title.',
      highlight: 'CTA Buttons',
      aspectRatio: 'aspect-[16/7]',
      objectFit: 'contain',
      uiElements: ["Interactive Actions Selector", "Action Type: URL", "Button Title: 'Buy Now'", "Destination Website URL"]
    },
    {
      step: 7,
      title: 'Verify Layout in Smartphone Live Preview',
      description: 'Examine the live interactive smartphone simulator on the right side of the screen. Validate that your Header ("Hello user"), personalized body copy with variables, optional Footer ("Thank you"), and clickable CTA button ("Buy Now") render perfectly as a realistic WhatsApp message.',
      screenshot: '/images/docs/whatsapp_template/wt_step_7.png',
      caption: 'Smartphone Live Preview — Inspect Header, body copy, footer, and CTA button.',
      highlight: 'Visual Inspection',
      aspectRatio: 'aspect-[4/5] max-w-[340px] mx-auto',
      objectFit: 'contain',
      uiElements: ["Device Mockup", "Header & Body Typography", "Footer Note Rendering", "CTA Button Alignment"]
    },
    {
      step: 8,
      title: 'Submit Template for Official Meta Review',
      description: 'After verifying all copy, variables, and interactive buttons, scroll to the bottom of the builder and click the purple "Submit" button (highlighted in the red box). This sends your template directly to Meta\'s WhatsApp Business Cloud API for automated compliance review.',
      screenshot: '/images/docs/whatsapp_template/wt_step_8.png',
      caption: 'Bottom Form Action — Click the purple "Submit" button to send to Meta for approval.',
      highlight: 'Submit to Meta',
      aspectRatio: 'aspect-[2/3] max-w-[380px] mx-auto',
      objectFit: 'contain',
      uiElements: ["Purple 'Submit' Button (Highlighted in Red)", "Field Validation Check", "Meta API Dispatch"]
    },
    {
      step: 9,
      title: 'Track Pending Approval Status (1 Min to 24 Hours)',
      description: 'Upon submission, your template appears on the Message Templates dashboard with an amber "Pending" badge. Under Meta\'s automated review policy, AI algorithms evaluate template compliance typically within 1 minute to 24 hours. Meta checks for valid formatting, sequential variables, and policy adherence.',
      screenshot: '/images/docs/whatsapp_template/wt_step_9.png',
      caption: 'Message Templates Dashboard — Template listed in "Pending" status awaiting Meta review.',
      highlight: 'Pending Review',
      uiElements: ["'Pending' Status Badge", "Dashboard Filter Tabs", "Meta Automated Review Policy"]
    },
    {
      step: 10,
      title: 'Inspect Pending Template with Modal Preview',
      description: 'While your template is undergoing review, click the "Preview" button on the template card to open a modal inspection view. You can review the exact message layout, variables, header, and CTA buttons to ensure everything was submitted correctly.',
      screenshot: '/images/docs/whatsapp_template/wt_step_10.png',
      caption: 'Pending Template Modal — Click "Preview" to verify template details while awaiting approval.',
      highlight: 'Modal Inspection',
      aspectRatio: 'aspect-[5/4] max-w-[460px] mx-auto',
      objectFit: 'contain',
      uiElements: ["'Preview' Button on Template Card", "Modal Popup Inspection", "Header, Body, & Tag Confirmation"]
    },
    {
      step: 11,
      title: 'Access Approved Templates & Click "Use template"',
      description: 'Once approved by Meta, your template moves to the "Approved" tab with a green "Approved" badge. To use this template in an active customer conversation, click the purple "Use template ↗" button directly on the approved card.',
      screenshot: '/images/docs/whatsapp_template/wt_step_11.png',
      caption: 'Approved Tab — Template approved by Meta with green badge; click "Use template ↗".',
      highlight: 'Approved & Ready',
      uiElements: ["'Approved' Tab Filter", "Green 'Approved' Status Badge", "'Use template ↗' Action Button"]
    },
    {
      step: 12,
      title: 'Fill Variable Values & Click "Proceed to Inbox"',
      description: 'A "Fill Template Variables" modal opens displaying input fields for each dynamic placeholder (e.g., {{1}}, {{2}}, {{3}}, {{4}}). Enter the personalized values for your customer, review the real-time Message Preview at the bottom of the modal, and click the purple "Proceed to Inbox" button (highlighted in the red box).',
      screenshot: '/images/docs/whatsapp_template/wt_step_12.png',
      caption: 'Fill Template Variables Modal — Enter variable data and click "Proceed to Inbox".',
      highlight: 'Dynamic Variables',
      aspectRatio: 'aspect-[1/1] max-w-[480px] mx-auto',
      objectFit: 'contain',
      uiElements: ["'Fill Template Variables' Modal", "Variable Input Fields ({{1}} - {{4}})", "'Proceed to Inbox' Button (Highlighted in Red)"]
    },
    {
      step: 13,
      title: 'Dispatch Template to Customer via Omni-Channel Inbox',
      description: 'You are redirected directly to the Omni-Channel Inbox with the customer\'s chat open. The pre-filled template message is loaded into the composer marked with an "Active Template" badge. Review the message and tap the green Send button to dispatch the WhatsApp message to your customer outside the 24-hour service window.',
      screenshot: '/images/docs/whatsapp_template/wt_step_13.png',
      caption: 'Omni-Channel Inbox — Template pre-loaded in composer with Active Template tag; click Send.',
      highlight: 'Live Dispatch',
      uiElements: ["Omni-Channel Inbox Interface", "'Active Template' Composer Tag", "Pre-filled Variable Message", "Green Send Button"]
    }
  ],

  expectedOutcome: 'Your WhatsApp template is officially approved by Meta, variable substitution is confirmed, and your team can initiate proactive customer reachouts outside the 24-hour window from the Omni-Channel Inbox or through automated AI Workflows.',
  verificationChecklist: [
    'Templates dashboard displays a green "Approved" status badge on the template card.',
    'Fill Template Variables modal previews dynamic customer parameters correctly.',
    'Template pre-loads smoothly into the Omni-Channel Inbox composer with an "Active Template" badge ready for dispatch.'
  ],

  troubleshooting: [
    {
      question: 'Why must my WhatsApp account be connected before creating templates?',
      answer: 'Meta requires all WhatsApp Business templates to be registered and authenticated under a verified WhatsApp Business Account (WABA). Because template submissions are processed directly through Meta\'s Cloud API endpoints tied to your business phone number, an active WhatsApp connection in Orbion Agents is mandatory.'
    },
    {
      question: 'How long does Meta take to approve a WhatsApp message template?',
      answer: 'Most message templates are reviewed and approved automatically by Meta\'s AI compliance algorithms within 1 minute to 2 hours. In rare cases where a template requires manual human review by Meta, the process may take up to 24 hours.'
    },
    {
      question: 'Why did Meta reject my WhatsApp message template?',
      answer: 'Common reasons for Meta template rejection include: (1) Non-sequential variables (e.g., using {{2}} without {{1}}), (2) Placing variables inside the header or footer, (3) Submitting promotional or discount copy under the "Utility" category instead of "Marketing", (4) Broken or URL shortener links in CTA buttons, or (5) Spelling errors and offensive language.'
    },
    {
      question: 'Can I edit an approved template directly?',
      answer: 'No. Meta does not permit direct in-place editing of approved templates to prevent abuse. If you need to make changes to an approved template, simply create a new template variation (e.g. "product_launch_v2"), submit it for approval, and delete or archive the obsolete template.'
    },
    {
      question: 'How do dynamic variables like {{1}} and {{2}} work in bulk campaigns?',
      answer: 'Dynamic variables are personalized per recipient. When sending templates from the Omni-Channel Inbox or via Broadcast campaigns, Orbion Agents automatically replaces {{1}} with the contact\'s first name, {{2}} with their order ID or appointment date, and {{3}} with custom tracking links based on your CRM data or uploaded CSV.'
    }
  ]
};

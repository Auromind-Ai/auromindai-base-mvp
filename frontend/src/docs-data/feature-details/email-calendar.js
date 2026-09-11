export const emailCalendarDetail = {
  slug: 'integrations/email-calendar',
  aliasSlugs: ['features/email-calendar', 'email-calendar'],
  featureNumber: '11',
  category: 'Omni-Gateway & Channel Connectivity',
  title: 'Gmail & Google Calendar Sync',
  tagline: 'Automate email replies and synchronize real-time demo bookings with Google Calendar.',
  description: 'The Google Workspace integration connects your Gmail and Google Calendar directly to Orbion Agents. Your 24/7 AI agents inspect real-time calendar availability during customer chats on WhatsApp and Instagram, book consultations with automatic Google Meet links, and draft intelligent email replies without requiring external booking links.',
  visualKey: 'email-calendar',
  heroScreenshot: '/images/docs/email-calendar/step_1.png',
  rulesTitle: 'Google Workspace Connect Rules & Requirements',
  rulesPolicyBadge: 'Google OAuth 2.0 Security',
  rulesBadge: '3 Core Requirements',
  rulesDescription: 'Review these essential requirements before connecting your Google account for automated email & calendar scheduling.',
  connectionRules: [
    {
      ruleNumber: '01',
      title: 'Google Workspace or Personal Gmail Account',
      badge: 'Account Access',
      status: 'Required',
      description: 'An active Google Workspace or personal Google account with access to Google Calendar and Gmail.',
      details: 'You can connect either a company Workspace email (e.g., alex@company.com) or a personal Gmail account (e.g., alex@gmail.com).'
    },
    {
      ruleNumber: '02',
      title: 'Google OAuth 2.0 Security Consent',
      badge: 'Zero Passwords',
      status: 'Required',
      description: 'Secure Single Sign-On (SSO) authentication directly managed by Google. Your password is never shared with Orbion Agents.',
      details: 'Clicking "Connect" launches official Google OAuth. You only need to sign in and authorize the connection once.'
    },
    {
      ruleNumber: '03',
      title: 'Calendar & Email Permissions Grant',
      badge: 'Calendar Access',
      status: 'Action Needed',
      description: 'Approve calendar and email permissions so your AI Agent can view your schedule, prevent overlapping meetings, and send meeting invites.',
      details: 'Ensure both "Google Calendar" and "Gmail" permission checkboxes are checked on the Google consent screen.'
    }
  ],
  architecture: {
    title: 'Step-by-Step Google Workspace Onboarding Guide',
    description: 'Follow these visual steps to authorize Google Calendar and Gmail with Orbion Agents in less than 2 minutes.',
  },
  benefits: [
    {
      title: 'Real-Time Calendar Availability Checks',
      description: 'AI agents inspect your live calendar schedule before proposing available meeting slots to customers, completely eliminating double bookings.',
      highlight: 'Zero Overlaps'
    },
    {
      title: 'In-Chat WhatsApp & Instagram Booking',
      description: 'Customers schedule consultations directly inside their WhatsApp or Instagram chat without navigating away to external Calendly booking pages.',
      highlight: 'Frictionless Booking'
    },
    {
      title: 'Instant Google Meet Video Links',
      description: 'Every appointment booked automatically generates a secure Google Meet conference link and sends calendar invitations to both host and client.',
      highlight: 'Auto Google Meet'
    },
    {
      title: 'Automated Gmail Inquiries & Lead Follow-ups',
      description: 'Synchronize inbound email inquiries with your Omni-Channel Inbox and let AI agents draft professional follow-ups and meeting confirmations.',
      highlight: 'Intelligent Follow-ups'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Channels Hub & Initiate Google Connection',
      description: 'In your Orbion Agents dashboard, navigate to Channels & Integration. Locate the "Gmail" or "Google Calendar" card and click the red "Connect >" button to launch the Google OAuth authorization flow.',
      screenshot: '/images/docs/email-calendar/step_1.png',
      caption: 'Channels Dashboard — Click "Connect >" on the Gmail or Google Calendar card.',
      highlight: '1-Click Launch',
      uiElements: ['Channels Dashboard', 'Google Calendar Card', 'Connect > Button']
    },
    {
      step: 2,
      title: 'Google Sign In & Select Your Account',
      description: 'The secure Google OAuth account selection screen opens. Select the Google Workspace or personal Google account you want your AI Agent to connect with.',
      screenshot: '/images/docs/email-calendar/step_2.png',
      caption: 'Google OAuth — Choose the Google account you wish to connect with Orbion Agents.',
      highlight: 'Google Sign-In',
      uiElements: ['Google OAuth Screen', 'Account Selector', 'Workspace Account']
    },
    {
      step: 3,
      title: 'Grant Calendar & Email Permissions',
      description: 'Google displays the requested permissions for Orbion Agents. Confirm access for Google Calendar (checking availability and scheduling events) and Gmail (sending confirmation emails), then click "Continue".',
      screenshot: '/images/docs/email-calendar/step_3.png',
      caption: 'Permissions Consent — Allow Google Calendar and Gmail permissions and click "Continue".',
      highlight: 'Grant Permissions',
      uiElements: ['Google Calendar Scope', 'Gmail Scope', 'Continue Button']
    },
    {
      step: 4,
      title: 'Secure Token Verification & Handshake',
      description: 'Orbion Agents securely exchanges the OAuth grant with Google, generates encrypted access tokens, and verifies calendar read/write access in real time.',
      screenshot: '/images/docs/email-calendar/step_4.png',
      caption: 'Token Handshake — Orbion Agents verifies credentials and establishes an encrypted real-time sync.',
      highlight: 'Secure Handshake',
      uiElements: ['OAuth Verification', 'Encrypted Handshake', 'Success Notification']
    },
    {
      step: 5,
      title: 'Channels Dashboard Shows Connected Status',
      description: 'Return to your Channels & Integrations dashboard. Both Gmail and Google Calendar now display a green "✓ Connected" status badge with your connected email handle, ready for automated scheduling.',
      screenshot: '/images/docs/email-calendar/step_5.png',
      caption: 'Active Channels — Gmail and Google Calendar display green "✓ Connected" badges.',
      highlight: 'Active & Verified',
      uiElements: ['✓ Connected Badges', 'Connected Email Address', 'Settings Gear Icon']
    }
  ],
  activeConsoleScreenshot: '/images/docs/email-calendar/verify.png',
  expectedOutcome: 'Your Gmail & Google Calendar accounts are active and synchronized. AI Agents can instantly check your real-time availability during customer chats on WhatsApp and Instagram, automatically schedule client meetings with Google Meet links, and draft professional email responses.',
  verificationChecklist: [
    'Channels dashboard displays green "✓ Connected" status badges for Gmail and Google Calendar.',
    'Live Calendar view (/user/admin/calendar) displays upcoming scheduled consultations and Google Meet video links.',
    'AI Agent conversationally offers available time slots to leads on WhatsApp and Instagram.',
    'New client bookings instantly appear in your Google Calendar mobile and desktop apps.'
  ],
  troubleshooting: [
    {
      question: "How does the AI Agent know when I am free for meetings?",
      answer: "The AI agent checks your connected Google Calendar in real time before proposing available time slots to customers on WhatsApp or Instagram, ensuring zero double bookings or overlaps."
    },
    {
      question: "Can I connect both my personal Gmail and business Google Workspace accounts?",
      answer: "Yes. You can authenticate any Google Workspace or personal Google account that has Google Calendar enabled."
    },
    {
      question: "Does the customer receive an automatic calendar invite with a Google Meet link?",
      answer: "Yes. As soon as the customer confirms their preferred time slot in the chat, Orbion Agents automatically creates the event on your Google Calendar and sends a calendar invite with a Google Meet video link to the customer's email."
    },
    {
      question: "What happens if a customer wants to reschedule or cancel a meeting?",
      answer: "The customer can simply message your AI Agent on WhatsApp or Instagram requesting a new time. The AI checks your updated calendar availability and reschedules the appointment automatically."
    },
    {
      question: "How do I disconnect or switch to a different Google account?",
      answer: "In the Channels & Integrations page, click the Settings icon next to the connected Gmail or Google Calendar card, click 'Disconnect', and then reconnect using your new Google account."
    }
  ]
};

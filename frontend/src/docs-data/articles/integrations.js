export const INTEGRATIONS_ARTICLES = {
  "integrations/whatsapp-cloud-api": {
    slug: "integrations/whatsapp-cloud-api",
    category: "Channels & Integrations",
    title: "WhatsApp Business Cloud API",
    subtitle: "Connect your official WhatsApp Business number via Meta Cloud API with webhooks and 24-hr window handling.",
    readTime: "8 min read",
    lastUpdated: "June 2026",
    whatIsIt: "The WhatsApp Business Cloud API integration connects your workspace directly to Meta's enterprise messaging infrastructure. It provides official green-tick verification capability, multi-agent access, automated AI replies, and interactive message buttons on your business phone number.",
    whyUseIt: "Unlike unofficial WhatsApp Web scraping bots that risk permanent number bans, Meta Cloud API provides 99.99% uptime, enterprise throughput (up to 1,000 messages/sec), and direct compliance with WhatsApp terms of service.",
    beforeYouStart: [
      "A Meta for Developers account (https://developers.facebook.com).",
      "A verified Meta Business Manager account.",
      "A dedicated phone number not currently registered on a personal WhatsApp phone app."
    ],
    steps: [
      {
        step: 1,
        title: "Create a Meta Developer App",
        instruction: "Log into developers.facebook.com, click 'Create App', select 'Other' -> 'Business', and add the 'WhatsApp' product to your app.",
        uiElements: ["Meta App Dashboard", "'Add WhatsApp' card", "'API Setup' tab"]
      },
      {
        step: 2,
        title: "Retrieve Credentials from Meta",
        instruction: "In Meta App Dashboard -> WhatsApp -> API Setup, copy your 'Phone Number ID', 'WhatsApp Business Account ID (WABA ID)', and generate a 'System User Permanent Access Token'.",
        uiElements: ["'Phone Number ID' field", "'WABA ID' field", "Permanent Token generator"]
      },
      {
        step: 3,
        title: "Open Channels in OrbionAgents",
        instruction: "In your OrbionAgents workspace, navigate to 'Channels' (/user/admin/channels) and click 'Connect' on the WhatsApp Business card.",
        uiElements: ["'Channels' menu item", "WhatsApp card with green border", "'Connect' button"]
      },
      {
        step: 4,
        title: "Input API Credentials",
        instruction: "Paste your Phone Number ID, WABA ID, and Permanent Access Token into the connection modal, then copy your unique OrbionAgents Webhook Callback URL and Verify Token.",
        uiElements: ["Credentials modal", "'Phone Number ID' input", "'Access Token' input", "'Webhook URL' copy button", "'Verify Token' field"]
      },
      {
        step: 5,
        title: "Configure Webhooks in Meta & Test",
        instruction: "In Meta App Dashboard -> WhatsApp -> Configuration, paste the Webhook URL and Verify Token, subscribe to the 'messages' event, and send a test WhatsApp message to verify the connection.",
        uiElements: ["Meta Webhook configuration panel", "'Verify and Save' button", "'messages' subscription checkbox"]
      }
    ],
    screenshots: [
      {
        src: "/images/ChannelImage.webp",
        alt: "WhatsApp Business Cloud API Connection Panel",
        caption: "Configuring WhatsApp Cloud API credentials and webhook endpoints in Channels."
      }
    ],
    expectedResult: "The WhatsApp Business card in OrbionAgents displays a glowing green 'Connected' badge. Inbound messages route immediately into your Omni-Inbox and trigger active Wires automations.",
    tips: [
      "Always generate a Permanent System User Token with `whatsapp_business_messaging` permissions so your connection does not expire after 60 days.",
      "Meta provides a 24-hour free-form messaging window whenever a customer contacts you; after 24 hours of inactivity, you must use an approved WhatsApp Template to re-engage."
    ],
    troubleshooting: [
      {
        issue: "Meta Webhook verification fails with 'Token does not match'?",
        solution: "Ensure you copied the exact Verify Token string shown in the OrbionAgents connection modal and that there are no leading or trailing whitespaces."
      },
      {
        issue: "Outbound messages fail with code 131026 ('Message undeliverable')?",
        solution: "This occurs if the recipient has blocked your number or if you attempted to send a regular message outside the 24-hour service window instead of an approved template."
      }
    ],
    seo: {
      title: "WhatsApp Business Cloud API Setup | OrbionAgents",
      description: "Step-by-step guide to connect Meta WhatsApp Business Cloud API with OrbionAgents for automated customer messaging.",
      keywords: ["WhatsApp Cloud API", "Meta WhatsApp integration", "WhatsApp business bot", "WABA setup"]
    }
  },

  "integrations/instagram": {
    slug: "integrations/instagram",
    category: "Channels & Integrations",
    title: "Instagram Graph API Integration",
    subtitle: "Automate direct messages (DMs), story mentions, and comment-to-DM funnels on Instagram.",
    readTime: "7 min read",
    lastUpdated: "June 2026",
    whatIsIt: "The Instagram Graph API integration connects your Instagram Professional or Creator account directly to OrbionAgents. It captures direct messages, sends automated replies, qualifies inbound leads from ad campaigns, and triggers instant DM delivery when users comment on your posts or reels.",
    whyUseIt: "Instagram is one of the highest-converting discovery channels for modern brands. Manually replying to hundreds of daily DMs and reel comments is impossible. OrbionAgents automates instant lead response while routing VIP inquiries to your support team.",
    beforeYouStart: [
      "An Instagram Professional (Business or Creator) account.",
      "A Facebook Page connected to your Instagram account.",
      "Admin access to the Meta Business Suite."
    ],
    steps: [
      {
        step: 1,
        title: "Enable Message Access on Instagram",
        instruction: "In the Instagram mobile app, navigate to Settings -> Privacy -> Messages and ensure 'Allow Access to Messages' is toggled ON.",
        uiElements: ["Instagram mobile app Privacy settings", "'Allow Access to Messages' toggle switch"]
      },
      {
        step: 2,
        title: "Open Channels in OrbionAgents",
        instruction: "Go to 'Channels' (/user/admin/channels) and click 'Connect' on the Instagram card.",
        uiElements: ["'Channels' menu item", "Instagram card with pink/purple gradient", "'Connect' button"]
      },
      {
        step: 3,
        title: "Authorize via Meta OAuth",
        instruction: "Click 'Login with Facebook / Meta' to authorize OrbionAgents with required permissions (`instagram_basic`, `instagram_manage_messages`).",
        uiElements: ["Meta OAuth popup dialog", "Page selection checkboxes", "'Confirm Permissions' button"]
      },
      {
        step: 4,
        title: "Select Your Instagram Business Account",
        instruction: "Select the Instagram page you wish to connect from the discovered list of profiles in your Meta Business Suite.",
        uiElements: ["Discovered Instagram accounts dropdown", "'Link Account' button"]
      },
      {
        step: 5,
        title: "Test Inbound DMs in Omni-Inbox",
        instruction: "Send a direct message from a test personal account to your business profile. Verify that the conversation appears immediately under the 'Instagram' filter in the Omni-Inbox.",
        uiElements: ["Omni-Inbox Instagram tab", "Active incoming DM thread", "AI Agent auto-response"]
      }
    ],
    screenshots: [
      {
        src: "/images/ChannelImage.webp",
        alt: "Instagram Business Graph API Connection",
        caption: "Connecting Instagram Professional accounts for automated DMs and story replies."
      }
    ],
    expectedResult: "Instagram DMs are synced in real time. Your AI agent answers inquiries, shares product links, and captures leads automatically.",
    tips: [
      "Set up a 'Comment to DM' automation in Wires so that anyone commenting 'PRICE' on your latest reel receives an instant direct message with pricing info.",
      "Instagram enforces a 24-hour standard messaging window similar to WhatsApp."
    ],
    troubleshooting: [
      {
        issue: "DMs do not trigger AI responses?",
        solution: "Double-check Step 1: 'Allow Access to Messages' must be enabled in the Instagram mobile app settings under Privacy -> Messages -> Connected Tools."
      }
    ],
    seo: {
      title: "Instagram Graph API Integration | OrbionAgents",
      description: "Connect Instagram DMs and comment automations to OrbionAgents for 24/7 social sales and support.",
      keywords: ["Instagram bot", "Instagram DM automation", "Meta Graph API", "Instagram lead capture"]
    }
  },

  "integrations/twilio": {
    slug: "integrations/twilio",
    category: "Channels & Integrations",
    title: "Twilio SMS & WhatsApp Gateway",
    subtitle: "Enterprise SMS messaging, phone numbers, and international WhatsApp routing via Twilio.",
    readTime: "6 min read",
    lastUpdated: "May 2026",
    whatIsIt: "The Twilio integration enables two-way SMS messaging and Twilio Programmable Messaging routing directly inside your OrbionAgents workspace. It is ideal for regions with high SMS preference (e.g., North America) or as a backup gateway for WhatsApp.",
    whyUseIt: "Not all customers use WhatsApp. Connecting Twilio provides an omnichannel safety net, enabling your AI agents to send appointment reminders, authentication codes, and follow-ups over universal SMS carrier networks worldwide.",
    beforeYouStart: [
      "An active Twilio account with Account SID and Auth Token.",
      "An approved Twilio SMS-enabled phone number."
    ],
    steps: [
      {
        step: 1,
        title: "Retrieve Twilio API Credentials",
        instruction: "Log into the Twilio Console (twilio.com/console) and copy your 'Account SID' and 'Auth Token' from the dashboard home.",
        uiElements: ["Twilio Console Home", "'Account SID' string", "'Auth Token' string"]
      },
      {
        step: 2,
        title: "Navigate to Channels in OrbionAgents",
        instruction: "Go to 'Channels' (/user/admin/channels) and click 'Connect' on the Twilio card.",
        uiElements: ["'Channels' menu item", "Twilio red logo card", "'Connect' button"]
      },
      {
        step: 3,
        title: "Enter Account SID and Phone Number",
        instruction: "Paste your Account SID, Auth Token, and Twilio sender phone number (in E.164 format, e.g., `+12345678901`).",
        uiElements: ["'Account SID' input", "'Auth Token' input", "'Sender Phone Number' input"]
      },
      {
        step: 4,
        title: "Configure Twilio Inbound Webhook",
        instruction: "Copy the provided webhook URL from OrbionAgents, navigate to your Phone Number settings in the Twilio Console, and paste it into the 'A Message Comes In' webhook field.",
        uiElements: ["Webhook URL copy button", "Twilio Phone Number configuration page", "HTTP POST selector"]
      },
      {
        step: 5,
        title: "Send Test SMS",
        instruction: "Text your Twilio number from your mobile device and observe the conversation arriving in the Omni-Inbox.",
        uiElements: ["Omni-Inbox SMS tab", "Delivery status checkmark"]
      }
    ],
    screenshots: [
      {
        src: "/images/ChannelImage.webp",
        alt: "Twilio Gateway Configuration in Channels",
        caption: "Connecting Twilio SMS and WhatsApp gateway credentials in OrbionAgents."
      }
    ],
    expectedResult: "Two-way SMS messages flow seamlessly through your conversational agents, with replies dispatched via Twilio's carrier network.",
    tips: [
      "In the United States, register your A2P 10DLC brand and campaign in Twilio to prevent carrier filtering.",
      "Keep SMS copy under 160 characters when possible to avoid multi-segment carrier fees."
    ],
    troubleshooting: [
      {
        issue: "SMS status shows 'Failed' or 'Undelivered' in Twilio?",
        solution: "Check Twilio error logs. Common causes include unverified toll-free numbers or missing A2P 10DLC campaign registration."
      }
    ],
    seo: {
      title: "Twilio SMS & WhatsApp Gateway | OrbionAgents",
      description: "Connect Twilio Account SID and Auth Token to enable two-way SMS conversational AI automation.",
      keywords: ["Twilio integration", "SMS AI agent", "Twilio WhatsApp", "two-way SMS"]
    }
  },

  "integrations/email-calendar": {
    slug: "integrations/email-calendar",
    category: "Channels & Integrations",
    title: "Gmail & Google Calendar Sync",
    subtitle: "Automate email replies and synchronize real-time demo bookings with Google Calendar.",
    readTime: "6 min read",
    lastUpdated: "May 2026",
    whatIsIt: "The Email & Calendar integration links your workspace to Google Workspace (Gmail and Google Calendar) or custom SMTP/IMAP servers. It enables your AI agent to reply to incoming sales emails and check live calendar availability to schedule meetings autonomously.",
    whyUseIt: "Scheduling demos manually often takes 4 to 6 back-and-forth emails. By letting the AI inspect your real-time Google Calendar availability, the agent proposes open slots, confirms the appointment, and sends Google Meet invites instantly.",
    beforeYouStart: [
      "A Google Workspace or standard Gmail account.",
      "Calendar scheduling permissions enabled in your workspace."
    ],
    steps: [
      {
        step: 1,
        title: "Open Calendar Settings",
        instruction: "Navigate to 'Calendar' (/user/admin/calendar) or 'Channels' (/user/admin/channels).",
        uiElements: ["'Calendar' menu item with Google Calendar icon", "'Connect Calendar' button"]
      },
      {
        step: 2,
        title: "Authorize Google OAuth",
        instruction: "Click 'Connect Google Account' and accept the permissions for Calendar and Gmail access.",
        uiElements: ["Google OAuth consent screen", "'Allow' button"]
      },
      {
        step: 3,
        title: "Set Working Hours & Meeting Buffer",
        instruction: "Configure your operating availability (e.g., Monday-Friday 9:00 AM - 5:00 PM), meeting duration (30 mins), and buffer time between calls.",
        uiElements: ["Working hours grid", "Meeting duration selector", "Buffer time dropdown"]
      },
      {
        step: 4,
        title: "Link Calendar to Orchestrator Wires",
        instruction: "In your Agentic Orchestrator, add a 'Schedule Meeting' action node and select your connected Google Calendar as the booking destination.",
        uiElements: ["'Schedule Meeting' node", "'Destination Calendar' dropdown", "Google Meet link toggle"]
      },
      {
        step: 5,
        title: "Test Automated Booking via Chat",
        instruction: "Ask the AI agent in AI Workspace: 'Book a demo call for tomorrow afternoon.' Verify that the agent offers available slots and creates a Google Calendar event upon confirmation.",
        uiElements: ["AI Workspace chat stream", "Google Calendar event confirmation with Meet link"]
      }
    ],
    screenshots: [
      {
        src: "/images/documentation.webp",
        alt: "Google Calendar & Email Integration",
        caption: "Setting up calendar availability, buffer time, and automated Google Meet scheduling."
      }
    ],
    expectedResult: "Appointments booked through WhatsApp or Instagram appear immediately on your Google Calendar with automated Google Meet video links and attendee email invites.",
    tips: [
      "Add a 15-minute buffer between meetings to prevent back-to-back scheduling conflicts.",
      "Configure automated email reminders 24 hours and 1 hour before the scheduled call to minimize no-show rates."
    ],
    troubleshooting: [
      {
        issue: "AI offers time slots when you are already busy?",
        solution: "Ensure that 'Check for conflicts' is enabled across all primary and secondary calendars in the Calendar Settings modal."
      }
    ],
    seo: {
      title: "Gmail & Google Calendar Sync | OrbionAgents",
      description: "Automate appointment scheduling, check live calendar availability, and create Google Meet links via AI.",
      keywords: ["Google Calendar sync", "automated meeting scheduler", "AI booking bot", "Gmail integration"]
    }
  }
};

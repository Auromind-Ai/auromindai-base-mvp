export const INTEGRATIONS_ARTICLES = {
  "integrations/whatsapp-cloud-api": {
    slug: "integrations/whatsapp-cloud-api",
    category: "Channels & Integrations",
    title: "WhatsApp Business Cloud API",
    subtitle: "Connect your official WhatsApp Business number via Meta Cloud API with direct webhooks.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The WhatsApp Business Cloud API connector establishes a direct integration between your workspace and Meta's official Graph API infrastructure. Inbound messages from customers are delivered via secure webhooks, while outbound responses are dispatched through Meta's verified API endpoints without third-party aggregator markups."
      },
      {
        id: "requirements",
        title: "Requirements & Prerequisites",
        type: "checklist",
        items: [
          "A Meta for Developers account (developers.facebook.com).",
          "A verified Meta Business Manager organization.",
          "A dedicated business phone number capable of receiving SMS or voice verification codes (must not be active on a personal WhatsApp mobile app)."
        ]
      },
      {
        id: "credentials-guide",
        title: "Connection & Setup Steps",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Create Meta Developer App",
            instruction: "Log into developers.facebook.com, click 'Create App', choose 'Other' > 'Business', and add the 'WhatsApp' product to your app.",
            uiElements: ["Meta App Dashboard", "'Add WhatsApp' product card", "'API Setup' tab"]
          },
          {
            step: 2,
            title: "Retrieve API Credentials",
            instruction: "Navigate to WhatsApp > API Setup. Note down your Phone Number ID and WhatsApp Business Account ID (WABA ID). In System Users, create a permanent access token with whatsapp_business_messaging permissions.",
            uiElements: ["'Phone Number ID' display", "'WABA ID' display", "Permanent Access Token generator"]
          },
          {
            step: 3,
            title: "Enter Credentials in Channels",
            instruction: "In Orbion, navigate to Channels (/user/admin/channels). Click 'Connect' on WhatsApp Cloud API, paste your Phone Number ID, WABA ID, and Permanent Token.",
            uiElements: ["Channels console", "'Connect WhatsApp' button", "Credentials form"]
          },
          {
            step: 4,
            title: "Configure Meta Webhook Callback",
            instruction: "Copy your unique Orbion Webhook Callback URL and Verify Token. In Meta App Dashboard > WhatsApp > Configuration, click 'Edit' under Webhooks, paste the URL and Verify Token, then click 'Verify and Save'.",
            uiElements: ["Orbion Webhook URL copy button", "Meta Webhook configuration panel", "'Verify and Save' button"]
          },
          {
            step: 5,
            title: "Subscribe to Messaging Fields",
            instruction: "Under Webhook fields, click 'Manage' and subscribe to 'messages', 'message_deliveries', and 'messaging_postbacks'.",
            uiElements: ["Webhook field subscription checkboxes", "'Save' button"]
          }
        ]
      },
      {
        id: "verification",
        title: "Verify Live Connection",
        type: "steps",
        steps: [
          {
            step: 6,
            title: "Send a Test Message",
            instruction: "Send a WhatsApp message from any personal phone to your registered business number. Check that the message appears immediately in the Omni-Channel Inbox.",
            uiElements: ["Personal WhatsApp phone app", "Orbion Omni-Channel Inbox"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Connection Verified:",
        calloutText: "The WhatsApp channel card displays a green 'Connected' indicator. Customer inquiries route directly into the Omni-Channel Inbox and trigger active automated workflows."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & Diagnostics",
        type: "troubleshooting",
        items: [
          {
            issue: "Meta Webhook verification fails with challenge mismatch?",
            cause: "The Verify Token string entered in Meta does not match the secret displayed in Orbion.",
            solution: "Copy the Verify Token directly from the Orbion Channels configuration without any leading or trailing spaces."
          },
          {
            issue: "Outgoing messages fail with error code 131047?",
            cause: "More than 24 hours have passed since the customer's last inbound message.",
            solution: "Outside the 24-hour service window, Meta requires using a pre-approved WhatsApp Template to initiate contact."
          },
          {
            issue: "Messages stop delivering after several weeks?",
            cause: "A temporary user token was used instead of a permanent System User access token.",
            solution: "Generate a permanent System User token in Meta Business Manager and update the token in Orbion Channels."
          }
        ]
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
    subtitle: "Connect your Instagram Professional account for direct messages and story mention handling.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Instagram Graph API connector links your Instagram Professional account to Orbion. Direct messages (DMs), story mentions, and post comment inquiries are captured into the Omni-Channel Inbox, enabling unified team response and automated AI triage."
      },
      {
        id: "requirements",
        title: "Requirements & Prerequisites",
        type: "checklist",
        items: [
          "An Instagram Professional account (Business or Creator tier).",
          "A connected Facebook Page linked to your Instagram account.",
          "Admin access to the Meta Business Manager hosting the Facebook Page.",
          "Instagram mobile app setting: 'Allow Access to Messages' toggled ON."
        ]
      },
      {
        id: "connection-steps",
        title: "Connection Steps",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Enable Message Access in Instagram App",
            instruction: "Open the Instagram app on mobile. Go to Settings > Privacy > Messages and ensure 'Allow Access to Messages' is switched ON.",
            uiElements: ["Instagram mobile app", "'Privacy' menu", "'Allow Access to Messages' switch"]
          },
          {
            step: 2,
            title: "Connect via Meta OAuth in Channels",
            instruction: "Navigate to Channels (/user/admin/channels) in Orbion. Click 'Connect' on the Instagram card and authenticate with your Meta Business user.",
            uiElements: ["Channels dashboard", "'Connect Instagram' card", "Meta OAuth dialog"]
          },
          {
            step: 3,
            title: "Grant Required Permissions",
            instruction: "Select your connected Facebook Page and Instagram account. Grant permissions for instagram_manage_messages, pages_manage_metadata, and pages_show_list.",
            uiElements: ["Account selection checkboxes", "'Continue' authorization button"]
          },
          {
            step: 4,
            title: "Verify Ingestion",
            instruction: "Send a direct message from a separate personal Instagram account to your business account to verify webhook reception.",
            uiElements: ["Omni-Channel Inbox", "Live message stream"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Channel Active:",
        calloutText: "Instagram DMs route directly into the unified queue alongside WhatsApp threads, with support for text and image attachments."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & Diagnostics",
        type: "troubleshooting",
        items: [
          {
            issue: "Inbound DMs are not appearing in Orbion?",
            cause: "'Allow Access to Messages' is likely disabled in the Instagram mobile app settings.",
            solution: "Open Instagram on your phone > Settings > Privacy > Messages > toggle 'Allow Access to Messages' to ON."
          },
          {
            issue: "OAuth handshake error 'No linked Facebook Page'?",
            cause: "Your Instagram Business profile must be linked to a Facebook Page to use the Graph API.",
            solution: "Open Meta Business Suite, navigate to Settings > Accounts > Instagram Accounts, and link a Facebook Page."
          }
        ]
      }
    ],
    seo: {
      title: "Instagram Graph API Setup | OrbionAgents",
      description: "Connect Instagram Business accounts to automate direct messages and triage inquiries.",
      keywords: ["Instagram Graph API", "Instagram automation", "Instagram DM bot"]
    }
  },

  "integrations/twilio": {
    slug: "integrations/twilio",
    category: "Channels & Integrations",
    title: "Twilio SMS & WhatsApp Gateway",
    subtitle: "Configure Account SID and Auth Tokens for international SMS delivery and carrier fallback.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Twilio gateway connector enables two-way SMS messaging and carrier redundancy. When customers do not have WhatsApp or when emergency notifications must be delivered via telecom carrier networks, Twilio delivers outbound SMS with delivery receipts."
      },
      {
        id: "requirements",
        title: "Requirements & Prerequisites",
        type: "checklist",
        items: [
          "An active Twilio account (twilio.com).",
          "Twilio Account SID and Auth Token from your Twilio Console.",
          "An active Twilio SMS-enabled phone number or Messaging Service."
        ]
      },
      {
        id: "connection-steps",
        title: "Setup & Configuration",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Retrieve Twilio Console Credentials",
            instruction: "Sign in to console.twilio.com. Under 'Account Info', copy your Account SID and Auth Token.",
            uiElements: ["Twilio Console", "'Account SID' field", "'Auth Token' field"]
          },
          {
            step: 2,
            title: "Enter Credentials in Orbion Channels",
            instruction: "In Channels (/user/admin/channels), locate the Twilio card and click 'Connect'. Paste your Account SID, Auth Token, and Twilio phone number.",
            uiElements: ["'Connect Twilio' modal", "'Account SID' input", "'Auth Token' input", "'Sender Number' field"]
          },
          {
            step: 3,
            title: "Configure Inbound Webhook in Twilio",
            instruction: "In Twilio Console > Phone Numbers > Active Numbers > select your number. Under 'A Message Comes In', set the Webhook URL to your unique Orbion webhook endpoint with HTTP POST.",
            uiElements: ["Twilio Phone Number configuration", "'A Message Comes In' field", "HTTP POST selector"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Carrier SMS Active:",
        calloutText: "Outbound SMS messages can be dispatched through Automation Wires or agent responses, and customer inbound replies route directly into the Omni-Channel Inbox."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Error 21608: 'The number is unverified'?",
            cause: "Your Twilio account is in Trial Mode and can only send messages to verified numbers.",
            solution: "Upgrade your Twilio project to a paid account or verify the recipient number in the Twilio Phone Numbers console."
          },
          {
            issue: "Inbound SMS not reflecting in queue?",
            cause: "The webhook URL in Twilio may be configured as HTTP GET instead of HTTP POST.",
            solution: "Ensure the method dropdown next to the Webhook URL in Twilio is set to HTTP POST."
          }
        ]
      }
    ],
    seo: {
      title: "Twilio SMS Integration | OrbionAgents",
      description: "Connect Twilio SMS and WhatsApp gateway to OrbionAgents for international telecom messaging.",
      keywords: ["Twilio SMS integration", "Twilio webhook", "carrier SMS automation"]
    }
  },

  "integrations/email-calendar": {
    slug: "integrations/email-calendar",
    category: "Channels & Integrations",
    title: "Gmail & Google Calendar Sync",
    subtitle: "Automate email replies and synchronize real-time demo bookings with Google Calendar.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Google Calendar and Gmail connector enables conversational agents to inspect availability in real time and schedule appointments directly during WhatsApp or Instagram interactions without sending prospects to external booking pages."
      },
      {
        id: "requirements",
        title: "Requirements & Prerequisites",
        type: "checklist",
        items: [
          "A Google Workspace or personal Google account with Calendar access.",
          "Admin access to approve OAuth scopes for calendar and email integration."
        ]
      },
      {
        id: "setup-steps",
        title: "Configuration Steps",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Authorize Google OAuth",
            instruction: "Navigate to Settings > Integrations in Orbion. Click 'Connect Google Calendar' and authenticate your Google account.",
            uiElements: ["'Integrations' panel", "'Google Calendar' card", "Google OAuth consent screen"]
          },
          {
            step: 2,
            title: "Select Operational Calendars",
            instruction: "Choose which primary calendar to inspect for conflicts and which calendar to write newly booked consultations into.",
            uiElements: ["'Primary Calendar' dropdown", "'Default Duration' selector (e.g. 30 mins)"]
          },
          {
            step: 3,
            title: "Define Available Hours & Buffers",
            instruction: "Set business meeting hours (e.g. 9:00 AM - 5:00 PM) and add a 15-minute buffer between meetings to prevent back-to-back overbooking.",
            uiElements: ["Time range sliders", "'Meeting Buffer' field"]
          },
          {
            step: 4,
            title: "Attach Booking Tool to Agent",
            instruction: "In Agent Studio, verify that the 'calendar.check_slots' and 'calendar.book_appointment' MCP tools are toggled ON.",
            uiElements: ["Agent Studio Tools tab", "Calendar MCP toggle"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Autonomous Booking Active:",
        calloutText: "Agents converse with leads to identify suitable times, automatically reserve calendar events, and dispatch meeting invitations with Google Meet video links."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        type: "troubleshooting",
        items: [
          {
            issue: "Agent books a meeting over an existing busy event?",
            cause: "The busy event may be located on a secondary calendar not selected in the conflict-check list.",
            solution: "Ensure all relevant calendars (personal + work) are selected under 'Calendars to check for conflicts'."
          },
          {
            issue: "Google Calendar token expired?",
            cause: "OAuth access was revoked or refreshed by Google security policies.",
            solution: "Click 'Reconnect Google' in Settings > Integrations to re-authenticate."
          }
        ]
      }
    ],
    seo: {
      title: "Google Calendar & Gmail Integration | OrbionAgents",
      description: "Sync calendar availability and automate appointment bookings with OrbionAgents.",
      keywords: ["Google Calendar integration", "appointment booking bot", "Gmail sync"]
    }
  }
};

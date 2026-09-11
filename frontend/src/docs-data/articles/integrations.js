export const INTEGRATIONS_ARTICLES = {
  "integrations/whatsapp-cloud-api": {
    slug: "integrations/whatsapp-cloud-api",
    category: "Channels & Integrations",
    title: "WhatsApp Business Cloud API",
    subtitle: "Connect your official WhatsApp Business number to automate conversations, deploy 24/7 AI agents, and send interactive templates.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The WhatsApp Cloud API integration connects your official WhatsApp Business account directly to orbionagents. Once connected, your platform automatically powers 24/7 AI agent replies, triggers visual automation flows, and broadcasts pre-approved interactive message templates with quick-reply buttons — all managed seamlessly in one unified console without expensive third-party tools."
      },
      {
        id: "video-walkthrough",
        title: "Official Video Walkthrough",
        type: "video",
        video: {
          url: "/videos/IMG_3477.mp4",
          fallbackUrl: "/videos/IMG_3477.MOV",
          poster: "/images/docs/whatsapp-connect/step-1-channels-dashboard.png",
          title: "Connecting WhatsApp Business via Meta Cloud API",
          duration: "1:03 min walkthrough",
          caption: "End-to-end video tutorial demonstrating the complete Meta Facebook Login for Business onboarding flow."
        }
      },
      {
        id: "requirements",
        title: "WhatsApp Connect Rules & Mandatory Prerequisites",
        type: "checklist",
        checklistTitle: "Mandatory Requirements (Strict Meta Policy):",
        items: [
          "Rule 1 — New Dedicated WhatsApp Number: A fresh phone number with active SMS or voice call capability to receive the 6-digit OTP verification code. It must not be currently registered on personal WhatsApp or WhatsApp Business mobile app.",
          "Rule 2 — Facebook Account Mandatory: An active personal Facebook account is strictly required to authenticate via Meta Facebook Login for Business and create/manage the Meta Business Portfolio.",
          "Rule 3 — Existing Number? Delete WhatsApp Account First: If your phone number is currently active on personal WhatsApp or WhatsApp Business app on your mobile phone, you MUST delete the WhatsApp account from the mobile app (Settings > Account > Delete Account) before connecting, otherwise Meta verification will reject the number."
        ]
      },
      {
        id: "credentials-guide",
        title: "Connection & Setup Steps",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Channels Console & Initiate Connection",
            instruction: "In your dashboard, navigate to Channels & Integration. Locate the 'WhatsApp Business (Meta Cloud API)' card and click 'Connect >' to launch the Meta onboarding modal.",
            screenshot: "/images/docs/whatsapp-connect/step-1-channels-dashboard.png",
            uiElements: ["Channels Dashboard", "WhatsApp Business card", "'Connect >' button"]
          },
          {
            step: 2,
            title: "Meta Facebook Login for Business Window",
            instruction: "A popup from Meta (Facebook Login for Business) opens displaying 'Seamlessly connect your account to orbionagents'. Review permissions and click 'Continue'.",
            screenshot: "/images/docs/whatsapp-connect/step-2-meta-login-continue.png",
            uiElements: ["Facebook Login Modal", "Permissions Overview", "'Continue' button"]
          },
          {
            step: 3,
            title: "Select or Create Meta Business Portfolio",
            instruction: "Choose your existing Meta Business Portfolio or select 'Create a business portfolio', then select or create your WhatsApp Business Account. Click 'Next'.",
            screenshot: "/images/docs/whatsapp-connect/step-3-select-portfolio.png?v=2",
            uiElements: ["Business portfolio dropdown", "WhatsApp Business account dropdown", "'Next' button"]
          },
          {
            step: 4,
            title: "Enter Business Profile Information",
            instruction: "Fill in your official business details: Business Name, Official Email, Category (e.g. Professional services), Country (e.g. India), Website, and Time Zone (Asia/Kolkata). Click 'Next'.",
            screenshot: "/images/docs/whatsapp-connect/step-4-business-information.png?v=2",
            uiElements: ["Business Name input", "Category selector", "Country dropdown", "'Next' button"]
          },
          {
            step: 5,
            title: "Add WhatsApp Phone Number & Display Name",
            instruction: "Enter your official WhatsApp Business Display Name, select your Country Code (+91), enter your dedicated Phone Number, choose verification method (Text message or Phone call), and click 'Next'.",
            screenshot: "/images/docs/whatsapp-connect/step-5-phone-number-entry.png?v=2",
            uiElements: ["Display Name field", "Country code selector", "Phone number input", "Verification method radio"]
          },
          {
            step: 6,
            title: "Verify Phone Number via 6-Digit Code",
            instruction: "Check your phone for the 6-digit OTP verification code sent by Meta via SMS or phone call. Enter the 6 digits into the verification input fields to confirm number ownership.",
            screenshot: "/images/docs/whatsapp-connect/step-6-otp-verification.png",
            uiElements: ["6-Digit OTP inputs", "Resend code link", "Code sent notification"]
          },
          {
            step: 7,
            title: "Finalize Permissions & Compliance Review",
            instruction: "The modal confirms 'Your account is connected to orbionagents'. Meta completes a brief WhatsApp Business Messaging Policy review. Optionally add a payment method and click 'Finish'.",
            screenshot: "/images/docs/whatsapp-connect/step-7-connection-complete.png",
            uiElements: ["Success Confirmation", "Policy compliance notice", "'Finish' button"]
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
            instruction: "Send a WhatsApp message from any personal phone to your registered business number. Check that your 24/7 AI Agent replies immediately in the Omni-Channel Inbox.",
            uiElements: ["Personal WhatsApp phone app", "Omni-Channel Inbox"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Connection Verified:",
        calloutText: "The WhatsApp channel card displays a green '✓ Connected' indicator. Customer inquiries route directly into the Omni-Channel Inbox, triggering AI agent replies and automated workflows."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & Common Questions",
        type: "troubleshooting",
        items: [
          {
            issue: "Why didn't I receive the 6-digit OTP code on my phone?",
            cause: "SMS carrier delays or phone number already tied to another WhatsApp profile.",
            solution: "Ensure your phone has network reception. If the code doesn't arrive within 60 seconds, choose 'Phone call' for automated voice OTP, and verify the number is not active on mobile WhatsApp app."
          },
          {
            issue: "Can I connect an existing WhatsApp number?",
            cause: "Meta Cloud API requires sole ownership of the phone number.",
            solution: "Open WhatsApp on your phone > Settings > Account > Delete my account. Once deleted, the number is immediately eligible for Cloud API connection."
          },
          {
            issue: "How does the AI Agent know how to reply to customers?",
            cause: "AI agent generates responses using your uploaded business knowledge base.",
            solution: "Upload your product catalog, FAQs, and docs in the Brain & Knowledge Base section. You can customize instructions and tone of voice anytime."
          },
          {
            issue: "Why are automated message templates not reaching customers?",
            cause: "WhatsApp requires outbound messages outside the 24-hour window to use approved templates.",
            solution: "Check the Templates dashboard to ensure your template status is 'Approved' by Meta before sending."
          },
          {
            issue: "Do I need to leave my computer or phone turned on for AI replies?",
            cause: "Cloud infrastructure question.",
            solution: "No. Orbion Agents and Meta Cloud API operate 24/7 in the cloud. Incoming messages are answered automatically even when your devices are powered off."
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
    title: "Instagram Direct & Story Automation",
    subtitle: "Connect your Instagram Professional account to automate direct messages, deploy 24/7 AI agents, and turn story mentions into leads.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Instagram Graph API integration connects your Instagram Business or Creator account directly to orbionagents. Once connected, your platform automatically powers 24/7 AI agent replies to direct messages (DMs), triggers visual automation flows when customers comment or mention you in stories, and routes qualified leads directly into the Omni-Channel Inbox — all managed in one unified console without third-party aggregator costs."
      },
      {
        id: "requirements",
        title: "Requirements & Prerequisites",
        type: "checklist",
        items: [
          "Business / Creator Account Only: Personal accounts are not supported by Meta's Graph API. You must switch to a Professional account (Business or Creator).",
          "Facebook Business Page Mandatory: You must have an active Facebook Business Page with administrator privileges in your Meta Business Portfolio.",
          "Instagram & Facebook Account Connected Mandatory: Your Instagram account must be linked directly to your Facebook Page in Page Settings or the Instagram app."
        ]
      },
      {
        id: "connection-steps",
        title: "Connection Steps",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Channels Console & Initiate Instagram Connection",
            instruction: "Navigate to Channels & Integration in orbionagents. Find the 'Instagram (Meta Business)' card and click 'Connect >' to start the Meta OAuth authorization.",
            uiElements: ["Channels Dashboard", "Instagram card", "Connect > button"]
          },
          {
            step: 2,
            title: "Select Linked Facebook Business Page",
            instruction: "In the Meta popup ('Choose the Pages you want orbionagents to access'), select the Facebook Page connected to your Instagram account and click 'Continue'.",
            uiElements: ["Page selector radio", "Connected Facebook Page", "Continue button"]
          },
          {
            step: 3,
            title: "Choose Meta Business Portfolio",
            instruction: "Select the Meta Business Portfolio hosting your business assets, then click 'Continue' to advance to the Instagram account selector.",
            uiElements: ["Business portfolio list", "Portfolio selection checkbox", "Continue button"]
          },
          {
            step: 4,
            title: "Select Instagram Professional Account",
            instruction: "Choose your target Instagram professional account handle (e.g., auromind_ai) and click 'Continue'.",
            uiElements: ["Instagram account list", "Account checkbox", "Continue button"]
          },
          {
            step: 5,
            title: "Review & Grant Required Meta Permissions",
            instruction: "Review and approve permissions for profile access, comment management, and messaging access, then click 'Save'.",
            uiElements: ["Permissions checklist", "Messages access toggle", "Save button"]
          },
          {
            step: 6,
            title: "Confirm Authorization & Complete Connection",
            instruction: "Click 'Got it' on the Meta confirmation modal. The popup will close and the Channels dashboard will reflect the connected Instagram channel.",
            uiElements: ["Confirmation banner", "Got it button"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Channel Active:",
        calloutText: "Your official Instagram Professional account is connected and active. Direct messages, story mentions, and comment inquiries automatically route to your 24/7 AI agent and trigger visual automation flows in the Omni-Channel Inbox."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & Diagnostics",
        type: "troubleshooting",
        items: [
          {
            issue: "Why doesn't my Instagram account appear in the Meta login list in Step 4?",
            cause: "Personal Instagram accounts are not supported by Meta's Graph API, or the account is not linked to an active Facebook Page.",
            solution: "Switch your Instagram account to Professional (Business/Creator) and link it to your Facebook Page in Settings > Linked Accounts."
          },
          {
            issue: "How do I enable the AI Agent to access Instagram Direct Messages?",
            cause: "'Allow Access to Messages' may be turned off in your Instagram mobile app settings.",
            solution: "Open the Instagram mobile app > Settings > Privacy > Messages > toggle 'Allow Access to Messages' to ON."
          },
          {
            issue: "Can the AI Agent reply to Instagram Story mentions?",
            cause: "Story mention events require webhook subscriptions.",
            solution: "Yes! orbionagents automatically subscribes to mention webhooks to send instant thank-you DMs or offers."
          }
        ]
      }
    ],
    seo: {
      title: "Instagram Direct & Story Automation | orbionagents Docs",
      description: "Connect Instagram Business accounts to automate direct messages and triage inquiries.",
      keywords: ["Instagram Graph API", "Instagram automation", "Instagram DM bot", "orbionagents Instagram"]
    }
  },

  "integrations/twilio": {
    slug: "integrations/twilio",
    category: "Channels & Integrations",
    title: "Twilio SMS & WhatsApp Gateway",
    subtitle: "Power your WhatsApp and international SMS communications with our native Twilio bridge.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Twilio Gateway integration connects your Twilio account directly to orbionagents. Deploy 24/7 AI agents across global SMS and WhatsApp, build visual multi-channel workflows with automated SMS fallback, and test rapidly using Twilio Sandbox before launching dedicated business phone numbers."
      },
      {
        id: "requirements",
        title: "Requirements & Prerequisites",
        type: "checklist",
        items: [
          "Twilio Account SID: Found on the main Twilio Console dashboard (starts with 'AC...').",
          "Twilio Auth Token: Secret API token under Account Info used to authenticate API requests.",
          "Twilio Phone Number: Assigned Twilio Sandbox test number or a dedicated purchased business number.",
          "Sandbox Webhook Configuration: Inbound URL (https://api.orbionagents.com/twilio/webhook) and Status callback URL (https://api.orbionagents.com/twilio/status-callback) saved in Twilio Sandbox settings."
        ]
      },
      {
        id: "connection-steps",
        title: "Connection Steps",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Channels Console & Initiate Twilio Connection",
            instruction: "Navigate to Channels & Integration in orbionagents. Locate the 'Twilio (Twilio Powered)' card and click 'Connect >' to launch the integration modal.",
            uiElements: ["Channels Dashboard", "Twilio card", "Connect > button"]
          },
          {
            step: 2,
            title: "Connect Twilio Modal & Open Twilio Console",
            instruction: "In the 'Connect Twilio (Step 1 of 2: Get Your Credentials)' modal, click 'Open Twilio Console' to access console.twilio.com.",
            uiElements: ["Step 1 of 2 modal", "Open Twilio Console button", "I Have My Credentials button"]
          },
          {
            step: 3,
            title: "Twilio Console Dashboard — Copy Account SID & Auth Token",
            instruction: "In Twilio Console > Account Info, copy your Account SID and Auth Token to your clipboard.",
            uiElements: ["Account Info card", "Account SID copy button", "Auth Token copy button"]
          },
          {
            step: 4,
            title: "WhatsApp Sandbox Test Number vs Buying Dedicated Number",
            instruction: "Go to Messaging > Try it out > Send a WhatsApp message to view your assigned Sandbox test number and unique join keyword, or navigate to Phone Numbers > Buy a number to purchase a permanent business number.",
            uiElements: ["Sandbox test number", "Join code banner", "Buy a Number link"]
          },
          {
            step: 5,
            title: "Set Official Webhook URLs in Sandbox Settings",
            instruction: "Under Try WhatsApp > Sandbox settings, set 'When a message comes in' to https://api.orbionagents.com/twilio/webhook (POST) and 'Status callback URL' to https://api.orbionagents.com/twilio/status-callback (POST). Click Save.",
            uiElements: ["Sandbox settings tab", "When a message comes in URL", "Status callback URL", "Save button"]
          },
          {
            step: 6,
            title: "Enter Credentials & Complete Connection in Channels",
            instruction: "Return to the orbionagents Channels modal, click 'I Have My Credentials >', paste your Twilio Account SID, Auth Token, and Phone Number, and click 'Connect >'.",
            uiElements: ["TWILIO ACCOUNT SID field", "TWILIO AUTH TOKEN field", "TWILIO PHONE NUMBER field", "Connect > button"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Expected Result",
        type: "callout",
        calloutTitle: "Twilio Gateway Active:",
        calloutText: "Your Twilio SMS & WhatsApp Gateway is connected and active. Inbound messages route into the Omni-Channel Inbox, and your 24/7 AI agents and visual automation workflows respond instantly."
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & Diagnostics",
        type: "troubleshooting",
        items: [
          {
            issue: "Why am I not receiving messages when testing with the Twilio WhatsApp Sandbox?",
            cause: "Twilio Sandbox requires an opt-in keyword from your mobile phone before forwarding messages.",
            solution: "Send 'join <sandbox-keyword>' from your WhatsApp to the assigned Twilio Sandbox test number."
          },
          {
            issue: "What is the difference between Sandbox and a Dedicated Twilio Number?",
            cause: "Sandbox is shared for developer testing; dedicated numbers are exclusive to your business with no join code.",
            solution: "For production, purchase a dedicated phone number in Twilio Console under Phone Numbers > Buy a number."
          },
          {
            issue: "Why are inbound messages not reaching orbionagents?",
            cause: "Sandbox webhook URLs may not be saved or may have incorrect methods.",
            solution: "Verify that 'When a message comes in' is set to https://api.orbionagents.com/twilio/webhook with Method POST."
          }
        ]
      }
    ],
    seo: {
      title: "Twilio SMS & WhatsApp Gateway | orbionagents Docs",
      description: "Connect Twilio SMS and WhatsApp gateway to orbionagents for international messaging and AI automation.",
      keywords: ["Twilio SMS integration", "Twilio WhatsApp gateway", "carrier SMS automation", "orbionagents Twilio"]
    }
  },

  "integrations/email-calendar": {
    slug: "integrations/email-calendar",
    category: "Omni-Gateway & Channel Connectivity",
    title: "Gmail & Google Calendar Sync",
    subtitle: "Automate email replies and synchronize real-time demo bookings with Google Calendar.",
    pageType: "integration",
    sections: [
      {
        id: "overview",
        title: "Overview",
        type: "text",
        content: "The Google Workspace integration connects your Gmail and Google Calendar directly to Orbion Agents. Your 24/7 AI agents inspect real-time calendar availability during customer chats on WhatsApp and Instagram, book consultations with automatic Google Meet links, and draft intelligent email replies without requiring external booking links.",
        screenshot: "/images/docs/email-calendar/step_1.png"
      },
      {
        id: "requirements",
        title: "Google Workspace Connect Rules & Requirements",
        type: "checklist",
        items: [
          "Google Workspace or Personal Gmail Account: An active Google account with access to Calendar and Gmail.",
          "Google OAuth 2.0 Security Consent: Secure Single Sign-On authentication directly managed by Google. Passwords are never shared.",
          "Calendar & Email Permissions Grant: Approve calendar and email scopes so AI agents can check busy slots, prevent overlapping meetings, and send meeting invites."
        ]
      },
      {
        id: "setup-steps",
        title: "Step-by-Step Google Workspace Onboarding Guide",
        type: "steps",
        steps: [
          {
            step: 1,
            title: "Channels Hub & Initiate Google Connection",
            instruction: "Navigate to Channels & Integration. Locate the Gmail or Google Calendar card and click 'Connect >' to launch Google OAuth.",
            screenshot: "/images/docs/email-calendar/step_1.png",
            uiElements: ["Channels Dashboard", "Google Calendar Card", "Connect > Button"]
          },
          {
            step: 2,
            title: "Google Sign In & Select Your Account",
            instruction: "Choose the Google Workspace or personal Google account you want your AI Agent to connect with.",
            screenshot: "/images/docs/email-calendar/step_2.png",
            uiElements: ["Google OAuth Screen", "Account Selector", "Workspace Account"]
          },
          {
            step: 3,
            title: "Grant Calendar & Email Permissions",
            instruction: "Confirm access for Google Calendar (checking availability and scheduling events) and Gmail, then click 'Continue'.",
            screenshot: "/images/docs/email-calendar/step_3.png",
            uiElements: ["Google Calendar Scope", "Gmail Scope", "Continue Button"]
          },
          {
            step: 4,
            title: "Secure Token Verification & Handshake",
            instruction: "Orbion Agents securely exchanges the OAuth grant with Google, generates encrypted tokens, and verifies calendar read/write access in real time.",
            screenshot: "/images/docs/email-calendar/step_4.png",
            uiElements: ["OAuth Verification", "Encrypted Handshake", "Success Notification"]
          },
          {
            step: 5,
            title: "Channels Dashboard Shows Connected Status",
            instruction: "Return to Channels & Integrations. Gmail and Google Calendar now display green '✓ Connected' badges with your connected email handle.",
            screenshot: "/images/docs/email-calendar/step_5.png",
            uiElements: ["✓ Connected Badges", "Connected Email Address", "Settings Gear Icon"]
          }
        ]
      },
      {
        id: "expected-result",
        title: "Active Integration & Expected Outcome",
        type: "callout",
        calloutTitle: "Autonomous Booking Active:",
        calloutText: "Your Gmail & Google Calendar accounts are active and synchronized. AI Agents can instantly check your real-time availability during customer chats on WhatsApp and Instagram, automatically schedule client meetings with Google Meet links, and draft professional email responses.",
        screenshot: "/images/docs/email-calendar/verify.png"
      },
      {
        id: "troubleshooting",
        title: "Feature Troubleshooting & Common Questions",
        type: "troubleshooting",
        items: [
          {
            issue: "How does the AI Agent know when I am free for meetings?",
            cause: "Availability verification",
            solution: "The AI agent checks your connected Google Calendar in real time before proposing available time slots to customers on WhatsApp or Instagram, ensuring zero double bookings or overlaps."
          },
          {
            issue: "Can I connect both my personal Gmail and business Google Workspace accounts?",
            cause: "Account compatibility",
            solution: "Yes. You can authenticate any Google Workspace or personal Google account that has Google Calendar enabled."
          },
          {
            issue: "Does the customer receive an automatic calendar invite with a Google Meet link?",
            cause: "Meeting link delivery",
            solution: "Yes. As soon as the customer confirms their preferred time slot in the chat, Orbion Agents automatically creates the event on your Google Calendar and sends a calendar invite with a Google Meet video link to the customer's email."
          },
          {
            issue: "What happens if a customer wants to reschedule or cancel a meeting?",
            cause: "Reschedule request",
            solution: "The customer can simply message your AI Agent on WhatsApp or Instagram requesting a new time. The AI checks your updated calendar availability and reschedules the appointment automatically."
          },
          {
            issue: "How do I disconnect or switch to a different Google account?",
            cause: "Switching accounts",
            solution: "In the Channels & Integrations page, click the Settings icon next to the connected Gmail or Google Calendar card, click 'Disconnect', and then reconnect using your new Google account."
          }
        ]
      }
    ],
    seo: {
      title: "Gmail & Google Calendar Sync | Orbion Agents Documentation",
      description: "Sync calendar availability and automate appointment bookings with Orbion Agents.",
      keywords: ["Google Calendar integration", "appointment booking bot", "Gmail sync", "WhatsApp meeting booking"]
    }
  }
};

export const omniInboxDetail = {
  slug: 'omni-inbox',
  aliasSlugs: ['features/omni-inbox'],
  featureNumber: '01',
  category: 'Unified Messaging & Live Operations',
  title: 'Omni-Channel Inbox',
  tagline: 'Manage customer messages, write helpful replies, and keep track of conversations in one place.',
  description: 'The Omni-Channel Inbox brings messages from your connected WhatsApp, Instagram, and Twilio channels into one workspace. Choose a channel, open a conversation, and read the message history before replying. You can also view contact details and organise conversations using the available filters and labels.',
  visualKey: 'inbox',
  visualLabel: 'Inbox Overview Â· Illustrative Screenshot',
  visualFrameless: true,
  screenshots: {
    benefits: {
      src: '/images/doc-images/customer-conversation.png',
      alt: 'Customer booking conversation with message history, Suggest Reply, attachments, and the reply composer',
      label: 'Replying to Customers Â· Screenshot',
      caption: 'Illustrative screenshot: review the conversation and write a reply. Click to expand.',
      aspectRatio: 'h-[420px] [&_img]:object-contain',
      className: '[&>div:first-child]:border-0 [&>div:first-child]:bg-transparent [&>div:first-child]:shadow-none'
    },
    setup: {
      src: '/images/doc-images/whatsapp-conversation-filters.png',
      alt: 'WhatsApp channel tabs, conversation search, and Open, Follow Up, Converted, and Closed filters',
      caption: 'Illustrative screenshot: choose a channel and filter, then select a conversation. Click to expand.',
      aspectRatio: 'aspect-[1078/1459] [&_img]:object-contain',
      className: '[&>div:first-child]:border-0 [&>div:first-child]:bg-transparent [&>div:first-child]:shadow-none'
    },
    verification: {
      src: '/images/doc-images/customer-contact-details.png',
      alt: 'Contact Details showing the Warm system tier, agent labels, conversation dates, and Converted status',
      label: 'Contact Details Â· Screenshot',
      statusLabel: 'Conversation Status',
      caption: 'Illustrative screenshot with example contact data. Converted is a conversation status; Warm is a system tier. Click to expand.',
      aspectRatio: 'aspect-[1070/1470] [&_img]:object-contain',
      className: 'w-full max-w-[420px] mx-auto [&>div:first-child]:border-0 [&>div:first-child]:bg-transparent [&>div:first-child]:shadow-none'
    }
  },
  contactGuide: [
    { title: 'System Tier', description: 'An automatically calculated rating, such as Warm. It is separate from the conversation status.' },
    { title: 'Agent Labels', description: 'Choose a label such as High Priority or Follow Up to help your team recognise what the customer needs.' },
    { title: 'Conversation Info', description: 'Review first and last contact dates, the message count, and whether the chat is Open, Converted, or Closed.' }
  ],
  copy: {
    benefitsIntro: 'Spend less time switching tools and more time helping your customers.',
    setupLabel: 'Getting started',
    stepsLabel: 'Handle your first conversation:',
    stagesLabel: 'How a conversation flows:',
    verificationTitle: 'Check That Your Inbox Is Working',
    outcomeLabel: 'What you should see:',
    useCasesLabel: 'Examples',
    useCasesTitle: 'When to Use the Inbox',
    useCasesIntro: 'Use the same workspace for everyday support questions and sales enquiries.',
    troubleshootingTitle: 'Common Questions',
    troubleshootingIntro: 'Try these checks if a conversation or reply does not appear as expected.',
    answerLabel: 'What to do:'
  },
  videoPlaceholder: {
    title: 'Find a Conversation and Send a Reply',
    description: 'Walk through choosing a channel, opening a chat, reviewing the history, sending a reply, and checking contact details.'
  },
  architecture: {
    title: 'Open a Conversation and Reply',
    description: 'Make sure the messaging channel is connected to your workspace, then open the Inbox. Start with a test conversation so you can check incoming messages and replies before using it with customers.',
    stages: [
      { number: '01', name: 'Receive a message', detail: 'A customer sends a message to one of your connected channels.' },
      { number: '02', name: 'Find the conversation', detail: 'Choose the channel and open the customer chat from the conversation list.' },
      { number: '03', name: 'Read and reply', detail: 'Review the history, write your response, and check it before sending.' },
      { number: '04', name: 'Keep it organised', detail: 'Use contact labels and conversation actions to track what needs attention.' }
    ]
  },
  benefits: [
    {
      title: 'Manage Messages in One Place',
      description: 'Switch between your connected channels inside the Inbox instead of opening a separate tool for each one.',
      highlight: 'Less switching',
    },
    {
      title: 'Reply with the Full Context',
      description: 'Read earlier messages and view contact details before replying, so customers do not have to explain everything again.',
      highlight: 'Conversation history',
    },
    {
      title: 'Get Help Writing Replies',
      description: 'Use an AI reply suggestion as a starting point when available. Review and edit the wording before sending it to the customer.',
      highlight: 'You review the reply',
    },
    {
      title: 'Keep Important Chats in View',
      description: 'Use status filters and contact labels to find active conversations and recognise customers who need attention.',
      highlight: 'Filters & labels',
    }
  ],
  beforeYouStart: [
    {
      title: 'Connected Messaging Channel',
      description: 'At least one active channel (WhatsApp Business Cloud API or Instagram Direct) connected in Settings > Integrations.'
    },
    {
      title: 'Agent Permissions & Role',
      description: 'Workspace user account with Agent or Admin role assigned to access and reply in conversation queues.'
    },
    {
      title: 'Knowledge Base Ready',
      description: 'Verified documentation uploaded to AI Brain so the AI Copilot can generate accurate reply drafts.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Choose Your Channel',
      description: 'Open the Inbox and select WhatsApp, Instagram, or Twilio. Use a channel that is already connected to your current workspace.',
      screenshotPlaceholder: {
        title: 'Inbox Channel Tabs and Conversation List',
        description: 'Show the channel tabs, status filters, and a selected test conversation.'
      }
    },
    {
      step: 2,
      title: 'Find and Read a Conversation',
      description: 'Use search or a status filter to find a customer. Open the conversation and read the recent messages before replying.',
      screenshotPlaceholder: {
        title: 'Selected Customer Conversation',
        description: 'Show the selected chat with its message history and search field.'
      }
    },
    {
      step: 3,
      title: 'Write and Send Your Reply',
      description: 'Type a reply or edit an AI suggestion, then send. You can also attach a supported image or document.',
      screenshotPlaceholder: {
        title: 'Reply Composer',
        description: 'Show a draft reply and the send control using a test conversation.'
      }
    },
    {
      step: 4,
      title: 'Update the Conversation',
      description: 'Review Contact Details and add a useful label. Close finished conversations or mark successful enquiries as Converted.',
      screenshotPlaceholder: {
        title: 'Contact Details and Conversation Actions',
        description: 'Show contact labels and the available close or conversion actions.'
      }
    }
  ],
  verificationChecklist: [
    'Send a test message to a connected channel and find it in the correct Inbox tab.',
    'Open the conversation and confirm that the customer details and message history match.',
    'Send a reply and check that it arrives on the test customer device.',
    'After closing a test conversation, check that it appears under Closed.',
    'Check the contact label and conversation status.'
  ],
  expectedOutcome: 'The test conversation appears under the correct channel, and your reply reaches the test customer. You can reopen the chat history and find the conversation under the appropriate status filter.',
  useCases: [
    {
      title: 'Everyday Customer Support',
      scenario: 'A customer asks about a product, delivery, or return policy.',
      solution: 'Read their previous messages, check the relevant business information, and reply in the same conversation.'
    },
    {
      title: 'Sales Enquiries',
      scenario: 'Someone messages your business to ask about pricing or a service.',
      solution: 'Review their contact details, answer their questions, and add a suitable label so the enquiry is easier to track.'
    },
    {
      title: 'Reviewing Past Conversations',
      scenario: 'A customer comes back with a question about an earlier discussion.',
      solution: 'Find the conversation using search and the available status filters, then review the history before responding.'
    }
  ],
  troubleshooting: [
    {
      question: 'Why does WhatsApp show Window Closed instead of the reply box?',
      answer: 'When the Inbox shows that the messaging window has expired, follow the on-screen prompt to use an approved template message. Window Closed refers to messaging availability; it is different from marking a conversation Closed.'
    },
    {
      question: 'Are labels, system tier, and conversation status the same?',
      answer: 'No. System Tier is an automatically calculated lead rating such as Warm. Agent Labels help you organise contacts. Conversation status, such as Open, Converted, or Closed, tracks the conversation outcome.'
    },
    {
      question: 'Why can I not see a customer message?',
      answer: 'Check that you are in the correct workspace and channel. Clear the search field and try the other status filters. If the message is still missing, check the channel connection and send a new test message.'
    },
    {
      question: 'What should I do if a reply fails to send?',
      answer: 'Read any error shown in the Inbox and check the channel connection. If a message template is required, choose an approved template. Check the conversation before retrying so you do not send the same reply twice.'
    },
    {
      question: 'Should I send an AI suggestion without editing it?',
      answer: 'Read it first. Check names, prices, policies, and any promises against your business information. Edit the draft as needed before sending.'
    },
    {
      question: 'Where did my closed conversation go?',
      answer: 'Select the same channel and open the Closed filter. Clear the search field if you cannot find it. Instagram also provides an All filter.'
    }
  ]
};




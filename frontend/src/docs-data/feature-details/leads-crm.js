export const leadsCrmDetail = {
  slug: 'leads-crm',
  aliasSlugs: ['features/leads-crm'],
  featureNumber: '04',
  category: 'Revenue Operations & Lead Scoring',
  title: 'AI Lead Intelligence & CRM',
  tagline: 'Find promising leads, understand their interest, and keep customer details in one place.',
  description: 'Leads & CRM brings your contacts, conversation history, and lead scores together. Select a lead to review their messages and Lead Overview. Use channel filters, labels, and favorites to organise your list, or add a lead manually with New Lead.',
  visualKey: 'leads',
  visualLabel: 'Leads & CRM Overview',
  visualFrameless: true,
  hideWorkflowStages: true,
  staticSetup: true,
  screenshots: {
    benefits: {
      src: '/images/doc-images/customer-conversation.png',
      alt: 'Customer conversation showing message history and reply controls',
      label: 'Understand the Customer',
      caption: 'Review the conversation before following up. Click to expand.',
      aspectRatio: 'h-[440px] [&_img]:object-contain',
      className: 'w-full max-w-[540px] mx-auto'
    },
    setup: {
      src: '/images/doc-images/leads-add-new-contact-form.png',
      alt: 'Add New Lead form with name, phone, source, optional budget and note',
      caption: 'Enter a name and phone number, choose the source, and select Add Lead.',
      aspectRatio: 'aspect-[1305/1205] [&_img]:object-contain',
      className: 'w-full max-w-[540px] mx-auto'
    },
    verification: {
      src: '/images/doc-images/lead-overview-summary.png',
      alt: 'Lead Overview with Converted status, activity, conversion details, score breakdown, and labels',
      label: 'Lead Overview',
      statusLabel: 'Score & Conversion Details',
      caption: 'Illustrative overview showing activity, conversion details, score breakdown, and labels.',
      aspectRatio: 'aspect-[1672/941] [&_img]:object-contain',
      className: 'w-full'
    }
  },
  contactGuide: [
    { title: 'Lead Score', description: 'A rating to help prioritise enquiries. Review the breakdown and conversation together.' },
    { title: 'Labels', description: 'Labels such as Hot and Premium Lead help identify the lead at a glance.' },
    { title: 'Conversion Details', description: 'For converted leads, review the recorded revenue, product, date, and notes.' }
  ],
  featureGuides: [{
    title: 'Find Leads by Channel',
    description: 'Open the All Leads menu to focus on one source or return to important contacts.',
    screenshot: {
      src: '/images/doc-images/leads-channel-filters-favorites.png',
      alt: 'Lead filters for WhatsApp, Instagram, Twilio, Manual, and Favorites with sample contact lists',
      caption: 'Choose a channel or Favorites to narrow your lead list. Click to expand.',
      aspectRatio: 'aspect-[1312/1199] [&_img]:object-contain',
      className: 'w-full max-w-[540px] mx-auto'
    },
    items: [
      { title: 'WhatsApp Leads', description: 'Choose WhatsApp to see leads from that source. Select a contact to review their available messages, score, and labels.' },
      { title: 'Instagram Leads', description: 'Choose Instagram to focus on Instagram enquiries and review each contact before following up.' },
      { title: 'Twilio Leads', description: 'Choose Twilio to find leads from your Twilio source. Use Open in Inbox when a linked conversation is available.' },
      { title: 'All Leads, Manual & Favorites', description: 'All Leads brings the sources together. Manual helps you find manually added contacts. Star important leads to find them again under Favorites.' }
    ]
  }],
  copy: {
    benefitsIntro: 'Know who needs attention and understand the conversation before following up.',
    setupLabel: 'Getting started',
    stepsLabel: 'Manage your leads:',
    stagesLabel: 'Your lead workflow:',
    verificationTitle: 'Review Scores and Conversion Details',
    outcomeLabel: 'What you should see:',
    useCasesLabel: 'Examples',
    useCasesTitle: 'When to Use Leads & CRM',
    useCasesIntro: 'Keep enquiries organised from the first message to the final outcome.',
    troubleshootingTitle: 'Common Questions',
    troubleshootingIntro: 'Simple checks for finding and reviewing your leads.',
    answerLabel: 'Answer:'
  },
  videoPlaceholder: {
    title: 'Find and Review a Lead',
    description: 'View the lead list, open a conversation, and review the score and contact details.'
  },
  architecture: {
    title: 'Find, Add, and Review Leads',
    description: 'Open Leads & CRM to view your contacts. Search for a lead, choose a filter, or select New Lead to add someone manually.',
    stages: [
      { number: '01', name: 'Find a lead', detail: 'Search your list or filter by channel, Manual, or Favorites.' },
      { number: '02', name: 'Read the conversation', detail: 'Select a lead to review their available message history.' },
      { number: '03', name: 'Review the overview', detail: 'Check the score, labels, activity, and conversion details where available.' },
      { number: '04', name: 'Follow up', detail: 'Use Open in Inbox when the lead has a linked conversation.' }
    ]
  },
  benefits: [
    { title: 'Keep Leads in One Place', description: 'View contacts from different channels alongside manually added leads, without keeping separate lists.', highlight: 'One contact list' },
    { title: 'Focus on Promising Enquiries', description: 'Use the lead score and tier to help decide who to review first. Read the conversation to understand their needs.', highlight: 'Lead scores & tiers' },
    { title: 'Understand the Customer', description: 'Review messages, activity, and the score breakdown before following up, so you can continue with the right context.', highlight: 'Conversation history' },
    { title: 'Keep Important Leads Easy to Find', description: 'Star a lead for quick access through Favorites. Use labels and channel filters to organise your work.', highlight: 'Favorites & labels' }
  ],
    setupSteps: [
    {
      step: 1,
      title: 'Find a Lead',
      description: 'Use Search leads or open the All Leads menu. Choose WhatsApp, Instagram, Twilio, Manual, or Favorites to narrow the list.',
      screenshotPlaceholder: { title: 'Lead Filters', description: 'Channel, manual, and favorite filters in the lead list.' }
    },
    {
      step: 2,
      title: 'Add a Lead Manually',
      description: 'Click New Lead. Enter the required name and phone number, choose a source, and add an optional budget or note. Select Add Lead to save.',
      screenshotPlaceholder: { title: 'Add New Lead', description: 'Name, phone, source, optional budget, and note fields.' }
    },
    {
      step: 3,
      title: 'Review the Lead Overview',
      description: 'Select a lead to read the conversation and view their score. Lead Overview shows interest, engagement, activity, labels, and conversion details when available.',
      screenshotPlaceholder: { title: 'Lead Overview', description: 'Lead rating, activity, score breakdown, and labels.' }
    },
    {
      step: 4,
      title: 'Save or Continue the Conversation',
      description: 'Click the star to add a lead to Favorites. Use Open in Inbox to reply when a conversation is linked; the message preview on this page is read-only.',
      screenshotPlaceholder: { title: 'Lead Actions', description: 'Favorite and Open in Inbox controls beside the selected lead.' }
    }
  ],
  verificationChecklist: [
    'Find the lead in the list and confirm the name, phone number, and source.',
    'Open the lead and check that the available conversation belongs to that contact.',
    'Star the lead and confirm it appears under Favorites.',
    'For a converted lead, review the recorded product, revenue, date, and notes.'
  ],
  expectedOutcome: 'Your lead appears in the correct list with their available messages and overview. Favorites help you return to important contacts, and linked conversations can be opened in the Inbox.',
  useCases: [
    { title: 'Review New Enquiries', scenario: 'Several people have contacted your business through different channels.', solution: 'Filter the list, compare lead scores, and read each conversation to decide who needs attention.' },
    { title: 'Record an Offline Contact', scenario: 'Someone contacts your team by phone or at an event.', solution: 'Use New Lead to save their contact information and an optional note.' },
    { title: 'Review a Successful Enquiry', scenario: 'Your team needs the details of a lead already marked Converted.', solution: 'Open Lead Overview to review the recorded product, revenue, conversion date, and notes.' }
  ],
  troubleshooting: [
    { question: 'Why can I not find a lead?', answer: 'Clear the search field and choose All Leads. Check the current workspace. Manually added contacts can also be found through the Manual filter.' },
    { question: 'What does the lead score mean?', answer: 'It helps you prioritise enquiries. Review Score Breakdown for the displayed behavioral, intent, and label contributions. A high score does not guarantee a purchase.' },
    { question: 'Why is Open in Inbox unavailable?', answer: 'The lead may not have a linked conversation. You can still review the saved contact information.' },
    { question: 'What does Converted mean?', answer: 'The enquiry has been marked successful. Review the saved conversion details; this status alone is not proof of payment.' }
  ]
};

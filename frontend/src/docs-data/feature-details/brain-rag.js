export const brainRagDetail = {
  slug: 'brain-rag',
  aliasSlugs: ['features/brain-rag'],
  featureNumber: '02',
  category: 'Knowledge Base & Retrieval Engine',
  title: 'AI Brain (RAG Knowledge Base)',
  tagline: 'Multi-source document ingestion, semantic vector search, and grounded citations that eliminate AI hallucinations.',
  description: 'AI Brain is your business knowledge library. Add product guides, FAQs, policies, or website pages, then check their progress in Indexed Knowledge. Your content is split into smaller searchable passages called chunks. RAG means the AI looks up relevant passages to help answer a question.',
  visualKey: 'brain',
  staticSetup: true,
  visualLabel: 'AI Brain Overview · Illustrative Screenshot',
  copy: {
    benefitsIntro: 'Give your AI the business information it needs to help your customers.',
    setupLabel: 'Getting started',
    stepsLabel: 'Add your first knowledge source:',
    stagesLabel: 'How your content becomes searchable:',
    verificationTitle: 'Check Your Uploaded Sources',
    outcomeLabel: 'What you should see:',
    useCasesLabel: 'Examples',
    useCasesTitle: 'What to Add to Your Brain',
    useCasesIntro: 'Start with clear, up-to-date content that answers common questions.',
    troubleshootingTitle: 'Common Questions',
    troubleshootingIntro: 'Checks to try when adding or reviewing your content.',
    answerLabel: 'What to do:'
  },
  screenshots: {
    benefits: {
      src: '/images/doc-images/brain-knowledge-status.png',
      alt: 'Brain dashboard summary showing knowledge items, indexed chunks, and Ready status',
      caption: 'Illustrative screenshot • Example workspace data. Click the image to expand.',
      aspectRatio: 'aspect-[2059/764] [&_img]:object-contain',
      label: 'Knowledge Base Status · Screenshot',
      guideTitle: 'Understanding this screenshot',
      guideItems: [
        { title: '14 knowledge items', description: 'Documents and website sources added to this example knowledge base.' },
        { title: '55 indexed chunks', description: 'Sources are split into smaller searchable passages, so one document can produce multiple chunks.' },
        { title: 'Ready status', description: 'The dashboard shows Ready. Check individual source statuses in Indexed Knowledge to confirm which uploads completed.' }
      ]
    },
    setup: {
      src: '/images/doc-images/brain-upload-website-sync.png',
      alt: 'Upload Documents panel beside Sync Your Website with Single Page and Entire Website options',
      caption: 'Illustrative screenshot: upload documents with Browse Files, or enter a website URL and choose Single Page or Entire Website. Click to expand.',
      aspectRatio: 'aspect-[3/1] [&_img]:object-contain'
    },
    verification: {
      frameless: true,
      src: '/images/doc-images/brain-indexed-knowledge.png',
      className: '[&>div:first-child]:border-0 [&>div:first-child]:rounded-none [&>div:first-child]:bg-transparent [&>div:first-child]:shadow-none',
      alt: 'Indexed Knowledge table showing website sources, file types, Completed statuses, and last updated dates',
      caption: 'Illustrative screenshot with example sources and dates. Review source names, file types, Completed statuses, and last updated dates. Click to expand.',
      aspectRatio: 'aspect-[1609/977] [&_img]:object-contain',
      label: 'Indexed Knowledge Review'
    }
  },
  verificationChecklist: [
    'Find the uploaded document or synced website in Indexed Knowledge.',
    'Check that each required source shows Completed; review any Failed sources before relying on them.',
    'Review file types and last updated dates to confirm the intended sources are indexed.'
  ],
  videoPlaceholder: {
    title: 'Getting Started with AI Brain',
    description: 'Learn how to add documents, sync website pages, and check source statuses.',
    duration: '4:10 min walkthrough'
  },
  architecture: {
    title: 'Upload Documents or Sync a Website',
    description: 'Open Brain (Knowledge Base). Choose Upload Documents for files, or Sync Your Website for a website address. After adding a source, check its status in the Indexed Knowledge table.',
    stages: [
      {
        number: '01',
        name: 'Add a source',
        detail: 'Choose a document or enter the website address you want to add.'
      },
      {
        number: '02',
        name: 'Read the content',
        detail: 'Brain processes the source and breaks its content into smaller passages.'
      },
      {
        number: '03',
        name: 'Index the passages',
        detail: 'These passages become searchable chunks. A single source can create several chunks.'
      },
      {
        number: '04',
        name: 'Review the result',
        detail: 'Find the source in Indexed Knowledge and check its status before relying on its content.'
      }
    ]
  },
  benefits: [
    {
      title: 'Business Knowledge in One Place',
      description: 'Bring your product guides, FAQs, and website content together so your AI can use them when answering questions.',
      highlight: 'One knowledge library'
    },
    {
      title: 'Answers Based on Your Content',
      description: 'Help your AI answer questions using your own policies and product information, making replies more relevant to your business.',
      highlight: 'Business-specific answers'
    },
    {
      title: 'Less Time Searching for Information',
      description: 'Brain finds relevant passages in your documents, helping your AI answer common questions without your team searching through files each time.',
      highlight: 'Save time'
    },
    {
      title: 'Spot Content That Needs Attention',
      description: 'Check which sources completed processing and which failed, so you can fix missing content before relying on it for answers.',
      highlight: 'Easier maintenance'
    }
  ],
  setupSteps: [
    {
      step: 1,
      title: 'Open Brain and Prepare Your Content',
      description: 'Open Brain (Knowledge Base) from the sidebar. Choose an up-to-date document or a public website page containing the information you want your AI to use.',
      screenshotPlaceholder: {
        title: 'Brain Knowledge Base',
        description: 'Use the document upload or website sync panel to add a source.'
      }
    },
    {
      step: 2,
      title: 'Upload a Document',
      description: 'Under Upload Documents, click Browse Files and select a file, or drag it into the upload area. The panel lists supported formats such as PDF, Word, Excel, CSV, images, and text.',
      screenshotPlaceholder: {
        title: 'Upload Documents',
        description: 'Choose Browse Files or drag a document into the upload area.'
      }
    },
    {
      step: 3,
      title: 'Or Sync a Website',
      description: 'Under Sync Your Website, enter a full URL such as https://yourcompany.com. Choose Single Page for that page, or Entire Website to include more pages from the site. Use a publicly accessible page.',
      screenshotPlaceholder: {
        title: 'Sync Your Website',
        description: 'Enter a website address and select Single Page or Entire Website.'
      }
    },
    {
      step: 4,
      title: 'Check the Source Status',
      description: 'Find your file or URL in Indexed Knowledge. Wait while it is processing, then check for Completed. If it shows Failed, review the file or website address before trying again.',
      screenshotPlaceholder: {
        title: 'Indexed Knowledge',
        description: 'Review the source name, file type, status, and last updated date.'
      }
    }
  ],
  useCases: [
    {
      title: 'Product Guides & FAQs',
      scenario: 'Customers need help with product features, setup, or common problems.',
      solution: 'Add current product guides and FAQ pages so relevant instructions are available in your knowledge base.'
    },
    {
      title: 'Returns & Warranty Policies',
      scenario: 'Customers ask about return windows, warranty coverage, or exchange conditions.',
      solution: 'Upload your current policy documents. Include the conditions and dates clearly so the source contains the details needed to answer these questions.'
    },
    {
      title: 'Business & Service Information',
      scenario: 'Visitors ask about your services, opening hours, or contact details.',
      solution: 'Sync the relevant public website pages and check that each source finishes processing.'
    }
  ],
  expectedOutcome: 'Your file or website appears in Indexed Knowledge with its source name, file type, status, and last updated date. Completed indicates that processing finished. Review each source individually; the Ready summary does not mean every upload succeeded.',
  troubleshooting: [
    {
      question: 'What should I check if a document shows Failed?',
      answer: 'Confirm the file opens correctly and uses a format listed in the upload panel. Check that the content is readable, then try uploading again. If it still fails, note the file name and any error shown when asking for help.'
    },
    {
      question: 'Why did my website fail to sync?',
      answer: 'Open the URL in your browser and check that it is correct and publicly accessible without signing in. Try Single Page with the exact page you need, then review its status in Indexed Knowledge.'
    },
    {
      question: 'Why are there more indexed chunks than knowledge items?',
      answer: 'A knowledge item is a source, such as a document or website. Brain splits its content into smaller searchable passages called chunks, so one source can produce several chunks. The screenshot counts are examples; your totals depend on your content.'
    }
  ]
};

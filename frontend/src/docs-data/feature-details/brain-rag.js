export const brainRagDetail = {
  slug: 'brain-rag',
  aliasSlugs: ['features/brain-rag'],
  featureNumber: '02',
  category: 'Knowledge Base & Retrieval Engine',
  title: 'AI Brain (RAG Knowledge Base)',
  tagline: 'Multi-source document ingestion, semantic vector search, and grounded citations that eliminate AI hallucinations.',
  description: 'The AI Brain acts as the authoritative single source of truth for all your agents. Ingest product catalogs, company policy PDFs, technical markdown documentation, or live URLs. Orbion parses, chunks, and vectorizes content using high-dimensional embeddings, allowing your agents to retrieve verified snippets and cite exact paragraph sources in real time.',
  visualKey: 'brain',
  videoPlaceholder: {
    title: 'How to Train & Query the AI Brain',
    description: 'Learn how to upload PDF manuals, set similarity match thresholds, view extracted vector chunks, and run interactive RAG test queries.',
    duration: '4:10 min walkthrough'
  },
  architecture: {
    title: 'Vector Embedding & Grounded Retrieval Architecture',
    description: 'When documents are uploaded, our ingestion pipeline cleans formatting, splits text into semantically coherent chunks, computes dense vector embeddings, and stores them in a hybrid vector-keyword index.',
    stages: [
      {
        number: '01',
        name: 'Document Parsing & Chunking',
        detail: 'PDFs, DOCX, Markdown, and raw text are parsed into 500-token chunks with 50-token semantic overlap to preserve context.'
      },
      {
        number: '02',
        name: 'Dense Vector Embeddings',
        detail: 'Each chunk is vectorized using high-dimensional embeddings and indexed alongside metadata (filename, page number, updated date).'
      },
      {
        number: '03',
        name: 'Cosine Similarity & Top-K Retrieval',
        detail: 'Inbound customer queries are embedded and compared against the index using cosine distance (0.82+ relevance cutoff).'
      },
      {
        number: '04',
        name: 'Context Injection & Verifiable Citation',
        detail: 'The top 3-5 matching snippets are inserted into the agent prompt. Every answer includes verifiable source references.'
      }
    ]
  },
  benefits: [
    {
      title: 'Guaranteed Grounded Answers',
      description: 'Agents never fabricate policies, invent discount codes, or guess refund terms. If information is not in the Brain, the agent safely declares it or escalates.',
      highlight: 'Zero hallucinations with source citations'
    },
    {
      title: 'Multi-Format Ingestion Engine',
      description: 'Upload PDFs, Word documents, Markdown guides, CSVs, or crawl live website URLs. The system auto-refreshes outdated documents seamlessly.',
      highlight: 'PDF, DOCX, Markdown, CSV & Live Web'
    },
    {
      title: 'Inspectable Vector Similarity Scores',
      description: 'Test your knowledge base before going live. See exact cosine match scores, token usage per document, and chunk previews in the admin console.',
      highlight: 'Cosine match simulator & chunk viewer'
    },
    {
      title: 'Access Control & Workspace Separation',
      description: 'Isolate sensitive internal HR docs from public customer-facing documents. Assign specific Brain collections to specific agents.',
      highlight: 'Role-based knowledge collections'
    }
  ],
  beforeYouStart: [
    {
      title: 'Prepared Source Documents',
      description: 'Ensure documentation files (PDF, DOCX, Markdown, or CSV) contain clean, text-extractable content (not flat scanned images without OCR).'
    },
    {
      title: 'Admin / Manager Access',
      description: 'Permissions to create and manage knowledge collections in your workspace.'
    },
    {
      title: 'Available Vector Credits',
      description: 'Adequate workspace credit balance for document parsing and high-dimensional vector embeddings.'
    }
  ],
  setupSteps: [
    {
      step: 1,
      stage: 'Step 1 — Open the feature',
      title: 'Navigate to AI Brain Console',
      description: 'From the main navigation sidebar, click "AI Brain" (/user/admin/brain) to open the vector knowledge management console.'
    },
    {
      step: 2,
      stage: 'Step 2 — Configure the required information',
      title: 'Configure Collection Details & Threshold',
      description: 'Click "Create Collection". Enter a descriptive name (e.g. "Product Pricing & FAQs"), select target agent access scope, and set your cosine similarity threshold (recommended: 0.75 - 0.85).'
    },
    {
      step: 3,
      stage: 'Step 3 — Perform the action',
      title: 'Upload Documents or Add Website URLs',
      description: 'Drag and drop your PDF/DOCX files into the upload zone or input your documentation website sitemap URL, then click "Start Ingestion & Embedding".'
    },
    {
      step: 4,
      stage: 'Step 4 — Review',
      title: 'Review Vectorized Chunks & Test Similarity',
      description: 'Use the built-in RAG Query Simulator to ask sample questions. Inspect the retrieved chunk cards, cosine match scores (e.g. 0.92), and verified paragraph citations.'
    },
    {
      step: 5,
      stage: 'Step 5 — Complete',
      title: 'Publish Collection & Bind to Agents',
      description: 'Click "Bind to Agent" to link this collection to active Agent Studio personas. Newly ingested facts are immediately retrievable in live customer chats.'
    }
  ],
  tips: [
    {
      title: 'Structure Headings Clearly',
      description: 'Use standard H1, H2, and bullet formatting in your source documents; semantic chunking performs best when sections are clearly delimited.'
    },
    {
      title: 'Isolate Public vs Internal Data',
      description: 'Create separate collections for customer-facing FAQ manuals and internal team SOPs to prevent confidential internal policies from leaking.'
    },
    {
      title: 'Periodic Re-indexing for URLs',
      description: 'Set an automatic weekly re-crawl for live URLs so your AI bot never serves outdated pricing or discontinued terms.'
    }
  ],
  useCases: [
    {
      title: 'Complex Technical Product Manuals',
      scenario: 'Industrial hardware or software companies with hundreds of pages of technical specs and troubleshooting manuals.',
      solution: 'AI Brain ingests 300+ pages of PDFs. When customers report error codes, the agent instantly quotes the exact manual section and step-by-step fix.'
    },
    {
      title: 'E-Commerce Return & Warranty Policies',
      scenario: 'Shoppers asking if their order qualifies for refund, international shipping rates, or exchange rules.',
      solution: 'Agents retrieve accurate return windows (e.g. 30 days) and condition requirements directly from the official policy document.'
    },
    {
      title: 'Internal SOPs & Employee Onboarding',
      scenario: 'Internal team members need fast answers about company leave policy, expense limits, or compliance procedures.',
      solution: 'An internal Slack/WhatsApp bot queries the internal collection to provide instant HR policy answers with document links.'
    }
  ],
  expectedOutcome: 'High-confidence customer answers with source citations, zero hallucinated facts, and instant updates whenever you upload revised documentation.',
  troubleshooting: [
    {
      question: 'Why did the AI say "I cannot find this in the documentation" for a query I know is in my PDF?',
      answer: 'Check that the similarity score threshold in your collection settings is not set too high (default is 0.75). Also verify that the uploaded PDF contains extractable text and is not an image-only scanned document without OCR.'
    },
    {
      question: 'How often does URL re-indexing occur?',
      answer: 'You can configure automated periodic crawls (daily or weekly) or click "Re-index Now" on any URL source in the Brain console to immediately re-scrape updated pages.'
    },
    {
      question: 'Can I see which exact chunks were referenced in a live customer conversation?',
      answer: 'Yes! In the Omni-Channel Inbox, click the "Inspect RAG Context" button on any AI-generated response to view the exact document titles and text chunks used.'
    }
  ]
};

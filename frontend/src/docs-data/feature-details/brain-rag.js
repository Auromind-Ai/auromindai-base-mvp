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
  setupSteps: [
    {
      step: 1,
      title: 'Create a Knowledge Collection',
      description: 'Go to AI Brain in the sidebar. Click "Create Collection", give it a recognizable name (e.g. "Public Product Docs & Pricing"), and select the target agent workspace.',
      screenshotPlaceholder: {
        title: 'New Knowledge Collection Modal',
        description: 'Shows collection name input, description field, and agent workspace selector dropdown.'
      }
    },
    {
      step: 2,
      title: 'Upload Documents or Sync Web URLs',
      description: 'Drag and drop your PDF manuals, FAQ sheets, or input your public documentation website URL for automated crawling. Watch the real-time ingestion status as chunks are vectorized.',
      screenshotPlaceholder: {
        title: 'Document Upload & Ingestion Queue',
        description: 'Displays uploaded file list with status badges (Indexing, Vectorized, Active) and chunk counts.'
      }
    },
    {
      step: 3,
      title: 'Run Interactive Test Inquiries',
      description: 'Use the built-in RAG Query Simulator to ask sample questions. Review the retrieved chunk cards, cosine match percentages, and synthesized responses.',
      screenshotPlaceholder: {
        title: 'RAG Simulator & Vector Match Inspector',
        description: 'Shows prompt input box, matched document chunks with similarity scores (e.g. 0.94), and generated test reply.'
      }
    },
    {
      step: 4,
      title: 'Attach Collection to Live Agent Studio',
      description: 'Open your Agent Studio configuration. In the "Knowledge Sources" section, check your new collection to grant the agent instant retrieval access.',
      screenshotPlaceholder: {
        title: 'Agent Knowledge Attachment Settings',
        description: 'Shows toggle switches enabling individual knowledge collections for specific agents.'
      }
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

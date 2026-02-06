# RAG Quality Improvement Plan (Auromind 2.0)

## Goal
Transform the current basic RAG implementation into a "Business-Grade" problem-solving engine. This means higher accuracy, better context handling, and a seamless user experience for managing knowledge.

## Team Assignments

### 🤖 AI Engineer
**Focus:** Retrieval Accuracy, Intelligence, and Evaluation.
**Key Objective:** "Make the answers smarter and reduce hallucinations."

#### Tasks
1.  **Implement Hybrid Search**
    *   *Current State:* Likely vector-only search.
    *   *Task:* Combine Vector Search (Semantic) with Keyword Search (BM25) to catch exact product names/identifiers that vectors miss.
2.  **Advanced Chunking Strategy**
    *   *Current State:* Basic recursive character splitting?
    *   *Task:* Implement "Semantic Chunking" or "Parent-Child" retrieval. (Retrieve small chunks for accuracy, but feed the surrounding context to the LLM).
3.  **Reranking Step**
    *   *Task:* Add a generic "Cross-Encoder" reranker (like BAAI/bge-reranker) to re-sort the top 20 results before sending the top 5 to the LLM. *Huge quality boost.*
4.  **Meta-Data Filtering**
    *   *Task:* Ensure queries map to metadata filters (e.g., "Show me pricing" should filter by `category=pricing` if available).
5.  **Evaluation Framework (The "Test Suite")**
    *   *Task:* Build a simple eval script using Ragas or DeepEval to score: content relevance, answer faithfulness, and context precision.

### ⚙️ Backend Developer
**Focus:** Performance, Scalability, and Clean APIs.
**Key Objective:** "Make the system fast and robust."

#### Tasks
1.  **Async Ingestion Pipeline**
    *   *Task:* Move document processing (PDF parsing, chunking) to a background worker (Celery or fastAPI `BackgroundTasks` works for MVP) so uploads don't hang.
2.  **Database Optimization (pgvector)**
    *   *Task:* Add HNSW indexes to the `pgvector` columns for speed. Ensure database connections are pooled correctly.
3.  **Multi-Format Parsing**
    *   *Task:* Integrate robust parsers (e.g., Unstructured.io or LlamaParse) to handle messy PDFs, Excel sheets, and PowerPoints better than basic text extraction.
4.  **Caching Layer**
    *   *Task:* Cache frequent queries/embeddings to save cost and latency (Redis or in-memory LRU).
5.  **API Hardening**
    *   *Task:* Ensure `schema.prisma` (if moving to Prisma) or SQLAlchemy models match perfectly. Handle edge cases (empty docs, corrupt files).

### 💻 Full Stack Developer
**Focus:** User Experience, Transparency, and Management.
**Key Objective:** "Let the user see and control what the AI knows."

#### Tasks
1.  **"Brain" Management UI**
    *   *Task:* Build a dashboard page (`/admin/brain`) where users can:
        *   Upload files (Drag & drop).
        *   See list of ingested documents & status (Processing/Ready/Error).
        *   **CRITICAL:** "Edit" or "Delete" knowledge chunks manually if the AI is wrong.
2.  **Citation UI**
    *   *Task:* When the AI answers, show "Sources" cards below the message.
        *   "Based on: `Employee_Handbook.pdf` (Page 12)".
        *   Clicking the source should show the text snippet used.
3.  **Upload Feedback**
    *   *Task:* Show a progress bar during document processing (connect to Backend's status updates).
4.  **Crawl Website Feature**
    *   *Task:* A simple UI input to "Add Website URL", which triggers the backend crawler service.

---

## Shared "Sprint 1" Goal
**"Answers should contain citations and users must be able to upload a PDF and see it appear in the 'Brain' list within 5 seconds."**

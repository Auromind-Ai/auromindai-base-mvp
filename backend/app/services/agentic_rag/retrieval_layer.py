import logging

from app.config.set import setter

class RetrievalLayer:
    
    def __init__(self, vector_store, embedding_generator, reranker, top_k):
        self.vector_store = vector_store
        self.embedding_generator = embedding_generator
        self.reranker = reranker
        self.top_k = top_k

    #Semantic Search (Vector Similarity Search)
    def semantic_search(self, db, workspace_id, query, entry_ids=None, collection=None, top_k=None):
        k = top_k or self.top_k
        try:
            query_embedding = self.embedding_generator.generate_query_embedding(query)
            results = self.vector_store.search(
                db=db,
                workspace_id= workspace_id,
                query_embedding=query_embedding,
                top_k=k * 3 if (entry_ids or collection) else k
            )
            
            # ── Post-filter for targeted searching ──
            if entry_ids:
                id_set = set(entry_ids)
                results = [
                    r for r in results
                    if r.get("metadata", {}).get("parent_id") in id_set
                ]

            if collection:
                results = [
                    r for r in results
                    if r.get("metadata", {}).get("collection") == collection
                ]

            results = results[:k]
            
            if not results:
                logging.warning("No documents found in vector search")
                return []

            return results

        except Exception:
            logging.exception("Vector search failed")
            return []

     #Reranking Layer
    def rerank(self, query, documents):

        if self.reranker is None:
            return documents
        pairs = [(query, doc["text"]) for doc in documents]

        scores = self.reranker.predict(pairs)
        scored_docs = list(zip(documents, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        reranked_docs = [doc for doc, score in scored_docs]

        return reranked_docs
    

    #Retrieve Context
    def retrieve_context(self, db, workspace_id, query, entry_ids=None, collection=None):
        retrieved_docs = self.semantic_search(db, workspace_id, query, entry_ids, collection)
        THRESHOLD = setter.VECTOR_THRESHOLD
        strong_docs = [doc for doc in retrieved_docs if doc["score"] >= THRESHOLD]

        reranked_docs = self.rerank(query, strong_docs)

        # top_docs = reranked_docs[:2]
        top_docs = reranked_docs[:self.top_k]
        context = "\n\n".join(
            [doc["text"] for doc in top_docs]
        )

        return {
            "context": context,
            "docs": top_docs   
        }
    
    def strict_topic_filter(self, original_query, context):
        main_terms = original_query.lower().split()

        filtered = []
        for block in context.split("\n\n"):
            score = sum(term in block.lower() for term in main_terms)

            if score >= 1:   # at least 1 direct keyword match
                filtered.append(block)

        return "\n\n".join(filtered)
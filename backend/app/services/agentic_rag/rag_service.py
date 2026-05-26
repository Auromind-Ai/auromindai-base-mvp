
import threading
import logging
from typing import Optional

from app.services.agentic_rag.mcp_layer import MCPLayer
from app.services.agentic_rag.tools_layer import Toolslayer
from app.services.agentic_rag.retrieval_layer import RetrievalLayer
from app.services.agentic_rag.helpers_layer import helperslayer
from app.services.agentic_rag.orchestrator_layer import OrchestratorLayer
from app.services.agentic_rag.orchestrator_layer_support import orchestratorsupport
from app.services.agentic_rag.embedding_service import get_embedding_generator
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.services.agentic_rag.reranker_service import get_reranker
from app.services.agentic_rag.ingestion_layer import IngestionLayer
from app.config.set import setter

logger = logging.getLogger(__name__)


#  Module-level singleton state (per OS process)

_rag_service_instance: Optional[OrchestratorLayer] = None
_rag_lock = threading.Lock()


def _build_rag_system() -> OrchestratorLayer:
    """Internal factory — called exactly once per process."""
    logger.info("Building RAG system (once per process)...")

    # Re-use process-level model singletons — no re-loading.
    embedding = get_embedding_generator()
    reranker = get_reranker()

    vector_store = VectorStoreService()
    mcp = MCPLayer()
    tools = Toolslayer()
    helpers = helperslayer()
    support = orchestratorsupport()
    ingestion = IngestionLayer(vector_store)

    retrieval = RetrievalLayer(
        vector_store=vector_store,
        embedding_generator=embedding,
        reranker=reranker,
        top_k=setter.RAG_TOP_K,
    )

    orchestrator = OrchestratorLayer(
        mcp=mcp,
        tools=tools,
        retrieval=retrieval,
        helpers=helpers,
        support=support,
        embedding_generator=embedding,
        vector_store=vector_store,
        ingestion=ingestion,
    )

    logger.info("RAG system built successfully.")
    return orchestrator


def get_rag_service() -> OrchestratorLayer:

    global _rag_service_instance
    if _rag_service_instance is None:     
        with _rag_lock:
            if _rag_service_instance is None:   
                _rag_service_instance = _build_rag_system()
    return _rag_service_instance
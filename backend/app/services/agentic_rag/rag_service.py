from app.services.agentic_rag.mcp_layer import MCPLayer
from app.services.agentic_rag.tools_layer import Toolslayer
from app.services.agentic_rag.retrieval_layer import RetrievalLayer
from app.services.agentic_rag.helpers_layer import helperslayer
from app.services.agentic_rag.orchestrator_layer import OrchestratorLayer
from app.services.agentic_rag.orchestrator_layer_support import orchestratorsupport
from app.services.agentic_rag.embedding_service import EmbeddingGenerator
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.services.agentic_rag.reranker_service import RerankerService
from app.services.agentic_rag.ingestion_layer import IngestionLayer
from app.config.set import setter

# Module-level singleton — built once per process, reused across requests
_rag_service_instance = None


def build_rag_system():
    embedding = EmbeddingGenerator()
    vector_store = VectorStoreService()
    reranker = RerankerService()

    mcp = MCPLayer()
    tools = Toolslayer()
    helpers = helperslayer()
    support = orchestratorsupport()
    ingestion = IngestionLayer(vector_store)

    retrieval = RetrievalLayer(
        vector_store=vector_store,
        embedding_generator=embedding,
        reranker=reranker,
        top_k=setter.RAG_TOP_K
    )

    orchestrator = OrchestratorLayer(
        mcp=mcp,
        tools=tools,
        retrieval=retrieval,
        helpers=helpers,
        support=support,
        embedding_generator=embedding,
        vector_store=vector_store,
        ingestion=ingestion
    )

    return orchestrator


def get_rag_service():
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = build_rag_system()
    return _rag_service_instance
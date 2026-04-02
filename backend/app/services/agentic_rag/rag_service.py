from app.services.agentic_rag.mcp_layer import MCPLayer
from app.services.agentic_rag.tools_layer import Toolslayer
from app.services.agentic_rag.retrieval_layer import RetrievalLayer
from app.services.agentic_rag.helpers_layer import helperslayer
from app.services.agentic_rag.orchestrator_layer import Orchestratorlayer
from app.services.agentic_rag.orchestrator_layer_support import orchestratorsupport
from app.services.agentic_rag.embedding_service import EmbeddingGenerator
from app.services.agentic_rag.vector_store_service import VectorStoreService
from app.services.agentic_rag.reranker_service import RerankerService
from app.config.settings import settings


def build_rag_system():
    embedding = EmbeddingGenerator()
    vector_store = VectorStoreService()
    reranker = RerankerService()

    mcp = MCPLayer()
    tools = Toolslayer()
    helpers = helperslayer()
    support = orchestratorsupport()

    retrieval = RetrievalLayer(
        vector_store=vector_store,
        embedding_generator=embedding,
        reranker=reranker,
        top_k=settings.RAG_TOP_K
    )

    orchestrator = Orchestratorlayer(
        mcp=mcp,
        tools=tools,
        retrieval=retrieval,
        helpers=helpers,
        support=support,
        embedding_generator=embedding
    )

    return orchestrator
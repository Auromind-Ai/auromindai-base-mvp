import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from app.database import SessionLocal
from app.models.workspace import Workspace
from app.models.token_ledger import TokenLedger
from app.services.ai.chat_service import ChatService, ChatServiceConfig

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_workspace(db_session):
    workspace = db_session.query(Workspace).first()
    assert workspace is not None, "A workspace must exist in the database for the test"
    return workspace

@pytest.mark.asyncio
async def test_successful_stream_lifecycle(db_session, test_workspace):
    config = ChatServiceConfig()
    service = ChatService(config)
    
    workspace_id = str(test_workspace.id)
    user_id = "test-user-id"
    
    with patch.object(service, '_validate_workspace_access') as mock_val, \
         patch.object(service, '_get_rag_answer', new_callable=AsyncMock) as mock_rag:
        
        mock_val.return_value = test_workspace
        mock_rag.return_value = {
            "answer": "Hello from mock RAG!",
            "meta": {"query": "test", "rewritten_query": "test", "source": "mock"}
        }
        
        # 1. Preflight: creates reservation
        preflight = await service.validate_and_reserve_stream_tokens(
            db=db_session,
            message="Hello",
            workspace_id=workspace_id,
            session_id=None,
            use_rag=True,
            user_id=user_id,
        )
        
        reservation_id = preflight["reservation_id"]
        
        # Verify it was created and is 'reserved'
        db_session.expire_all()
        res_row = db_session.query(TokenLedger).filter(TokenLedger.id == reservation_id).first()
        assert res_row is not None
        assert res_row.status == "reserved"
        
        # 2. Run stream response to completion
        generator = service.handle_stream_chat(
            preflight=preflight,
            message="Hello",
            workspace_id=workspace_id,
            session_id=None,
            use_rag=True,
            model="auto",
            user_id=user_id,
        )
        
        chunks = []
        async for chunk in generator:
            chunks.append(chunk)
            
        assert len(chunks) > 0
        
        # 3. Verify reservation was finalized
        db_session.expire_all()
        res_row = db_session.query(TokenLedger).filter(TokenLedger.id == reservation_id).first()
        assert res_row.status == "posted"
        assert res_row.entry_type == "usage"

@pytest.mark.asyncio
async def test_failed_stream_lifecycle(db_session, test_workspace):
    config = ChatServiceConfig()
    service = ChatService(config)
    
    workspace_id = str(test_workspace.id)
    user_id = "test-user-id"
    
    with patch.object(service, '_validate_workspace_access') as mock_val, \
         patch.object(service, '_get_rag_answer', new_callable=AsyncMock) as mock_rag, \
         patch('app.services.ai.chat_service.LLMRouter.generate', new_callable=AsyncMock) as mock_generate:
        
        mock_val.return_value = test_workspace
        mock_rag.side_effect = Exception("Simulated RAG failure")
        mock_generate.side_effect = Exception("Simulated LLM failure")
        
        # 1. Preflight: creates reservation
        preflight = await service.validate_and_reserve_stream_tokens(
            db=db_session,
            message="Hello",
            workspace_id=workspace_id,
            session_id=None,
            use_rag=True,
            user_id=user_id,
        )
        
        reservation_id = preflight["reservation_id"]
        
        # Verify it was created and is 'reserved'
        db_session.expire_all()
        res_row = db_session.query(TokenLedger).filter(TokenLedger.id == reservation_id).first()
        assert res_row is not None
        assert res_row.status == "reserved"
        
        # 2. Run stream response (which will raise exception internally and yield error)
        generator = service.handle_stream_chat(
            preflight=preflight,
            message="Hello",
            workspace_id=workspace_id,
            session_id=None,
            use_rag=True,
            model="auto",
            user_id=user_id,
        )
        
        chunks = []
        async for chunk in generator:
            chunks.append(chunk)
            
        # 3. Verify reservation was released
        db_session.expire_all()
        res_row = db_session.query(TokenLedger).filter(TokenLedger.id == reservation_id).first()
        assert res_row.status == "released"

from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.flow_execution import FlowExecutionTrace


class ExecutionTracer:
    def trace(
        self,
        db: Session,
        *,
        conversation_id: Any,
        event_type: str,
        status: str = "success",
        flow_id: Any = None,
        node_id: Optional[str] = None,
        duration_ms: Optional[int] = None,
        tokens_in: Optional[int] = None,
        tokens_out: Optional[int] = None,
        total_tokens: Optional[int] = None,
        cost: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> FlowExecutionTrace:
        trace = FlowExecutionTrace(
            conversation_id=conversation_id,
            flow_id=flow_id,
            node_id=node_id,
            event_type=event_type,
            status=status,
            duration_ms=duration_ms,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            total_tokens=total_tokens,
            cost=Decimal(str(cost)) if cost is not None else None,
            metadata=metadata or {},
            error_message=error_message,
        )
        db.add(trace)
        db.flush()
        return trace

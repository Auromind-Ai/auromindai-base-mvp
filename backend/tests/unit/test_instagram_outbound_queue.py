import unittest
from unittest.mock import MagicMock, patch
import uuid
from datetime import datetime, timezone

from app.models.conversation import ChannelType, Conversation
from app.models.outbound_message import OutboundMessage
from app.models.ai_action import ConversationState
from app.models.flow_execution import FlowExecutionState
from app.workers.flow_execution import send_next_pending_message, send_whatsapp_message_task


class TestInstagramOutboundQueue(unittest.TestCase):

    def _setup_mock_db(self, mock_db, mock_conv, mock_msg_seq2, mock_msg_seq1):
        if mock_msg_seq1:
            mock_msg_seq1.updated_at = datetime.now(timezone.utc)
            mock_msg_seq1.created_at = datetime.now(timezone.utc)

        def query_side_effect(model):
            query_mock = MagicMock()
            if model == ConversationState:
                query_mock.filter_by.return_value.first.return_value = None
                return query_mock
            elif model == FlowExecutionState:
                query_mock.filter.return_value.first.return_value = None
                return query_mock
            elif model == Conversation:
                query_mock.filter.return_value.first.return_value = mock_conv
                return query_mock
            elif model == OutboundMessage:
                filter_mock = MagicMock()
                filter_mock.with_for_update.return_value.order_by.return_value.first.return_value = mock_msg_seq2
                filter_mock.order_by.return_value.first.return_value = mock_msg_seq1
                query_mock.filter.return_value = filter_mock
                return query_mock
            else:
                query_mock.filter.return_value.first.return_value = None
                return query_mock

        mock_db.query.side_effect = query_side_effect

    def test_instagram_channel_gate_blocking(self):
        """
        Verify that send_next_pending_message for Instagram blocks seq=2 when seq=1 is in-flight ('sending').
        """
        conversation_id = str(uuid.uuid4())

        mock_conv = MagicMock()
        mock_conv.channel = ChannelType.INSTAGRAM
        mock_conv.workspace_id = str(uuid.uuid4())

        mock_msg_seq2 = MagicMock()
        mock_msg_seq2.sequence = 2
        mock_msg_seq2.id = uuid.uuid4()
        mock_msg_seq2.status = "queued"

        mock_msg_seq1 = MagicMock()
        mock_msg_seq1.sequence = 1
        mock_msg_seq1.id = uuid.uuid4()
        mock_msg_seq1.status = "sending"  # In-flight

        with patch("app.workers.flow_execution.acquire_conversation_lock", return_value="token123"), \
             patch("app.workers.flow_execution.release_conversation_lock") as mock_release_lock, \
             patch("app.services.billing.billing_service.enforce_execution_policy", return_value=True), \
             patch("app.workers.flow_execution.send_whatsapp_message_task.delay") as mock_send_task, \
             patch("app.workers.flow_execution.SessionLocal") as mock_session_cls:

            mock_db = MagicMock()
            mock_session_cls.return_value = mock_db
            self._setup_mock_db(mock_db, mock_conv, mock_msg_seq2, mock_msg_seq1)

            send_next_pending_message(conversation_id)

            # Verification: Lock released early because prev_msg status='sending' blocked execution
            mock_release_lock.assert_called_with(conversation_id, "token123")
            self.assertEqual(mock_msg_seq2.status, "queued")
            mock_send_task.assert_not_called()

    def test_instagram_channel_gate_allowing_when_sent(self):
        """
        Verify that send_next_pending_message for Instagram allows seq=2 when seq=1 is committed as 'sent'.
        """
        conversation_id = str(uuid.uuid4())

        mock_conv = MagicMock()
        mock_conv.channel = ChannelType.INSTAGRAM
        mock_conv.workspace_id = str(uuid.uuid4())

        mock_msg_seq2 = MagicMock()
        mock_msg_seq2.sequence = 2
        mock_msg_seq2.id = uuid.uuid4()
        mock_msg_seq2.to_number = "+1234567890"
        mock_msg_seq2.body = "Instagram seq=2"
        mock_msg_seq2.metadata_json = {}
        mock_msg_seq2.status = "queued"

        mock_msg_seq1 = MagicMock()
        mock_msg_seq1.sequence = 1
        mock_msg_seq1.id = uuid.uuid4()
        mock_msg_seq1.status = "sent"  # Completed

        with patch("app.workers.flow_execution.acquire_conversation_lock", return_value="token123"), \
             patch("app.workers.flow_execution.release_conversation_lock") as mock_release_lock, \
             patch("app.services.billing.billing_service.enforce_execution_policy", return_value=True), \
             patch("app.workers.flow_execution.send_whatsapp_message_task.delay") as mock_send_task, \
             patch("app.workers.flow_execution.SessionLocal") as mock_session_cls:

            mock_db = MagicMock()
            mock_session_cls.return_value = mock_db
            self._setup_mock_db(mock_db, mock_conv, mock_msg_seq2, mock_msg_seq1)

            send_next_pending_message(conversation_id)

            # Verification: seq=2 status marked as sending & task dispatched
            self.assertEqual(mock_msg_seq2.status, "sending")
            mock_send_task.assert_called_once()
            mock_release_lock.assert_called_with(conversation_id, "token123")

    def test_whatsapp_channel_isolation(self):
        """
        Verify that WhatsApp messages remain blocked if prev_msg status is 'sent' (must wait for 'delivered' status webhook).
        """
        conversation_id = str(uuid.uuid4())

        mock_conv = MagicMock()
        mock_conv.channel = ChannelType.TWILIO
        mock_conv.workspace_id = str(uuid.uuid4())

        mock_msg_seq2 = MagicMock()
        mock_msg_seq2.sequence = 2
        mock_msg_seq2.id = uuid.uuid4()
        mock_msg_seq2.status = "queued"

        mock_msg_seq1 = MagicMock()
        mock_msg_seq1.sequence = 1
        mock_msg_seq1.id = uuid.uuid4()
        mock_msg_seq1.status = "sent"  # Sent, but NOT delivered yet!

        with patch("app.workers.flow_execution.acquire_conversation_lock", return_value="token123"), \
             patch("app.workers.flow_execution.release_conversation_lock") as mock_release_lock, \
             patch("app.services.billing.billing_service.enforce_execution_policy", return_value=True), \
             patch("app.workers.flow_execution.send_whatsapp_message_task.delay") as mock_send_task, \
             patch("app.workers.flow_execution.SessionLocal") as mock_session_cls:

            mock_db = MagicMock()
            mock_session_cls.return_value = mock_db
            self._setup_mock_db(mock_db, mock_conv, mock_msg_seq2, mock_msg_seq1)

            send_next_pending_message(conversation_id)

            # Verification: WhatsApp is BLOCKED because prev_msg status is 'sent' (not 'delivered')
            mock_release_lock.assert_called_with(conversation_id, "token123")
            self.assertEqual(mock_msg_seq2.status, "queued")
            mock_send_task.assert_not_called()

    def test_instagram_task_idempotency_guard(self):
        """
        Verify that send_whatsapp_message_task aborts execution if the row already has a twilio_sid (provider ID).
        """
        outbound_id = str(uuid.uuid4())
        conversation_id = str(uuid.uuid4())

        mock_row = MagicMock()
        mock_row.twilio_sid = "mid_existing_123"
        mock_row.status = "sent"

        with patch("app.workers.flow_execution.SessionLocal") as mock_session_cls, \
             patch("app.workers.flow_execution.deliver_outbound_message") as mock_deliver:

            mock_db = MagicMock()
            mock_session_cls.return_value = mock_db
            mock_db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = mock_row

            send_whatsapp_message_task(outbound_id, conversation_id, "+123456", "Hello")

            # Deliver should NOT be called due to idempotency guard
            mock_deliver.assert_not_called()


if __name__ == "__main__":
    unittest.main()
